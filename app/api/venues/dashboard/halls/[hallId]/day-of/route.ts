import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import VenueEvent from "@/models/VenueEvent";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import { eventHasVerifiedVenueLink } from "@/lib/venues/eventVenueLinkInvariant";
import {
  serializeDayOfGuest,
  summarizeGuests,
} from "@/lib/venues/dayOfGuests";
import { writeVenueAudit } from "@/lib/venues/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ hallId: string }> };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function clean(v: unknown) {
  return String(v || "").trim();
}

async function loadVerifiedDayEvent(params: {
  hallId: string;
  ownerId: string;
  eventId: string;
}) {
  const event = await Event.findById(params.eventId).lean();
  if (!event) return null;
  const verified = await eventHasVerifiedVenueLink(event);
  if (!verified) return null;

  const ve = await VenueEvent.findOne({
    hallId: params.hallId,
    ownerId: params.ownerId,
    linkedEventId: String(event._id),
    status: { $nin: ["cancelled"] },
  }).lean();
  if (!ve) return null;

  const invitation = await Invitation.findOne({
    $or: [
      { eventId: event._id },
      { linkedEventId: event._id },
      { productionEventId: event._id },
    ],
  })
    .select("_id shareId")
    .lean();

  return { event, ve, invitation };
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "guests.view");
    if (error || !ctx) return error!;

    const { searchParams } = new URL(req.url);
    const date = clean(searchParams.get("date")) || todayISO();
    const eventIdFilter = clean(searchParams.get("eventId"));
    const q = clean(searchParams.get("q")).toLowerCase();

    // Single-event reception payload
    if (eventIdFilter) {
      const loaded = await loadVerifiedDayEvent({
        hallId: ctx.venueId,
        ownerId: ctx.ownerId,
        eventId: eventIdFilter,
      });
      if (!loaded) {
        return NextResponse.json(
          { success: false, message: "אירוע לא מאומת לאולם זה" },
          { status: 404 }
        );
      }

      let guests: any[] = [];
      if (loaded.invitation?._id) {
        guests = await InvitationGuest.find({
          invitationId: loaded.invitation._id,
        })
          .select(
            "name fullName phone side status rsvp guestCount count amount actualArrivedCount arrivedCount arrived checkedIn arrivalStatus arrivedAt tableId tableName notes note"
          )
          .sort({ name: 1 })
          .lean();
      }

      let serialized = guests.map(serializeDayOfGuest);
      if (q) {
        serialized = serialized.filter(
          (g) =>
            g.name.toLowerCase().includes(q) ||
            g.phone.includes(q) ||
            g.tableName.toLowerCase().includes(q)
        );
      }

      const summary = summarizeGuests(guests);

      return NextResponse.json({
        success: true,
        date: loaded.ve.date || date,
        hallId: ctx.venueId,
        hallName: (ctx.hall as any)?.name || ctx.venueId,
        event: {
          venueEventId: String(loaded.ve._id),
          eventId: String(loaded.event._id),
          title: loaded.ve.title || (loaded.event as any).title || "אירוע",
          clientName: loaded.ve.clientName || "",
          startTime: loaded.ve.startTime || (loaded.event as any).time || "",
          endTime: loaded.ve.endTime || "",
          status: loaded.ve.status,
          invitationId: loaded.invitation?._id
            ? String(loaded.invitation._id)
            : null,
          shareId: loaded.invitation?.shareId || null,
          guests: summary,
          canEditGuests: ctx.permissions.includes("guests.edit"),
          customerLiveHref: `/dashboard?eventId=${encodeURIComponent(
            String(loaded.event._id)
          )}&venueView=1&live=1`,
          seatingLiveHref: `/dashboard/seating?eventId=${encodeURIComponent(
            String(loaded.event._id)
          )}&venueView=1&live=1`,
          venueEventHref: `/venues/dashboard/events/${encodeURIComponent(
            String(loaded.event._id)
          )}`,
        },
        guests: serialized,
      });
    }

    const venueEvents = await VenueEvent.find({
      hallId: ctx.venueId,
      ownerId: ctx.ownerId,
      date,
      status: { $nin: ["cancelled"] },
    })
      .sort({ startTime: 1 })
      .lean();

    const rows = [];
    for (const ve of venueEvents) {
      const linkedId = ve.linkedEventId ? String(ve.linkedEventId) : "";
      let event: any = null;
      let verified = false;
      if (linkedId) {
        event = await Event.findById(linkedId).lean();
        verified = event ? await eventHasVerifiedVenueLink(event) : false;
      }
      if (!verified) {
        // Skip unverified — Safety Contract
        continue;
      }

      const invitation = await Invitation.findOne({
        $or: [
          { eventId: event._id },
          { linkedEventId: event._id },
          { productionEventId: event._id },
        ],
      })
        .select("_id shareId")
        .lean();

      let guests: any[] = [];
      if (invitation?._id) {
        guests = await InvitationGuest.find({ invitationId: invitation._id })
          .select(
            "status rsvp guestCount count amount actualArrivedCount arrivedCount arrived checkedIn arrivalStatus arrivedAt"
          )
          .lean();
      }

      const summary = summarizeGuests(guests);

      rows.push({
        venueEventId: String(ve._id),
        eventId: String(event._id),
        title: ve.title || event.title || "אירוע",
        clientName: ve.clientName || "",
        startTime: ve.startTime || event.time || "",
        endTime: ve.endTime || "",
        status: ve.status,
        invitationId: invitation?._id ? String(invitation._id) : null,
        shareId: invitation?.shareId || null,
        guests: summary,
        canEditGuests: ctx.permissions.includes("guests.edit"),
        receptionHref: `/venues/dashboard/halls/${encodeURIComponent(
          ctx.venueId
        )}/day-of?date=${encodeURIComponent(date)}&eventId=${encodeURIComponent(
          String(event._id)
        )}`,
        customerLiveHref: `/dashboard?eventId=${encodeURIComponent(
          String(event._id)
        )}&venueView=1&live=1`,
        seatingLiveHref: `/dashboard/seating?eventId=${encodeURIComponent(
          String(event._id)
        )}&venueView=1&live=1`,
        venueEventHref: `/venues/dashboard/events/${encodeURIComponent(
          String(event._id)
        )}`,
      });
    }

    return NextResponse.json({
      success: true,
      date,
      hallId: ctx.venueId,
      hallName: (ctx.hall as any)?.name || ctx.venueId,
      canEditGuests: ctx.permissions.includes("guests.edit"),
      events: rows,
    });
  } catch (err) {
    console.error("GET day-of failed:", err);
    return NextResponse.json(
      { success: false, message: "טעינת יום האירוע נכשלה" },
      { status: 500 }
    );
  }
}

