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
import { getCustomerFeatures, hasWeddingWebsiteFeature } from "@/lib/features/entitlements";
import { resolveWeddingGifts } from "@/lib/weddingWebsite/gifts";

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
    const useDraft = req.nextUrl.searchParams.get("draft") === "1";
    const invitation = await findManagedInvitation(auth, invitationId);
    const owner = invitation
      ? await User.findById(invitation.ownerId)
          .select("name email rsvpSiteMode guestExperienceType features")
          .lean()
      : await User.findById(auth.userId)
          .select("name email rsvpSiteMode guestExperienceType features")
          .lean();

    const rsvpSiteMode = invitation
      ? getInvitationRsvpSiteMode(invitation)
      : normalizeRsvpSiteMode((owner as any)?.rsvpSiteMode);
    const features = getCustomerFeatures(owner);
    const enabled = hasWeddingWebsiteFeature(owner) || isPersonalRsvpSite(rsvpSiteMode);

    if (!invitation) {
      return NextResponse.json({
        success: true,
        rsvpSiteMode,
        features,
        enabled,
        invitation: null,
        weddingWebsite: null,
        gifts: null,
      });
    }

    return NextResponse.json({
      success: true,
      rsvpSiteMode,
      features,
      enabled,
      invitation: {
        _id: String(invitation._id),
        shareId: invitation.shareId,
        title: invitation.title || "",
        eventDate: invitation.eventDate || null,
        eventTime: invitation.eventTime || "",
      },
      weddingWebsite: serializeWeddingWebsite(invitation, { draft: useDraft }),
      gifts: resolveWeddingGifts(invitation),
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

    const owner = invitation.ownerId
      ? await User.findById(invitation.ownerId)
          .select("rsvpSiteMode guestExperienceType features")
          .lean()
      : null;
    const rsvpSiteMode = getInvitationRsvpSiteMode(invitation);
    if (!hasWeddingWebsiteFeature(owner) && !isPersonalRsvpSite(rsvpSiteMode)) {
      return NextResponse.json(
        {
          success: false,
          error: "WEDDING_WEBSITE_NOT_ENABLED",
          message: "אתר חתונה אישי לא פתוח ללקוח הזה",
        },
        { status: 403 }
      );
    }

    const currentPublished = serializeWeddingWebsite(invitation);
    const currentDraft = serializeWeddingWebsite(invitation, { draft: true });
    const templateId = normalizeWeddingTemplateId(
      body?.templateId ?? body?.weddingWebsite?.templateId ?? currentDraft.templateId
    );
    const incomingContent = body?.content || body?.weddingWebsite?.content || {};
    const saveDraft = body?.draft !== false && body?.publish !== true;
    const nextDraftContent = {
      ...currentDraft.draftContent,
      ...incomingContent,
    };

    const $set: Record<string, unknown> = {
      "weddingWebsite.templateId": templateId,
      "weddingWebsite.draftContent": nextDraftContent,
    };

    if (!saveDraft) {
      $set["weddingWebsite.content"] = {
        ...currentPublished.content,
        ...incomingContent,
      };
      if (typeof (body?.published ?? body?.weddingWebsite?.published) === "boolean") {
        $set["weddingWebsite.published"] = Boolean(
          body?.published ?? body?.weddingWebsite?.published
        );
      }
    } else if (typeof (body?.published ?? body?.weddingWebsite?.published) === "boolean") {
      $set["weddingWebsite.published"] = Boolean(
        body?.published ?? body?.weddingWebsite?.published
      );
    }

    if (!invitation.weddingWebsite?.templateId) {
      $set["weddingWebsite.published"] = false;
    }

    const updated = await Invitation.findByIdAndUpdate(
      invitation._id,
      { $set },
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
      weddingWebsite: serializeWeddingWebsite(updated || invitation, { draft: true }),
      publicPath: `/w/${updated?.shareId || invitation.shareId}`,
    });
  } catch (error) {
    console.error("WEDDING WEBSITE PATCH FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
