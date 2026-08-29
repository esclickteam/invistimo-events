import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { applyUserRsvpSiteMode } from "@/lib/weddingWebsite/rsvpSiteMode";
import { serializeWeddingWebsite } from "@/lib/weddingWebsite/content";
import { buildGuestInviteUrl } from "@/lib/guestInviteUrl";
import { normalizeRsvpSiteMode } from "@/types/rsvpSite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminContext(auth)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const users = await User.find({
      role: "user",
      $or: [
        { rsvpSiteMode: "personal" },
        { guestExperienceType: "wedding_website" },
        { "features.weddingWebsite": true },
      ],
    })
      .select("name email phone rsvpSiteMode guestExperienceType features eventDate createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    const userIds = users.map((user) => user._id);
    const invitations = userIds.length
      ? await Invitation.find({ ownerId: { $in: userIds } })
          .select("ownerId title shareId eventDate eventTime location invitationSettings weddingWebsite createdAt updatedAt")
          .sort({ updatedAt: -1 })
          .lean()
      : [];

    const invitationsByOwner = new Map<string, any>();
    for (const invitation of invitations) {
      const ownerId = String(invitation.ownerId);
      if (!invitationsByOwner.has(ownerId)) {
        invitationsByOwner.set(ownerId, invitation);
      }
    }

    const items = users.map((user) => {
      const invitation = invitationsByOwner.get(String(user._id));
      const website = invitation ? serializeWeddingWebsite(invitation) : null;

      return {
        userId: String(user._id),
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        rsvpSiteMode: "personal" as const,
        guestExperienceType: "wedding_website" as const,
        features: {
          weddingWebsite: true,
          guestMessages: user.features?.guestMessages !== false,
        },
        invitationId: invitation ? String(invitation._id) : null,
        invitationTitle: invitation?.title || "",
        coupleNames: invitation?.title || user.name || "",
        shareId: invitation?.shareId || "",
        eventDate: invitation?.eventDate || user.eventDate || null,
        templateId: website?.templateId || null,
        status: website?.published === false ? "draft" : "published",
        published: website?.published ?? false,
        createdAt: invitation?.createdAt || user.createdAt || null,
        updatedAt: invitation?.updatedAt || user.updatedAt || null,
        publicPath: invitation?.shareId ? `/w/${invitation.shareId}` : null,
        publicUrl: invitation?.shareId
          ? buildGuestInviteUrl({
              shareId: invitation.shareId,
              rsvpSiteMode: "personal",
            })
          : null,
        editorPath: "/dashboard/wedding-website",
      };
    });

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("ADMIN WEDDING WEBSITES GET FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdminContext(auth)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const userId = String(body?.userId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const rsvpSiteMode = normalizeRsvpSiteMode(
      body?.guestExperienceType ?? body?.rsvpSiteMode
    );

    const user = userId
      ? await User.findById(userId).select("_id name email")
      : email
        ? await User.findOne({ email }).select("_id name email")
        : null;

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND", message: "לא נמצא לקוח" },
        { status: 404 }
      );
    }

    const result = await applyUserRsvpSiteMode({
      userId: String(user._id),
      rsvpSiteMode,
      guestExperienceType: body?.guestExperienceType,
    });

    if (body?.templateId && result?.rsvpSiteMode === "personal") {
      await Invitation.updateMany(
        { ownerId: user._id },
        { $set: { "weddingWebsite.templateId": String(body.templateId) } }
      );
    }

    return NextResponse.json({
      success: true,
      userId: String(user._id),
      name: user.name,
      email: user.email,
      rsvpSiteMode: result?.rsvpSiteMode || rsvpSiteMode,
      guestExperienceType: result?.guestExperienceType,
      features: result?.features,
      invitationsUpdated: result?.invitationsUpdated || 0,
    });
  } catch (error) {
    console.error("ADMIN WEDDING WEBSITES POST FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
