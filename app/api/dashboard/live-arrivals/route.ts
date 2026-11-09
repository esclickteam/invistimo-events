import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { findManagedPrimaryInvitation } from "@/lib/findManagedPrimaryInvitation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
};

/**
 * Lightweight arrival snapshot for every device watching one event.
 * Same account on several devices all read this invitation; nothing here
 * is stored per user or per connection.
 */
export async function GET(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401, ...NO_STORE });
    }

    const invitationId = req.nextUrl.searchParams.get("invitationId");
    const eventId = req.nextUrl.searchParams.get("eventId");
    const invitation = await findManagedPrimaryInvitation(auth, invitationId);

    if (!invitation?._id) {
      return NextResponse.json({ success: false, error: "NO_INVITATION" }, { status: 404, ...NO_STORE });
    }

    if (
      eventId &&
      invitation.eventId &&
      String(invitation.eventId) !== String(eventId)
    ) {
      return NextResponse.json(
        { success: false, error: "EVENT_MISMATCH" },
        { status: 409, ...NO_STORE }
      );
    }

    const guests = await InvitationGuest.find({ invitationId: invitation._id })
      .select("_id actualArrivedCount")
      .lean();

    const rows = guests.map((guest: any) => ({
      id: String(guest._id),
      actualArrivedCount: Math.max(0, Math.floor(Number(guest.actualArrivedCount || 0))),
    }));

    const total = rows.reduce((sum, row) => sum + row.actualArrivedCount, 0);

    return NextResponse.json(
      {
        success: true,
        eventId: invitation.eventId ? String(invitation.eventId) : null,
        invitationId: String(invitation._id),
        total,
        markedRecords: rows.filter((row) => row.actualArrivedCount > 0).length,
        guests: rows,
        updatedAt: new Date().toISOString(),
      },
      NO_STORE
    );
  } catch (error) {
    console.error("GET live-arrivals failed", error);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500, ...NO_STORE }
    );
  }
}
