import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import { getInvitationRsvpSiteMode } from "@/lib/guestInviteUrl";
import { serializeWeddingWebsite } from "@/lib/weddingWebsite/content";
import { getWeddingTemplate } from "@/config/weddingWebsite/templates";
import { isPersonalRsvpSite } from "@/types/rsvpSite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    await db();

    const { shareId } = await context.params;
    const invitation = await Invitation.findOne({ shareId }).lean();

    if (!invitation) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    if (!isPersonalRsvpSite(getInvitationRsvpSiteMode(invitation))) {
      return NextResponse.json(
        { success: false, error: "NOT_PERSONAL_SITE", shareId },
        { status: 404 }
      );
    }

    const website = serializeWeddingWebsite(invitation);
    const template = getWeddingTemplate(website.templateId);
    const token = req.nextUrl.searchParams.get("token") || "";

    let guest = null;
    if (token) {
      guest = await InvitationGuest.findOne({
        invitationId: invitation._id,
        token,
      })
        .select("name token rsvp status guestsCount")
        .lean();
    }

    return NextResponse.json({
      success: true,
      shareId,
      title: invitation.title || website.content.coupleNames,
      template,
      weddingWebsite: website,
      guest: guest
        ? {
            name: guest.name || "",
            token: guest.token,
            rsvp: guest.rsvp || guest.status || null,
            guestsCount: guest.guestsCount || 0,
          }
        : null,
    });
  } catch (error) {
    console.error("PUBLIC WEDDING WEBSITE GET FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