/**
 * Reception mutations for verified Venue customers only.
 * Updates InvitationGuest.actualArrivedCount (same Live field customers use).
 */
export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "guests.edit");
    if (error || !ctx) return error!;

    const body = await req.json().catch(() => ({}));
    const eventId = clean(body.eventId);
    const guestId = clean(body.guestId);
    const action = clean(body.action) || "set_arrived";

    if (!eventId || !guestId) {
      return NextResponse.json(
        { success: false, message: "חסרים eventId / guestId" },
        { status: 400 }
      );
    }

    const loaded = await loadVerifiedDayEvent({
      hallId: ctx.venueId,
      ownerId: ctx.ownerId,
      eventId,
    });
    if (!loaded?.invitation?._id) {
      return NextResponse.json(
        { success: false, message: "אירוע לא מאומת או ללא הזמנה" },
        { status: 404 }
      );
    }

    const guest = await InvitationGuest.findOne({
      _id: guestId,
      invitationId: loaded.invitation._id,
    });
    if (!guest) {
      return NextResponse.json(
        { success: false, message: "אורח לא נמצא באירוע זה" },
        { status: 404 }
      );
    }

    const party = Math.max(
      1,
      Number((guest as any).guestCount || (guest as any).count || 1) || 1
    );
    let next = Number((guest as any).actualArrivedCount || 0) || 0;

    if (action === "mark_arrived") {
      next = party;
    } else if (action === "mark_not_arrived") {
      next = 0;
    } else if (action === "set_arrived") {
      if (typeof body.actualArrivedCount !== "number") {
        return NextResponse.json(
          { success: false, message: "חסר actualArrivedCount" },
          { status: 400 }
        );
      }
      next = Math.max(0, Math.min(party + 20, Math.floor(body.actualArrivedCount)));
    } else {
      return NextResponse.json(
        { success: false, message: "פעולה לא נתמכת" },
        { status: 400 }
      );
    }

    // Arrival only — do not mutate RSVP/status/seating/ownership (Safety Contract)
    (guest as any).actualArrivedCount = next;
    await guest.save();

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: String(ctx.auth.userId),
      action: "day_of.guest_arrival",
      targetType: "InvitationGuest",
      targetId: String(guest._id),
      meta: {
        eventId,
        action,
        actualArrivedCount: next,
        party,
      },
    });

    return NextResponse.json({
      success: true,
      guest: serializeDayOfGuest(guest.toObject ? guest.toObject() : guest),
    });
  } catch (err) {
    console.error("PATCH day-of failed:", err);
    return NextResponse.json(
      { success: false, message: "עדכון הגעה נכשל" },
      { status: 500 }
    );
  }
}
