import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import {
  buildFinalRecordsUpdate,
  isInProducerCollection,
  resolveProducerBill,
} from "@/lib/producerBilling/calc";
import { describeClientEvent } from "@/lib/producerBilling/snapshot";
import {
  notifyProducerFinalRecords,
  syncProducerCollectionClient,
} from "@/lib/producerBilling/noticesLive";

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

function producerBillingView(
  client: { _id: unknown; name?: string },
  bill: { initialRecords: number; finalRecords: number | null },
  context: { eventName: string; eventDate: Date | string | null; actualRecords: number },
  updatedAt: Date | null,
) {
  return {
    clientId: String(client._id),
    clientName: client.name || "",
    eventName: context.eventName,
    eventDate: context.eventDate,
    initialRecords: bill.initialRecords,
    actualRecords: context.actualRecords,
    finalRecords: bill.finalRecords,
    finalRecordsUpdatedAt: updatedAt,
  };
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
    const eventContext = await describeClientEvent(String(client._id), client.eventDate || null);

    return NextResponse.json({
      success: true,
      billing: producerBillingView(
        client,
        bill,
        eventContext,
        client.producerBilling?.finalRecordsUpdatedAt || null,
      ),
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
    const eventContext = await describeClientEvent(String(client._id), client.eventDate || null);
    if (previous === nextFinal) {
      return NextResponse.json({
        success: true,
        unchanged: true,
        billing: producerBillingView(
          client,
          current,
          eventContext,
          client.producerBilling?.finalRecordsUpdatedAt || null,
        ),
      });
    }

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
    const producer = await User.findById(auth.userId).select("name").lean();
    try {
      await notifyProducerFinalRecords({
        clientId: String(client._id),
        producerId: auth.userId,
        producerName: producer?.name || "מפיק",
        eventName: eventContext.eventName,
        eventId: eventContext.eventId,
        previous,
        next: nextFinal,
        amountDue: bill.amountDue,
        updatedAt: at,
      });
      await syncProducerCollectionClient(String(client._id), at);
    } catch (notifyError) {
      console.error("producer final records notice failed", notifyError);
    }

    return NextResponse.json({
      success: true,
      billing: producerBillingView(client, bill, eventContext, at),
    });
  } catch (err) {
    console.error("producer final records update failed", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
