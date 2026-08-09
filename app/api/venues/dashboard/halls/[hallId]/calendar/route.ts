import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import { writeVenueAudit } from "@/lib/venues/audit";
import {
  cancelVenueCalendarEvent,
  cleanString,
  createVenueCalendarEvent,
  listVenueEventsForHall,
  updateVenueCalendarEvent,
  type VenueEventPatch,
} from "@/lib/venues/venueEventsService";
import { isVenueEventStatus } from "@/lib/venues/statuses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    hallId: string;
  }>;
};

function serializeHall(hall: any) {
  if (!hall) return null;

  return {
    id: String(hall.id || hall._id || ""),
    name: hall.name || "",
    subtitle: hall.subtitle || "",
    capacity: hall.capacity || 0,
    status: hall.status || "active",
    image: hall.image || "",
  };
}

function buildPatchFromBody(body: Record<string, unknown>): VenueEventPatch {
  const patch: VenueEventPatch = {};

  if ("title" in body) patch.title = cleanString(body.title);
  if ("eventType" in body) patch.eventType = cleanString(body.eventType);
  if ("clientName" in body) patch.clientName = cleanString(body.clientName);
  if ("clientPhone" in body) patch.clientPhone = cleanString(body.clientPhone);
  if ("clientEmail" in body) patch.clientEmail = cleanString(body.clientEmail);
  if ("date" in body) patch.date = cleanString(body.date);
  if ("startTime" in body) patch.startTime = cleanString(body.startTime);
  if ("endTime" in body) patch.endTime = cleanString(body.endTime);
  if ("time" in body) patch.time = cleanString(body.time);
  if ("notes" in body) patch.notes = cleanString(body.notes);
  if ("color" in body) patch.color = cleanString(body.color);

  if ("guests" in body) patch.guests = Number(body.guests);
  if ("estimatedGuests" in body) patch.estimatedGuests = Number(body.estimatedGuests);
  if ("estimatedGuestCount" in body) {
    patch.estimatedGuestCount = Number(body.estimatedGuestCount);
  }
  if ("budget" in body) patch.budget = Number(body.budget);
  if ("paidAmount" in body) patch.paidAmount = Number(body.paidAmount);

  if ("status" in body && isVenueEventStatus(body.status)) {
    patch.status = body.status;
  }

  return patch;
}

function resolveVenueEventId(
  body: Record<string, unknown>,
  url: URL
): string {
  return (
    cleanString(body.venueEventId) ||
    cleanString(body.id) ||
    cleanString(body._id) ||
    cleanString(url.searchParams.get("venueEventId"))
  );
}

/* ======================================================
   GET /api/venues/dashboard/halls/[hallId]/calendar
   VenueEvents for the hall (tenant-scoped).
====================================================== */

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    const { ctx, error } = await requireVenueAccess(req, hallId, "events.view");

    if (error || !ctx) {
      return error!;
    }

    const hall = ctx.hall;
    const url = new URL(req.url);
    const from = cleanString(url.searchParams.get("from"));
    const to = cleanString(url.searchParams.get("to"));

    const serializedEvents = await listVenueEventsForHall({
      ownerId: ctx.ownerId,
      venueId: ctx.venueId,
      hall,
      from,
      to,
    });

    return NextResponse.json({
      success: true,
      hall: serializeHall(hall),
      events: serializedEvents,
    });
  } catch (error) {
    console.error(
      "GET /api/venues/dashboard/halls/[hallId]/calendar failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "טעינת יומן האולם נכשלה",
      },
      { status: 500 }
    );
  }
}

/* ======================================================
   POST /api/venues/dashboard/halls/[hallId]/calendar
   Creates VenueEvent + linked Event (dual-write).
====================================================== */

export async function POST(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    const { ctx, error } = await requireVenueAccess(
      req,
      hallId,
      "events.create"
    );

    if (error || !ctx) {
      return error!;
    }

    const hall = ctx.hall;
    const body = await req.json();

    const result = await createVenueCalendarEvent({
      ownerId: ctx.ownerId,
      venueId: ctx.venueId,
      hallName: hall.name || "",
      hallCapacity: hall.capacity || 0,
      actorUserId: ctx.auth.userId,
      body,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status }
      );
    }

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "calendar.event.create",
      targetType: "VenueEvent",
      targetId: String(result.venueEvent._id),
      meta: {
        linkedEventId: String(result.linkedEvent._id),
      },
    });

    return NextResponse.json({
      success: true,
      message: "האירוע נוסף ליומן בהצלחה",
      event: result.serialized,
    });
  } catch (error) {
    console.error(
      "POST /api/venues/dashboard/halls/[hallId]/calendar failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "יצירת אירוע ביומן נכשלה",
      },
      { status: 500 }
    );
  }
}

/* ======================================================
   PUT/PATCH /api/venues/dashboard/halls/[hallId]/calendar
   Updates VenueEvent + linked Event in sync.
====================================================== */

async function handleUpdate(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    const { ctx, error } = await requireVenueAccess(req, hallId, "events.edit");

    if (error || !ctx) {
      return error!;
    }

    const body = await req.json();
    const url = new URL(req.url);
    const venueEventId = resolveVenueEventId(body, url);

    if (!venueEventId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה אירוע לעדכון",
        },
        { status: 400 }
      );
    }

    const patch = buildPatchFromBody(body);

    const result = await updateVenueCalendarEvent({
      ownerId: ctx.ownerId,
      venueId: ctx.venueId,
      venueEventId,
      patch,
      hall: ctx.hall,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status }
      );
    }

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "calendar.event.update",
      targetType: "VenueEvent",
      targetId: venueEventId,
      meta: { patch },
    });

    return NextResponse.json({
      success: true,
      message: "האירוע עודכן בהצלחה",
      event: result.serialized,
    });
  } catch (error) {
    console.error(
      "PUT/PATCH /api/venues/dashboard/halls/[hallId]/calendar failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "עדכון אירוע ביומן נכשל",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, props: Props) {
  return handleUpdate(req, props);
}

export async function PATCH(req: NextRequest, props: Props) {
  return handleUpdate(req, props);
}

/* ======================================================
   DELETE /api/venues/dashboard/halls/[hallId]/calendar?venueEventId=...
   Soft-cancel VenueEvent + archive linked Event.
====================================================== */

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    const { ctx, error } = await requireVenueAccess(
      req,
      hallId,
      "events.delete"
    );

    if (error || !ctx) {
      return error!;
    }

    const url = new URL(req.url);
    const venueEventId = cleanString(url.searchParams.get("venueEventId"));

    if (!venueEventId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה אירוע לביטול",
        },
        { status: 400 }
      );
    }

    const result = await cancelVenueCalendarEvent({
      ownerId: ctx.ownerId,
      venueId: ctx.venueId,
      venueEventId,
      hall: ctx.hall,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status }
      );
    }

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "calendar.event.cancel",
      targetType: "VenueEvent",
      targetId: venueEventId,
      meta: {
        alreadyCancelled: result.alreadyCancelled,
        linkedEventId: result.linkedEvent
          ? String((result.linkedEvent as any)._id)
          : "",
      },
    });

    return NextResponse.json({
      success: true,
      message: result.alreadyCancelled
        ? "האירוע כבר בוטל"
        : "האירוע בוטל בהצלחה",
      event: result.serialized,
    });
  } catch (error) {
    console.error(
      "DELETE /api/venues/dashboard/halls/[hallId]/calendar failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "ביטול אירוע ביומן נכשל",
      },
      { status: 500 }
    );
  }
}
