import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { canManageInvitation } from "@/lib/canManageInvitation";
import { getInvitationRsvpSiteMode } from "@/lib/guestInviteUrl";
import { hasWeddingWebsiteFeature } from "@/lib/features/entitlements";
import { isPersonalRsvpSite } from "@/types/rsvpSite";
import { serializeWeddingWebsite } from "@/lib/weddingWebsite/content";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await db();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const invitation = body?.invitationId
      ? await Invitation.findById(body.invitationId).lean()
      : await Invitation.findOne({ ownerId: auth.userId }).sort({ updatedAt: -1 }).lean();

    if (!invitation || !canManageInvitation(auth, invitation)) {
      return NextResponse.json({ success: false, error: "INVITATION_NOT_FOUND" }, { status: 404 });
    }

    const owner = invitation.ownerId
      ? await User.findById(invitation.ownerId).select("rsvpSiteMode guestExperienceType features").lean()
      : null;
    const rsvpSiteMode = getInvitationRsvpSiteMode(invitation);
    if (!hasWeddingWebsiteFeature(owner) && !isPersonalRsvpSite(rsvpSiteMode)) {
      return NextResponse.json({ success: false, error: "WEDDING_WEBSITE_NOT_ENABLED" }, { status: 403 });
    }

    const draft = serializeWeddingWebsite(invitation, { draft: true });
    const updated = await Invitation.findByIdAndUpdate(
      invitation._id,
      {
        $set: {
          "weddingWebsite.templateId": draft.templateId,
          "weddingWebsite.draftContent": draft.draftContent,
          "weddingWebsite.content": draft.draftContent,
          "weddingWebsite.published": true,
        },
      },
      { new: true }
    ).lean();

    return NextResponse.json({
      success: true,
      weddingWebsite: serializeWeddingWebsite(updated || invitation),
      publicPath: `/w/${updated?.shareId || invitation.shareId}`,
    });
  } catch (error) {
    console.error("WEDDING WEBSITE PUBLISH FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
