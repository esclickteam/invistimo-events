import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import WeddingWebsite from "@/models/WeddingWebsite";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { canManageInvitation } from "@/lib/canManageInvitation";
import { getWeddingTemplateIds } from "@/config/weddingWebsite/templates";
import { resolveWeddingSiteContent } from "@/lib/weddingWebsite/resolveWeddingSiteContent";

export const dynamic = "force-dynamic";

function cleanStr(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * GET ?invitationId=... — load or implicitly describe wedding website for an invitation
 * POST — create wedding website for invitation (draft)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const invitationId = cleanStr(req.nextUrl.searchParams.get("invitationId"));
    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: "invitationId required" },
        { status: 400 }
      );
    }

    await db();
    const invitation = await Invitation.findById(invitationId).lean();
    if (!invitation || !canManageInvitation(auth, invitation)) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const website = await WeddingWebsite.findOne({ invitationId }).lean();
    const event = invitation.eventId
      ? await Event.findById(invitation.eventId).lean()
      : null;

    const resolved = website
      ? resolveWeddingSiteContent({
          invitation: invitation as any,
          event: event as any,
          overrides: (website.content || {}) as any,
          templateId: website.templateId,
        })
      : resolveWeddingSiteContent({
          invitation: invitation as any,
          event: event as any,
          overrides: {},
          templateId: "eternal-gold",
        });

    return NextResponse.json({
      success: true,
      website: website
        ? {
            id: String(website._id),
            shareId: website.shareId,
            templateId: website.templateId,
            status: website.status,
            content: website.content || {},
            sections: website.sections || {},
            themeOverrides: website.themeOverrides || {},
            publishedAt: website.publishedAt,
            publicPath: `/w/${website.shareId}`,
            resolvedContent: resolved,
            invitationId: String(invitation._id),
            eventId: String(invitation.eventId || ""),
          }
        : null,
      invitation: {
        id: String(invitation._id),
        shareId: invitation.shareId,
        title: invitation.title,
        rsvpSiteMode: (invitation as any).invitationSettings?.rsvpSiteMode || "standard",
        invitePath: `/invite/${invitation.shareId}`,
      },
      templates: getWeddingTemplateIds(),
    });
  } catch (err) {
    console.error("[wedding-website GET]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const invitationId = cleanStr(body.invitationId);
    const templateId = cleanStr(body.templateId) || "eternal-gold";

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: "invitationId required" },
        { status: 400 }
      );
    }

    if (!getWeddingTemplateIds().includes(templateId as any)) {
      return NextResponse.json(
        { success: false, error: "Invalid templateId" },
        { status: 400 }
      );
    }

    await db();
    const invitation = await Invitation.findById(invitationId);
    if (!invitation || !canManageInvitation(auth, invitation)) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const existing = await WeddingWebsite.findOne({ invitationId: invitation._id });
    if (existing) {
      return NextResponse.json({
        success: true,
        website: {
          id: String(existing._id),
          shareId: existing.shareId,
          templateId: existing.templateId,
          status: existing.status,
          publicPath: `/w/${existing.shareId}`,
        },
        created: false,
      });
    }

    const doc = await WeddingWebsite.create({
      ownerId: invitation.ownerId || auth.userId,
      eventId: invitation.eventId,
      invitationId: invitation._id,
      shareId: invitation.shareId,
      templateId,
      status: "draft",
      content: {
        coupleNames: invitation.title || "",
        weddingDate: invitation.eventDate
          ? new Date(invitation.eventDate).toISOString().slice(0, 10)
          : "",
        weddingTime: invitation.eventTime || "",
        venueName: invitation.location?.name || "",
        venueAddress: invitation.location?.address || "",
        heroSubtitle: "שמחים להזמין אתכם לחגוג איתנו",
      },
      sections: {},
    });

    return NextResponse.json({
      success: true,
      website: {
        id: String(doc._id),
        shareId: doc.shareId,
        templateId: doc.templateId,
        status: doc.status,
        publicPath: `/w/${doc.shareId}`,
      },
      created: true,
    });
  } catch (err: any) {
    console.error("[wedding-website POST]", err);
    if (err?.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Wedding website already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
