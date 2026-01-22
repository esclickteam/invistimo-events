import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   GET – שליפת תכנון אירוע
========================================================= */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  await db();

  const auth = await getUserIdFromRequest();
  if (!auth?.userId) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const { eventId } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const event = await Event.findOne({
    _id: eventId,
    $or: [{ userId: auth.userId }, { producerId: auth.userId }],
  })
    .select("planning")
    .lean();

  if (!event) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    planning: event.planning || null,
  });
}

/* =========================================================
   PATCH – עדכון תכנון אירוע
========================================================= */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  await db();

  const auth = await getUserIdFromRequest();
  if (!auth?.userId) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const { eventId } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const { eventDefinition, concept } = await req.json();

  const event = await Event.findOneAndUpdate(
    {
      _id: eventId,
      $or: [{ userId: auth.userId }, { producerId: auth.userId }],
    },
    {
      $set: {
        planning: {
          eventDefinition,
          concept,
          updatedAt: new Date(),
        },
      },
    },
    { new: true }
  ).select("_id");

  if (!event) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
