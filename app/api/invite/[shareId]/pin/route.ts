import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { parseCoord } from "@/lib/navigationLinks";
import { persistEventLocationPin } from "@/lib/persistEventMapPin";

export const dynamic = "force-dynamic";

/**
 * Fill a missing event pin from a browser geocode.
 *
 * Production's Maps key is referrer-restricted, so the server REST
 * Geocoding API is denied. The guest page can still resolve a pin in
 * the browser and send it here. Only empty coordinates are written —
 * an existing pin is never overwritten by this route.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    await db();

    const { shareId } = await context.params;
    if (!shareId) {
      return NextResponse.json(
        { success: false, error: "MISSING_SHARE_ID" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const lat = parseCoord(body?.lat);
    const lng = parseCoord(body?.lng);

    if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json(
        { success: false, error: "INVALID_PIN" },
        { status: 400 }
      );
    }

    const invitation = await Invitation.findOne({ shareId })
      .select("_id eventId location")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const existingLat = parseCoord((invitation as any).location?.lat);
    const existingLng = parseCoord((invitation as any).location?.lng);
    if (existingLat != null && existingLng != null) {
      return NextResponse.json({
        success: true,
        alreadySaved: true,
        location: { lat: existingLat, lng: existingLng },
      });
    }

    await persistEventLocationPin({
      invitationId: (invitation as any)._id,
      eventId: (invitation as any).eventId,
      pin: { lat, lng },
    });

    return NextResponse.json({
      success: true,
      location: { lat, lng },
    });
  } catch (error) {
    console.error("❌ POST /api/invite/[shareId]/pin failed:", error);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
