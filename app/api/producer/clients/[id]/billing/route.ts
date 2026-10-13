import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import {
  buildFinalRecordsUpdate,
  isInProducerCollection,
  resolveProducerBill,
} from "@/lib/producerBilling/calc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireProducer(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId || auth.role !== "producer") return null;
  return auth;
}

async function loadManagedClient(producerId: string, clientId: string) {
  if (!mongoose.Types.ObjectId.isValid(clientId)) return null;
  return User.findOne({
    _id: clientId,
    role: { $in: ["client", "user"] },
    $or: [
      { assignedProducerId: producerId },
      { assignedProducerIds: producerId },
    ],
  });
}

async function countActualRecords(userId: string) {
  const events = await Event.find({ userId }).select("_id").lean();
  const eventIds = events.map((event) => event._id);
  if (eventIds.length === 0) return 0;
  const invitations = await Invitation.find({ eventId: { $in: eventIds } })
    .select("_id")
    .lean();
  const invitationIds = invitations.map((invitation) => invitation._id);
  if (invitationIds.length === 0) return 0;
  return InvitationGuest.countDocuments({ invitationId: { $in: invitationIds } });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const auth = await requireProducer(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await context.params;
    const client = await loadManagedClient(auth.userId, id);
    if (!client || !isInProducerCollection(client as any, auth.userId)) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const bill = resolveProducerBill(client as any);
    const actualRecords = await countActualRecords(String(client._id));

    return NextResponse.json({
      success: true,
      billing: {
        clientId: String(client._id),
        initialRecords: bill.initialRecords,
        actualRecords,
        finalRecords: bill.finalRecords,
        finalRecordsUpdatedAt: client.producerBilling?.finalRecordsUpdatedAt || null,
        pricePerRecord: bill.pricePerRecord,
        amountDue: bill.amountDue,
        status: bill.status,
        statusLabel: bill.statusLabel,
      },
    });
  } catch (err) {
    console.error("producer billing read failed", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const auth = await requireProducer(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (
      body?.action === "payment" ||
      body?.paid != null ||
      body?.amountPaid != null ||
      body?.markPaid === true ||
      body?.pricePerRecord != null
    ) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const nextFinal = Number(body?.finalRecords);
    if (!Number.isInteger(nextFinal) || nextFinal < 0) {
      return NextResponse.json(
        { success: false, error: "INVALID_FINAL_RECORDS" },
        { status: 400 },
      );
    }

    const { id } = await context.params;
    const client = await loadManagedClient(auth.userId, id);
    if (!client || !isInProducerCollection(client as any, auth.userId)) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const current = resolveProducerBill(client as any);
    const previous = current.confirmed ? current.finalRecords : null;
    const at = new Date();
    const update = buildFinalRecordsUpdate({
      previousFinalRecords: previous,
      nextFinalRecords: nextFinal,
      at,
      by: auth.userId,
      initialRecords:
        client.producerBilling?.initialRecords == null
          ? current.initialRecords
          : null,
    });

    await User.updateOne({ _id: client._id }, update as any);

    const fresh = await User.findById(client._id);
    const bill = resolveProducerBill((fresh || client) as any);
    const actualRecords = await countActualRecords(String(client._id));

    return NextResponse.json({
      success: true,
      billing: {
        clientId: String(client._id),
        initialRecords: bill.initialRecords,
        actualRecords,
        finalRecords: bill.finalRecords,
        finalRecordsUpdatedAt: at,
        pricePerRecord: bill.pricePerRecord,
        amountDue: bill.amountDue,
        status: bill.status,
        statusLabel: bill.statusLabel,
      },
    });
  } catch (err) {
    console.error("producer final records update failed", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
