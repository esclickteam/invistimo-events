import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import {
  buildCollectionPaymentUpdate,
  buildFinalRecordsUpdate,
  buildPriceUpdate,
  canAssignCollectionPayer,
  isInProducerCollection,
  isPaymentMethod,
  resolveProducerBill,
  type ProducerBillView,
} from "@/lib/producerBilling/calc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    (auth?.role === "staff" &&
      auth?.staffType === "general_staff" &&
      auth?.employeeScope === "system")
  );
}

function eventTitle(event: {
  title?: string;
  eventTitle?: string;
  eventName?: string;
  name?: string;
  invitationTitle?: string;
} | null) {
  return (
    event?.title ||
    event?.eventTitle ||
    event?.eventName ||
    event?.name ||
    event?.invitationTitle ||
    "אירוע ללא שם"
  );
}

function eventDate(event: { date?: Date | string; eventDate?: Date | string } | null, userDate?: Date | null) {
  return event?.date || event?.eventDate || userDate || null;
}

async function loadProducer(producerId: string) {
  if (!mongoose.Types.ObjectId.isValid(producerId)) return null;
  const producer = await User.findById(producerId).select(
    "_id name email role producerPricePerRecord",
  );
  if (!producer || producer.role !== "producer") return null;
  return producer;
}

async function loadCollectionClients(producerId: mongoose.Types.ObjectId) {
  const candidates = await User.find({
    role: { $in: ["client", "user"] },
    $or: [
      { "producerBilling.payerProducerId": producerId },
      { billingSource: "producer", assignedProducerId: producerId },
    ],
  })
    .select(
      "name email phone role billingSource guests maxGuests eventDate assignedProducerId producerBilling",
    )
    .lean();

  return candidates.filter((client) => isInProducerCollection(client as any, producerId));
}

async function decorateClients(
  clients: Array<Record<string, any>>,
) {
  const clientIds = clients.map((client) => client._id);
  const events = clientIds.length
    ? await Event.find({ userId: { $in: clientIds } })
        .select("_id userId title eventTitle eventName name invitationTitle date eventDate createdAt")
        .lean()
    : [];

  const eventsByUser = new Map<string, any[]>();
  for (const event of events) {
    const key = String(event.userId);
    const list = eventsByUser.get(key) || [];
    list.push(event);
    eventsByUser.set(key, list);
  }

  const eventIds = events.map((event) => event._id);
  const invitations = eventIds.length
    ? await Invitation.find({ eventId: { $in: eventIds } }).select("_id eventId").lean()
    : [];
  const invitationIds = invitations.map((invitation) => invitation._id);
  const guestCounts = invitationIds.length
    ? await InvitationGuest.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        { $match: { invitationId: { $in: invitationIds } } },
        { $group: { _id: "$invitationId", count: { $sum: 1 } } },
      ])
    : [];
  const countByInvitation = new Map(
    guestCounts.map((row) => [String(row._id), row.count]),
  );
  const invitationsByEvent = new Map<string, string[]>();
  for (const invitation of invitations) {
    const key = String(invitation.eventId);
    const list = invitationsByEvent.get(key) || [];
    list.push(String(invitation._id));
    invitationsByEvent.set(key, list);
  }

  return clients.map((client) => {
    const userEvents = eventsByUser.get(String(client._id)) || [];
    const primary = [...userEvents].sort((a, b) => {
      const aTime = new Date(a.date || a.eventDate || a.createdAt || 0).getTime();
      const bTime = new Date(b.date || b.eventDate || b.createdAt || 0).getTime();
      return bTime - aTime;
    })[0] || null;

    let actualRecords = 0;
    for (const event of userEvents) {
      for (const invitationId of invitationsByEvent.get(String(event._id)) || []) {
        actualRecords += countByInvitation.get(invitationId) || 0;
      }
    }

    const bill = resolveProducerBill(client as any);
    const extraEvents = Math.max(0, userEvents.length - 1);
    const name = eventTitle(primary);
    return {
      clientId: String(client._id),
      clientName: client.name || "לקוח ללא שם",
      clientEmail: client.email || "",
      billingSource: client.billingSource || null,
      eventName: primary ? (extraEvents ? `${name} (+${extraEvents})` : name) : "טרם נפתח אירוע",
      eventDate: eventDate(primary, client.eventDate),
      initialRecords: bill.initialRecords,
      actualRecords,
      finalRecords: bill.finalRecords,
      finalRecordsUpdatedAt: client.producerBilling?.finalRecordsUpdatedAt || null,
      pricePerRecord: bill.pricePerRecord,
      amountDue: bill.amountDue,
      amountPaid: bill.paidAmount,
      balance: bill.balance,
      status: bill.status,
      statusLabel: bill.statusLabel,
      payments: (client.producerBilling?.payments || []).map((payment: any) => ({
        amount: payment.amount,
        paidAt: payment.paidAt,
        method: payment.method,
        note: payment.note || "",
      })),
      history: client.producerBilling?.history || [],
    };
  });
}

