import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import { canManageInvitation } from "@/lib/canManageInvitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import {
  normalizeWeddingTemplateId,
  serializeWeddingWebsite,
} from "@/lib/weddingWebsite/content";
import { getInvitationRsvpSiteMode } from "@/lib/guestInviteUrl";
import { isPersonalRsvpSite, normalizeRsvpSiteMode } from "@/types/rsvpSite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function findManagedInvitation(auth: any, invitationId?: string | null) {
  if (invitationId) {
    const invitation = await Invitation.findById(invitationId).lean();
    if (invitation && canManageInvitation(auth, invitation)) {
      return invitation;
    }
  }

  const invitation = await Invitation.findOne({ ownerId: auth.userId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  if (invitation && canManageInvitation(auth, invitation)) {
    return invitation;
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const invitationId = req.nextUrl.searchParams.get("invitationId");
    const invitation = await findManagedInvitation(auth, invitationId);
    const owner = invitation
      ? await User.findById(invitation.ownerId).select("name email rsvpSiteMode").lean()
      : await User.findById(auth.userId).select("name email rsvpSiteMode").lean();

    const rsvpSiteMode = invitation
      ? getInvitationRsvpSiteMode(invitation)
      : normalizeRsvpSiteMode((owner as any)?.rsvpSiteMode);

    if (!invitation) {
      return NextResponse.json({
        success: true,
        rsvpSiteMode,
        invitation: null,
        weddingWebsite: null,
      });
    }

    return NextResponse.json({
      success: true,
      rsvpSiteMode,
      enabled: isPersonalRsvpSite(rsvpSiteMode),
      invitation: {
        _id: String(invitation._id),
        shareId: invitation.shareId,
        title: invitation.title || "",
        eventDate: invitation.eventDate || null,
        eventTime: invitation.eventTime || "",
      },
      weddingWebsite: serializeWeddingWebsite(invitation),
      publicPath: isPersonalRsvpSite(rsvpSiteMode) ? `/w/${invitation.shareId}` : null,
    });
  } catch (error) {
    console.error("WEDDING WEBSITE GET FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const invitation = await findManagedInvitation(auth, body?.invitationId);

    if (!invitation) {
      return NextResponse.json({ success: false, error: "INVITATION_NOT_FOUND" }, { status: 404 });
    }

    const rsvpSiteMode = getInvitationRsvpSiteMode(invitation);
    if (!isPersonalRsvpSite(rsvpSiteMode)) {
      return NextResponse.json(
        {
          success: false,
          error: "WEDDING_WEBSITE_NOT_ENABLED",
          message: "אתר חתונה אישי לא פתוח ללקוח הזה",
        },
        { status: 403 }
      );
    }

    const current = serializeWeddingWebsite(invitation);
    const nextWebsite = {
      templateId: normalizeWeddingTemplateId(
        body?.templateId ?? body?.weddingWebsite?.templateId ?? current.templateId
      ),
      published:
        typeof (body?.published ?? body?.weddingWebsite?.published) === "boolean"
          ? Boolean(body?.published ?? body?.weddingWebsite?.published)
          : current.published,
      content: {
        ...current.content,
        ...(body?.content || body?.weddingWebsite?.content || {}),
      },
    };

    const updated = await Invitation.findByIdAndUpdate(
      invitation._id,
      { $set: { weddingWebsite: nextWebsite } },
      { new: true }
    ).lean();

    return NextResponse.json({
      success: true,
      rsvpSiteMode,
      invitation: {
        _id: String(updated?._id || invitation._id),
        shareId: updated?.shareId || invitation.shareId,
        title: updated?.title || invitation.title || "",
      },
      weddingWebsite: serializeWeddingWebsite(updated || invitation),
      publicPath: `/w/${updated?.shareId || invitation.shareId}`,
    });
  } catch (error) {
    console.error("WEDDING WEBSITE PATCH FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
