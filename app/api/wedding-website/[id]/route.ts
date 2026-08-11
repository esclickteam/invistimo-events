import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import WeddingWebsite from "@/models/WeddingWebsite";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { canManageInvitation } from "@/lib/canManageInvitation";
import { getWeddingTemplateIds } from "@/config/weddingWebsite/templates";

export const dynamic = "force-dynamic";

function cleanStr(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

async function loadManagedWebsite(id: string, req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId) return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };

  await db();
  const website = await WeddingWebsite.findById(id);
  if (!website) {
    return { error: NextResponse.json({ success: false, error: "Not found" }, { status: 404 }) };
  }

  const invitation = await Invitation.findById(website.invitationId).lean();
  if (!invitation || !canManageInvitation(auth, invitation)) {
    return { error: NextResponse.json({ success: false, error: "Not found" }, { status: 404 }) };
  }

  return { website, invitation, auth };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const loaded = await loadManagedWebsite(id, req);
  if ("error" in loaded && loaded.error) return loaded.error;

  const { website } = loaded as any;
  return NextResponse.json({
    success: true,
    website: {
      id: String(website._id),
      shareId: website.shareId,
      templateId: website.templateId,
      status: website.status,
      content: website.content || {},
      sections: website.sections || {},
      themeOverrides: website.themeOverrides || {},
      publishedAt: website.publishedAt,
      publicPath: `/w/${website.shareId}`,
      invitationId: String(website.invitationId),
      eventId: String(website.eventId),
    },
  });
}

/**
 * PATCH — update template, content overrides, section toggles, publish/unpublish.
 * Never mutates Invitation guests, RSVP, canvas, or shareId.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const loaded = await loadManagedWebsite(id, req);
    if ("error" in loaded && loaded.error) return loaded.error;

    const { website } = loaded as any;
    const body = await req.json().catch(() => ({}));

    if (body.templateId !== undefined) {
      const templateId = cleanStr(body.templateId);
      if (!getWeddingTemplateIds().includes(templateId as any)) {
        return NextResponse.json(
          { success: false, error: "Invalid templateId" },
          { status: 400 }
        );
      }
      website.templateId = templateId;
    }

    if (body.content !== undefined && body.content && typeof body.content === "object") {
      const prev = website.content?.toObject?.() || website.content || {};
      website.content = { ...prev, ...body.content };
      website.markModified("content");
    }

    if (body.sections !== undefined && body.sections && typeof body.sections === "object") {
      const prev = website.sections || {};
      website.sections = { ...prev, ...body.sections };
      website.markModified("sections");
    }

    if (
      body.themeOverrides !== undefined &&
      body.themeOverrides &&
      typeof body.themeOverrides === "object"
    ) {
      const prev = website.themeOverrides?.toObject?.() || website.themeOverrides || {};
      website.themeOverrides = { ...prev, ...body.themeOverrides };
      website.markModified("themeOverrides");
    }

    if (body.status !== undefined) {
      const status = cleanStr(body.status);
      if (status !== "draft" && status !== "published") {
        return NextResponse.json(
          { success: false, error: "Invalid status" },
          { status: 400 }
        );
      }
      website.status = status;
      if (status === "published") {
        website.publishedAt = website.publishedAt || new Date();
      }
    }

    await website.save();

    return NextResponse.json({
      success: true,
      website: {
        id: String(website._id),
        shareId: website.shareId,
        templateId: website.templateId,
        status: website.status,
        content: website.content || {},
        sections: website.sections || {},
        themeOverrides: website.themeOverrides || {},
        publishedAt: website.publishedAt,
        publicPath: `/w/${website.shareId}`,
      },
    });
  } catch (err) {
    console.error("[wedding-website PATCH]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
