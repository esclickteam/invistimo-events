import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import type { VenuePermission } from "@/lib/venues/permissions";

/**
 * Guard for venue event-detail APIs that key by Invistimo Event._id
 * but must be scoped to a linked venue hall.
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
      ctx: null,
    };
  }

  const venueHallId = String((event as any).venueHallId || "");
  const venueOwnerId = String((event as any).venueOwnerId || "");
  const access = String((event as any).venueAccessStatus || "none");

  if (!venueHallId || access !== "linked") {
    // Not a venue-linked event — deny venue APIs (protect regular events)
    return {
      error: NextResponse.json(
        { success: false, message: "האירוע אינו מקושר לאולם" },
        { status: 403 }
      ),
      event: null,
      ctx: null,
    };
  }

  const { ctx, error } = await requireVenueAccess(
    req as any,
    venueHallId,
    permission
  );

  if (error || !ctx) {
    return { error: error!, event: null, ctx: null };
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
      ctx: null,
    };
  }

  return { error: null, event, ctx };
}
