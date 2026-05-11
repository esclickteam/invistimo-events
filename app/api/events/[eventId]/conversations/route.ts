import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import Event from "@/models/Event";
import EventConversation from "@/models/EventConversation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================
   GET – Load conversations
========================= */
export async function GET(
  req: NextRequest,
  context: {
    params: Promise<{
      eventId: string;
    }>;
  }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const { eventId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_EVENT_ID",
        },
        { status: 400 }
      );
    }

    const event = await Event.findOne({
      _id: eventId,
      $or: [
        { userId: auth.userId },
        { producerId: auth.userId },
      ],
    }).select("_id userId producerId");

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    const conversations = await EventConversation.find({
      eventId,
    })
      .sort({
        date: 1,
        time: 1,
        createdAt: -1,
      })
      .lean();

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (err) {
    console.error("❌ GET conversations failed:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

/* =========================
   POST – Create calendar item / meeting / reminder / event
========================= */
export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{
      eventId: string;
    }>;
  }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const { eventId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_EVENT_ID",
        },
        { status: 400 }
      );
    }

    const event = await Event.findOne({
      _id: eventId,
      $or: [
        { userId: auth.userId },
        { producerId: auth.userId },
      ],
    }).select("_id userId producerId");

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const type =
      body.type ||
      body.calendarType ||
      body.meetingType ||
      "meeting";

    const calendarType =
      body.calendarType ||
      body.meetingType ||
      body.type ||
      "meeting";

    const meetingType =
      body.meetingType ||
      body.calendarType ||
      body.type ||
      "meeting";

    const entityType =
      body.entityType ||
      "calendar";

    const entityName =
      body.entityName ||
      body.title ||
      body.name ||
      body.subject ||
      "";

    const title =
      body.title ||
      body.entityName ||
      body.name ||
      body.subject ||
      "";

    const date =
      body.date ||
      body.meetingDate ||
      body.eventDate ||
      body.dueDate ||
      "";

    const time =
      body.time ||
      body.meetingTime ||
      body.eventTime ||
      body.hour ||
      "";

    const description =
      body.description ||
      body.notes ||
      body.message ||
      body.summary ||
      "";

    const summary =
      body.summary ||
      body.description ||
      body.notes ||
      body.message ||
      "";

    const location =
      body.location ||
      body.address ||
      "";

    const zoomLink =
      body.zoomLink ||
      (calendarType === "zoom" ? location : "");

    const status =
      body.status ||
      "planned";

    if (!entityName || !date) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_FIELDS",
          required: {
            entityName: !!entityName,
            date: !!date,
          },
        },
        { status: 400 }
      );
    }

    const conversation = await EventConversation.create({
      eventId,

      // old fields
      type,
      entityType,
      entityName,
      date,
      summary,

      // new calendar fields
      calendarType,
      meetingType,
      title,
      name: title,

      meetingDate: date,
      eventDate: date,
      dueDate: date,

      time,
      meetingTime: time,
      eventTime: time,

      description,
      notes: description,
      message: description,

      location,
      address: location,
      zoomLink,

      status,

      syncToProducerCalendar:
        body.syncToProducerCalendar !== false,

      createdBy: auth.userId,
    });

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (err) {
    console.error("❌ POST conversation failed:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}