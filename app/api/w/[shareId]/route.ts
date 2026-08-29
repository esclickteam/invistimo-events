import { NextRequest, NextResponse, after } from "next/server";

import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { getInvitationRsvpSiteMode } from "@/lib/guestInviteUrl";
import { serializeWeddingWebsite } from "@/lib/weddingWebsite/content";
import { getWeddingTemplate } from "@/config/weddingWebsite/templates";
import { overlayWeddingTemplateImages } from "@/lib/weddingWebsite/images";
import { resolvePublicGuestActions } from "@/lib/weddingWebsite/guestContext";
import { emitWeddingInternalEvent } from "@/lib/weddingWebsite/events";
import {
  getCustomerFeatures,
  hasWeddingWebsiteFeature,
} from "@/lib/features/entitlements";
import { isPersonalRsvpSite } from "@/types/rsvpSite";
import { recordGuestLinkOpen } from "@/lib/guestLinkTracking.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getActiveMenuOptions } from "@/lib/rsvp/guestRsvpLogic";

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

    const owner = invitation.ownerId
      ? await User.findById(invitation.ownerId)
          .select("rsvpSiteMode guestExperienceType features")
          .lean()
      : null;

    const entitled =
      hasWeddingWebsiteFeature(owner) ||
      isPersonalRsvpSite(getInvitationRsvpSiteMode(invitation));

    if (!entitled) {
      return NextResponse.json(
        { success: false, error: "NOT_PERSONAL_SITE", shareId },
        { status: 404 }
      );
    }

    const website = serializeWeddingWebsite(invitation);
    if (invitation.weddingWebsite?.published === false) {
      return NextResponse.json(
        { success: false, error: "UNPUBLISHED", message: "אתר החתונה עדיין לא פורסם." },
        { status: 404 }
      );
    }
    const template = overlayWeddingTemplateImages(
      getWeddingTemplate(website.templateId),
      website.content
    );
    const token = req.nextUrl.searchParams.get("token") || "";
    const features = getCustomerFeatures(owner);
    const guest = await resolvePublicGuestActions({
      invitationId: invitation._id,
      token,
      owner,
    });

    if (guest && token) {
      try {
        after(() =>
          recordGuestLinkOpen({
            token,
            invitationId: invitation._id,
            userAgent: req.headers.get("user-agent"),
            purpose:
              req.headers.get("sec-fetch-purpose") ||
              req.headers.get("purpose"),
          })
        );
      } catch {
        // tracking is best-effort and must never block the wedding website
      }
    }

    const menuOptions = getActiveMenuOptions(invitation.invitationSettings?.menuOptions);

    if (token) {
      emitWeddingInternalEvent({
        name: "wedding_site_opened",
        invitationId: String(invitation._id),
        eventId: invitation.eventId ? String(invitation.eventId) : undefined,
        shareId,
        guestId: guest ? "authenticated" : undefined,
      });
    } else {
      emitWeddingInternalEvent({
        name: "wedding_site_opened",
        invitationId: String(invitation._id),
        eventId: invitation.eventId ? String(invitation.eventId) : undefined,
        shareId,
      });
    }

    return NextResponse.json({
      success: true,
      shareId,
      title: website.event?.coupleNames || invitation.title || website.content.coupleNames,
      template,
      weddingWebsite: website,
      event: website.event,
      features: {
        weddingWebsite: true,
        guestMessages: features.guestMessages,
      },
      settings: {
        allowGuestNote: Boolean(invitation.invitationSettings?.allowGuestNote),
        menuOptions,
      },
      guest,
    });
  } catch (error) {
    console.error("PUBLIC WEDDING WEBSITE GET FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
