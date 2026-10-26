import { NextResponse } from "next/server";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import InvitationStudioTestMessage from "@/models/InvitationStudioTestMessage";
import {
  entitlementFor,
  loadOwnedDesign,
  readStudioAuth,
} from "@/lib/invitationStudio/access";
import { canPublishOrExport } from "@/lib/invitationStudio/entitlement";
import {
  isAllowedImageSource,
  publicSnapshot,
  renderSnapshot,
} from "@/lib/invitationStudio/render";
import { renderModelToSvg } from "@/lib/invitationStudio/svg";
import { applyPlateChrome, getPlate } from "@/lib/invitationStudio/plates";
import { sanitizeDetails } from "@/lib/invitationStudio/details";
import { readMergedPlates } from "@/lib/invitationStudio/store";
import type { StudioContent, StudioMusic, TextRole } from "@/lib/invitationStudio/types";

export const dynamic = "force-dynamic";

const ROLES: TextRole[] = [
  "kicker",
  "hostNames",
  "eventType",
  "wording",
  "hebrewDate",
  "gregorianDate",
  "receptionTime",
  "ceremonyTime",
  "venueName",
  "venueAddress",
  "guestGreeting",
];

const HEX = /^#[0-9a-fA-F]{6}$/;

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\u0000/g, "").slice(0, 280);
}

function sanitizeMusic(raw: unknown, current?: StudioMusic): StudioMusic | undefined {
  if (!raw || typeof raw !== "object") return current;
  const source = raw as Record<string, unknown>;
  const mode = source.mode === "library" || source.mode === "upload" ? source.mode : "none";
  const dataUrl = String(source.dataUrl || "");
  const allowedAudio = /^data:audio\/(mpeg|wav|webm|mp4|x-m4a);base64,[a-z0-9+/=\s]+$/i.test(dataUrl);
  if (mode === "upload" && (!source.rightsConfirmed || !allowedAudio || dataUrl.length > 2_200_000)) {
    return current;
  }
  const start = Math.max(0, Number(source.start) || 0);
  const end = Math.max(start, Number(source.end) || 0);
  return {
    mode,
    cueId: mode === "library" ? "evening-motif" : undefined,
    dataUrl: mode === "upload" && allowedAudio ? dataUrl : undefined,
    start,
    end,
    fadeIn: Math.min(4, Math.max(0, Number(source.fadeIn) || 0)),
    fadeOut: Math.min(4, Math.max(0, Number(source.fadeOut) || 0)),
    volume: Math.min(1, Math.max(0, Number(source.volume) || 0.8)),
    sync: source.sync === "names" || source.sync === "details" ? source.sync : "start",
    rightsConfirmed: Boolean(source.rightsConfirmed),
  };
}

function sanitizeContent(raw: unknown, current: StudioContent): StudioContent {
  const next = { ...(current || {}) } as StudioContent;
  if (!raw || typeof raw !== "object") return next;
  for (const role of ROLES) {
    if (role in (raw as object)) next[role] = cleanText((raw as StudioContent)[role]);
  }
  return next;
}

function sanitizePalette(raw: unknown, current: Record<string, string>) {
  const next = { ...current };
  if (!raw || typeof raw !== "object") return next;
  for (const key of ["paper", "ink", "accent", "muted", "deep"]) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && HEX.test(value)) next[key] = value;
  }
  return next;
}

function sanitizeOverrides(raw: unknown, layerIds: Set<string>) {
  const next: Record<string, Record<string, unknown>> = {};
  if (!raw || typeof raw !== "object") return next;
  for (const [id, value] of Object.entries(raw as Record<string, any>)) {
    if (!layerIds.has(id) || !value || typeof value !== "object") continue;
    const patch: Record<string, unknown> = {};
    for (const key of ["x", "y", "w", "h", "fontSize", "letterSpacing"]) {
      const number = Number(value[key]);
      if (Number.isFinite(number)) patch[key] = Math.round(number * 100) / 100;
    }
    if (typeof value.color === "string" && HEX.test(value.color)) patch.color = value.color;
    if (typeof value.fill === "string" && HEX.test(value.fill)) patch.fill = value.fill;
    if (typeof value.fontFamily === "string" && value.fontFamily.length <= 40) {
      patch.fontFamily = value.fontFamily;
    }
    if (value.align === "right" || value.align === "center" || value.align === "left") {
      patch.align = value.align;
    }
    if (Object.keys(patch).length) next[id] = patch;
  }
  return next;
}

