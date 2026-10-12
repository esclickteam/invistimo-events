import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  listAdminBriefings,
  sendBriefing,
  updateArrivalTime,
} from "@/lib/venueSeatingBriefing/service";

export const dynamic = "force-dynamic";

async function requireAdmin(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth || (auth.role !== "admin" && !auth.impersonatedByAdmin)) return null;
  return auth;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 403 });

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  await dbConnect();
  const payload = await listAdminBriefings(id);
  if (!payload) return NextResponse.json({ success: false }, { status: 404 });
  return NextResponse.json({ success: true, ...payload });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 403 });

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  await dbConnect();
  const result = await updateArrivalTime({
    customerId: id,
    eventId: String(body?.eventId || ""),
    arrivalTime: body?.arrivalTime,
    clearManual: Boolean(body?.clearManual),
  });
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status }
    );
  }
  return NextResponse.json({ success: true, event: result.event });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 403 });

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const recipientIds = Array.isArray(body?.recipientIds)
    ? body.recipientIds.map((value: unknown) => String(value || ""))
    : [];

  await dbConnect();
  const result = await sendBriefing({
    customerId: id,
    eventId: String(body?.eventId || ""),
    recipientIds,
    kind: "manual",
  });
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status }
    );
  }
  return NextResponse.json({
    success: true,
    results: result.results,
    event: result.event,
  });
}
