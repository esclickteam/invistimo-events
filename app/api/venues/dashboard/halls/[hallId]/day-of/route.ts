import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import VenueEvent from "@/models/VenueEvent";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import { eventHasVerifiedVenueLink } from "@/lib/venues/eventVenueLinkInvariant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ hallId: string }> };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function clean(v: unknown) {
  return String(v || "").trim();
}

function rsvpBucket(status: unknown) {
  const s = clean(status).toLowerCase();
  if (["yes", "approved", "coming", "confirmed", "accepted"].includes(s)) {
    return "yes";
  }
  if (["no", "declined", "rejected", "not_coming"].includes(s)) return "no";
  return "pending";
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "guests.view");
    if (error || !ctx) return error!;

    const { searchParams } = new URL(req.url);
    const date = clean(searchParams.get("date")) || todayISO();

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
          .select("status guestCount count arrived arrivalStatus arrivedAt checkedIn")
          .lean();
      }

      let yes = 0;
      let no = 0;
      let pending = 0;
      let arrived = 0;
      let expected = 0;
      for (const g of guests) {
        const n = Number(g.guestCount || g.count || 1) || 1;
        expected += n;
        const b = rsvpBucket(g.status);
        if (b === "yes") yes += n;
        else if (b === "no") no += n;
        else pending += n;
        if (
          g.arrived === true ||
          g.checkedIn === true ||
          g.arrivalStatus === "arrived" ||
          g.arrivedAt
        ) {
          arrived += n;
        }
      }

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
        guests: {
          groups: guests.length,
          expected,
          rsvpYes: yes,
          rsvpNo: no,
          rsvpPending: pending,
          arrived,
        },
        customerLiveHref: `/dashboard?eventId=${encodeURIComponent(
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