function sanitizeImages(raw: unknown) {
  const images: { photo?: string; background?: string } = {};
  if (!raw || typeof raw !== "object") return images;
  for (const key of ["photo", "background"] as const) {
    const value = String((raw as Record<string, unknown>)[key] || "");
    if (!value) continue;
    if (!isAllowedImageSource(value)) continue;
    images[key] = value;
  }
  return images;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await readStudioAuth(req);
  if (!session) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await context.params;
  const design = await loadOwnedDesign(id, String(session.user._id));
  if (design === "forbidden") return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  if (!design) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });

  const entitlement = entitlementFor(session.user);
  const allowed = canPublishOrExport({
    entitled: entitlement.entitled,
    templateFree: Boolean(design.snapshot?.free),
  });
  const url = new URL(req.url);
  if (url.searchParams.get("export") === "svg") {
    if (!allowed) {
      return NextResponse.json({ success: false, error: "ENTITLEMENT_REQUIRED" }, { status: 403 });
    }
    const svg = renderModelToSvg(renderSnapshot(design.snapshot));
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  let shareId = "";
  if (design.invitationId) {
    const invitation = await Invitation.findOne({
      _id: design.invitationId,
      ownerId: session.user._id,
    }).select("shareId");
    shareId = String(invitation?.shareId || "");
  }

  return NextResponse.json({
    success: true,
    design: {
      id: String(design._id),
      templateId: design.templateId,
      status: design.status,
      invitationId: design.invitationId ? String(design.invitationId) : "",
      snapshot: design.snapshot,
      publishedAt: design.publishedAt,
    },
    shareId,
    entitlement,
    canPublish: allowed && Boolean(design.invitationId),
    canExport: allowed,
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await readStudioAuth(req);
  if (!session) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await context.params;
  const design = await loadOwnedDesign(id, String(session.user._id));
  if (design === "forbidden") return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  if (!design) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const snapshot = design.snapshot || {};
  if (snapshot.plate && body?.templateId) {
    const plates = await readMergedPlates();
    const allowed = plates.some((item) => item.id === String(body.templateId));
    const plate = allowed ? getPlate(String(body.templateId)) : null;
    if (plate) {
      if (body.details) snapshot.plate.details = sanitizeDetails(body.details, snapshot.plate.details);
      const swapped = applyPlateChrome(snapshot, plate);
      design.templateId = plate.id;
      design.snapshot = swapped;
      design.markModified("snapshot");
      await design.save();
      return NextResponse.json({ success: true, templateId: plate.id });
    }
  }
  if (snapshot.plate && body?.details) {
    snapshot.plate.details = sanitizeDetails(body.details, snapshot.plate.details);
    const speed = Number(body.speed);
    if (Number.isFinite(speed)) snapshot.plate.speed = Math.min(1.6, Math.max(0.6, speed));
  }
  if (body?.music) snapshot.music = sanitizeMusic(body.music, snapshot.music);
  const layerIds = new Set<string>((snapshot.layers || []).map((layer: { id: string }) => layer.id));
  if (body.content) snapshot.content = sanitizeContent(body.content, snapshot.content);
  if (body.palette) snapshot.palette = sanitizePalette(body.palette, snapshot.palette);
  if (body.layerOverrides) snapshot.layerOverrides = sanitizeOverrides(body.layerOverrides, layerIds);
  if (body.images) snapshot.images = sanitizeImages(body.images);
  if ("personalGreeting" in body) snapshot.personalGreeting = Boolean(body.personalGreeting);
  design.snapshot = snapshot;
  design.markModified("snapshot");
  await design.save();

  return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await readStudioAuth(req);
  if (!session) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await context.params;
  const design = await loadOwnedDesign(id, String(session.user._id));
  if (design === "forbidden") return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  if (!design) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  const entitlement = entitlementFor(session.user);
  const allowed = canPublishOrExport({
    entitled: entitlement.entitled,
    templateFree: Boolean(design.snapshot?.free),
  });

  if (action === "unpublish") {
    design.status = "draft";
    design.publishedAt = null;
    await design.save();
    if (design.invitationId) {
      await Invitation.updateOne(
        { _id: design.invitationId, ownerId: session.user._id, "studioDesign.designId": String(design._id) },
        { $unset: { studioDesign: "" } }
      );
    }
    return NextResponse.json({ success: true, status: "draft" });
  }

  if (action === "publish") {
    if (!allowed) {
      return NextResponse.json({ success: false, error: "ENTITLEMENT_REQUIRED" }, { status: 403 });
    }
    if (!design.invitationId) {
      return NextResponse.json({ success: false, error: "INVITATION_REQUIRED" }, { status: 409 });
    }
    const invitation = await Invitation.findOne({
      _id: design.invitationId,
      ownerId: session.user._id,
    }).select("_id shareId");
    if (!invitation) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }
    const publishedAt = new Date();
    const snapshot = publicSnapshot(design.snapshot);
    await Invitation.updateOne(
      { _id: invitation._id, ownerId: session.user._id },
      {
        $set: {
          studioDesign: {
            designId: String(design._id),
            templateId: design.templateId,
            publishedAt,
            snapshot,
          },
        },
      }
    );
    design.status = "published";
    design.publishedAt = publishedAt;
    design.markModified("snapshot");
    await design.save();
    return NextResponse.json({
      success: true,
      status: "published",
      shareId: invitation.shareId,
    });
  }

  if (action === "test-message") {
    if (design.status !== "published") {
      return NextResponse.json({ success: false, error: "NOT_PUBLISHED" }, { status: 409 });
    }
    const invitation = await Invitation.findOne({
      _id: design.invitationId,
      ownerId: session.user._id,
    }).select("_id shareId");
    if (!invitation?.shareId) {
      return NextResponse.json({ success: false, error: "INVITATION_REQUIRED" }, { status: 409 });
    }
    const guest = body?.guestId
      ? await InvitationGuest.findOne({
          _id: body.guestId,
          invitationId: invitation._id,
        }).select("_id token name")
      : await InvitationGuest.findOne({ invitationId: invitation._id }).select("_id token name");
    if (!guest?.token) {
      return NextResponse.json({ success: false, error: "GUEST_REQUIRED" }, { status: 409 });
    }
    const personalUrl = `/invite/${invitation.shareId}?token=${encodeURIComponent(guest.token)}`;
    await InvitationStudioTestMessage.create({
      ownerId: session.user._id,
      invitationId: invitation._id,
      guestId: guest._id,
      channel: "whatsapp",
      personalUrl,
      simulated: true,
      externalSend: false,
    });
    return NextResponse.json({
      success: true,
      simulated: true,
      externalSend: false,
      personalUrl,
      guestName: guest.name,
      message:
        "הודעת בדיקה נשמרה בלי שליחה לספק. הקישור הוא הקישור האישי הקיים של האורח.",
    });
  }

  return NextResponse.json({ success: false, error: "UNKNOWN_ACTION" }, { status: 400 });
}
