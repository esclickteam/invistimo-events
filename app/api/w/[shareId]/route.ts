import { NextRequest, NextResponse, after } from "next/server";

import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { getInvitationRsvpSiteMode } from "@/lib/guestInviteUrl";
import { serializeWeddingWebsite } from "@/lib/weddingWebsite/content";
import { getWeddingTemplate } from "@/config/weddingWebsite/templates";
import { resolvePublicGuestActions } from "@/lib/weddingWebsite/guestContext";
import { emitWeddingInternalEvent } from "@/lib/weddingWebsite/events";
import {
  getCustomerFeatures,
  hasWeddingWebsiteFeature,
} from "@/lib/features/entitlements";
import { isPersonalRsvpSite } from "@/types/rsvpSite";
import { recordGuestLinkOpen } from "@/lib/guestLinkTracking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MENU_LABELS: Record<string, string> = {
  vegetarian: "צמחוני",
  vegan: "טבעוני",
  glutenFree: "ללא גלוטן",
  childrenMeal: "מנת ילדים",
  kosher: "כשר",
  kosherGlatt: "כשר גלאט",
  kosherMahfoud: "כשר מחפוד",
};

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
    const template = getWeddingTemplate(website.templateId);
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

    const menu = invitation.invitationSettings?.menuOptions || {};
    const menuOptions = Object.entries(menu)
      .filter(([key, enabled]) => enabled && MENU_LABELS[key] && key !== "transportation")
      .map(([key]) => ({ key, label: MENU_LABELS[key] }));

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
