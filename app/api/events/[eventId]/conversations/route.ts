import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import Event from "@/models/Event";
import EventConversation from "@/models/EventConversation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   Helpers
========================================================= */

function normalizeConversationBody(body: any) {
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

  return {
    type,
    calendarType,
    meetingType,
    entityType,

    entityName,
    title,
    name: title,
    subject: title,

    date,
    meetingDate: date,
    eventDate: date,
    dueDate: date,

    time,
    meetingTime: time,
    eventTime: time,
    hour: time,

    summary,
    description,
    notes: description,
    message: description,

    location,
    address: location,
    zoomLink,

    status: body.status || "planned",

    syncToProducerCalendar:
      body.syncToProducerCalendar !== false,
  };
}

async function requireEventAccess(eventId: string, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "INVALID_EVENT_ID",
        },
        { status: 400 }
      ),
    };
  }

  const event = await Event.findOne({
    _id: eventId,
    $or: [
      { userId },
      { producerId: userId },
    ],
  }).select("_id userId producerId");

  if (!event) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        { status: 403 }
      ),
    };
  }

  return {
    event,
  };
}

/* =========================================================
   PATCH – Update conversation/calendar item
   Route:
   /api/events/[eventId]/conversations/[conversationId]
========================================================= */

export async function PATCH(
  req: NextRequest,
  context: {
    params: Promise<{
      eventId: string;
      conversationId: string;
    }>;
  }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const { eventId, conversationId } = await context.params;

    const access = await requireEventAccess(eventId, auth.userId);

    if (access.error) {
      return access.error;
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CONVERSATION_ID",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updates = normalizeConversationBody(body);

    if (!updates.entityName || !updates.date) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_FIELDS",
        },
        { status: 400 }
      );
    }

    const conversation =
      await EventConversation.findOneAndUpdate(
        {
          _id: conversationId,
          eventId,
        },
        {
          $set: updates,
        },
        {
          new: true,
        }
      );

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error: "CONVERSATION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (err) {
    console.error("❌ PATCH conversation failed:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE – Delete conversation/calendar item
   Route:
   /api/events/[eventId]/conversations/[conversationId]
========================================================= */

export async function DELETE(
  req: NextRequest,
  context: {
    params: Promise<{
      eventId: string;
      conversationId: string;
    }>;
  }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const { eventId, conversationId } = await context.params;

    const access = await requireEventAccess(eventId, auth.userId);

    if (access.error) {
      return access.error;
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CONVERSATION_ID",
        },
        { status: 400 }
      );
    }

    const deleted = await EventConversation.findOneAndDelete({
      _id: conversationId,
      eventId,
    });

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: "CONVERSATION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedId: conversationId,
    });
  } catch (err) {
    console.error("❌ DELETE conversation failed:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
