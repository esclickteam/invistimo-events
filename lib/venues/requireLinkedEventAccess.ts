import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import VenueEvent from "@/models/VenueEvent";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import {
  assessEventVenueLink,
  eventHasVerifiedVenueLink,
} from "@/lib/venues/eventVenueLinkInvariant";
import type { VenuePermission } from "@/lib/venues/permissions";

/**
 * Guard for venue event-detail APIs that key by Invistimo Event._id.
 *
 * SAFETY CONTRACT: Venue Suite may access an Event only when there is a
 * verified VenueHall + VenueEvent.linkedEventId relation. Bare
 * venueAccessStatus / venueHallId metadata is NOT enough.
 */
export async function requireLinkedVenueEventAccess(
  req: NextRequest | Request,
  eventId: string,
  permission?: VenuePermission | VenuePermission[]
) {
  await connectDB();

  const auth = await getUserIdFromRequest(req as any);
  if (!auth?.userId) {
    return {
      error: NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      ),
      event: null,
      venueEvent: null,
      ctx: null,
    };
  }

  const event = await Event.findById(eventId).lean();
  if (!event) {
    return {
      error: NextResponse.json(
        { success: false, message: "אירוע לא נמצא" },
        { status: 404 }
      ),
      event: null,
      venueEvent: null,
      ctx: null,
    };
  }

  const assessment = await assessEventVenueLink(event);
  const verified = await eventHasVerifiedVenueLink(event);

  if (!verified || assessment.classification !== "TRUE_VENUE_LINK") {
    // Protect Regular Events (including those with stale venue metadata)
    return {
      error: NextResponse.json(
        { success: false, message: "האירוע אינו מקושר לאולם באופן מאומת" },
        { status: 403 }
      ),
      event: null,
      venueEvent: null,
      ctx: null,
    };
  }

  const venueHallId =
    assessment.venueHallId ||
    assessment.venueEventHallId ||
    String((event as any).venueHallId || "");
  const venueOwnerId = String((event as any).venueOwnerId || "");

  const { ctx, error } = await requireVenueAccess(
    req as any,
    venueHallId,
    permission
  );

  if (error || !ctx) {
    return { error: error!, event: null, venueEvent: null, ctx: null };
  }

  // Extra isolation: membership venue must match event hall;
  // ownerId on event must match hall owner (unless admin)
  if (!ctx.isAdmin && venueOwnerId && venueOwnerId !== ctx.ownerId) {
    return {
      error: NextResponse.json(
        { success: false, message: "אין הרשאה לאירוע זה" },
        { status: 403 }
      ),
      event: null,
      venueEvent: null,
      ctx: null,
    };
  }

  const venueEvent = assessment.venueEventId
    ? await VenueEvent.findById(assessment.venueEventId).lean()
    : null;

  return { error: null, event, venueEvent, ctx };
}