function summarize(rows: Array<{ status: string; amountDue: number | null; amountPaid: number; balance: number | null }>) {
  const totalDue = rows.reduce((sum, row) => sum + Number(row.amountDue || 0), 0);
  const totalPaid = rows.reduce((sum, row) => sum + Number(row.amountPaid || 0), 0);
  const balance = rows.reduce((sum, row) => sum + Number(row.balance || 0), 0);
  const unpaidCount = rows.filter(
    (row) => row.status === "unpaid" || row.status === "awaiting_final_records",
  ).length;
  return {
    eventCount: rows.length,
    totalDue,
    totalPaid,
    balance,
    unpaidCount,
  };
}

async function billingPayload(producerId: string) {
  const producer = await loadProducer(producerId);
  if (!producer) return null;
  const clients = await loadCollectionClients(producer._id);
  const rows = await decorateClients(clients as Array<Record<string, any>>);
  rows.sort((a, b) => String(a.clientName).localeCompare(String(b.clientName), "he"));
  return {
    producer: {
      _id: String(producer._id),
      name: producer.name || "",
      email: producer.email || "",
      pricePerRecord: Number(producer.producerPricePerRecord || 0),
    },
    summary: summarize(rows),
    rows,
  };
}

function assertCollectionClient(client: any, producerId: mongoose.Types.ObjectId) {
  if (!client || (client.role !== "user" && client.role !== "client")) return false;
  return isInProducerCollection(client, producerId);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ producerId: string }> },
) {
  try {
    await connectDB();
    const auth = await getUserIdFromRequest(req);
    if (!isAdminContext(auth)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }
    const { producerId } = await context.params;
    const payload = await billingPayload(producerId);
    if (!payload) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...payload });
  } catch (err) {
    console.error("admin producer billing read failed", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ producerId: string }> },
) {
  try {
    await connectDB();
    const auth = await getUserIdFromRequest(req);
    if (!isAdminContext(auth)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const { producerId } = await context.params;
    const producer = await loadProducer(producerId);
    if (!producer) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "assign") {
      const email = String(body?.email || "").trim().toLowerCase();
      if (!email) {
        return NextResponse.json({ success: false, error: "MISSING_EMAIL" }, { status: 400 });
      }
      const client = await User.findOne({ email });
      if (!client) {
        return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
      }
      const decision = canAssignCollectionPayer(client as any, producer._id);
      if (!decision.ok) {
        return NextResponse.json(
          { success: false, error: decision.code },
          { status: decision.code === "ALREADY_TRACKED" ? 409 : 409 },
        );
      }

      const quota = Math.max(0, Number(client.guests || client.maxGuests || 0));
      const existingPrice = Number(client.producerBilling?.pricePerRecord || 0);
      const price = existingPrice > 0
        ? existingPrice
        : Math.max(0, Number(producer.producerPricePerRecord || 0));
      const initial = client.producerBilling?.initialRecords ?? quota;
      const alreadyConfirmed = client.producerBilling?.finalRecordsConfirmed === true;
      const now = new Date();

      await User.updateOne(
        { _id: client._id },
        {
          $set: {
            "producerBilling.payerProducerId": producer._id,
            "producerBilling.pricePerRecord": price,
            "producerBilling.initialRecords": initial,
            ...(alreadyConfirmed
              ? {}
              : {
                  "producerBilling.finalRecords": quota,
                  "producerBilling.finalRecordsConfirmed": true,
                }),
          },
          $push: {
            "producerBilling.history": {
              at: now,
              by: auth?.userId || null,
              kind: "payer",
              nextPricePerRecord: price,
              nextFinalRecords: alreadyConfirmed
                ? client.producerBilling?.finalRecords ?? quota
                : quota,
            },
          },
        },
      );

      const payload = await billingPayload(String(producer._id));
      return NextResponse.json({ success: true, ...payload });
    }

    const clientId = String(body?.clientId || "");
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }
    const client = await User.findById(clientId);
    if (!client || !assertCollectionClient(client, producer._id)) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    if (action === "payment") {
      const amount = Number(body?.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ success: false, error: "INVALID_AMOUNT" }, { status: 400 });
      }
      if (!isPaymentMethod(body?.method)) {
        return NextResponse.json({ success: false, error: "INVALID_METHOD" }, { status: 400 });
      }
      const paidAt = body?.paidAt ? new Date(body.paidAt) : new Date();
      if (Number.isNaN(paidAt.getTime())) {
        return NextResponse.json({ success: false, error: "INVALID_DATE" }, { status: 400 });
      }
      const now = new Date();
      await User.updateOne(
        { _id: client._id },
        buildCollectionPaymentUpdate({
          amount,
          paidAt,
          method: body.method,
          note: String(body?.note || "").trim(),
          recordedBy: auth?.userId || null,
          createdAt: now,
        }) as any,
      );
      const payload = await billingPayload(String(producer._id));
      return NextResponse.json({ success: true, ...payload });
    }

    if (action === "price") {
      const nextPrice = Number(body?.pricePerRecord);
      if (!Number.isFinite(nextPrice) || nextPrice < 0) {
        return NextResponse.json({ success: false, error: "INVALID_PRICE" }, { status: 400 });
      }
      const previous = Number(client.producerBilling?.pricePerRecord || 0);
      await User.updateOne(
        { _id: client._id },
        buildPriceUpdate({
          previousPrice: previous,
          nextPrice,
          at: new Date(),
          by: auth?.userId || null,
        }) as any,
      );
      const payload = await billingPayload(String(producer._id));
      return NextResponse.json({ success: true, ...payload });
    }

    if (action === "final-records") {
      const nextFinal = Number(body?.finalRecords);
      if (!Number.isInteger(nextFinal) || nextFinal < 0) {
        return NextResponse.json(
          { success: false, error: "INVALID_FINAL_RECORDS" },
          { status: 400 },
        );
      }
      const current: ProducerBillView = resolveProducerBill(client as any);
      const update = buildFinalRecordsUpdate({
        previousFinalRecords: current.confirmed ? current.finalRecords : null,
        nextFinalRecords: nextFinal,
        at: new Date(),
        by: auth?.userId || null,
        initialRecords:
          client.producerBilling?.initialRecords == null
            ? current.initialRecords
            : null,
      });
      await User.updateOne({ _id: client._id }, update as any);
      const payload = await billingPayload(String(producer._id));
      return NextResponse.json({ success: true, ...payload });
    }

    return NextResponse.json({ success: false, error: "INVALID_ACTION" }, { status: 400 });
  } catch (err) {
    console.error("admin producer billing update failed", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
