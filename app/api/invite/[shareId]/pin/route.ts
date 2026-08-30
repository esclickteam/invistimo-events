import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { resolveEventLocation } from "@/lib/navigationLinks";
import { asMapPin } from "@/lib/mapPinChoice";
import { persistEventLocationPin } from "@/lib/persistEventMapPin";
import { resolveMapPinDetailed } from "@/lib/resolveMapPin";
import {
  decideMissingPinWrite,
  isPlausibleGuestEventPin,
  isValidWorldPin,
} from "@/lib/guestPinWrite";

export const dynamic = "force-dynamic";

/**
 * Complete a missing event pin. Public guests may call this, so it must
 * never overwrite a saved pin and never persist coordinates the guest
 * chose. The only pin that can be written is a server geocode of the
 * address already stored on the invitation.
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
    const guestSentCoords = body?.lat != null || body?.lng != null;
    const guestPin = isValidWorldPin(body?.lat, body?.lng);

    if (guestSentCoords && (!guestPin || !isPlausibleGuestEventPin(guestPin))) {
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

    const event = (invitation as any).eventId
      ? await Event.findById((invitation as any).eventId)
          .select("location")
          .lean()
      : null;

    const resolved = resolveEventLocation(invitation, event);
    const existing = asMapPin(resolved);
    if (existing) {
      return NextResponse.json({
        success: true,
        alreadySaved: true,
        location: existing,
      });
    }

    if (!resolved.address && !resolved.name) {
      return NextResponse.json(
        { success: false, error: "MISSING_LOCATION" },
        { status: 400 }
      );
    }

    const server = await resolveMapPinDetailed(resolved);
    const decision = decideMissingPinWrite({
      existing,
      guest: guestPin,
      server: server.pin,
    });

    if (decision.action === "keep") {
      return NextResponse.json({
        success: true,
        alreadySaved: true,
        location: decision.pin,
      });
    }

    if (decision.action === "reject") {
      const status = server.failure === "NO_API_KEY" ? 503 : 422;
      return NextResponse.json(
        {
          success: false,
          error: decision.error,
          failure: server.failure,
        },
        { status }
      );
    }

    await persistEventLocationPin({
      invitationId: (invitation as any)._id,
      eventId: (invitation as any).eventId,
      pin: decision.pin,
    });

    return NextResponse.json({
      success: true,
      location: decision.pin,
    });
  } catch (error) {
    console.error("❌ POST /api/invite/[shareId]/pin failed:", error);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
