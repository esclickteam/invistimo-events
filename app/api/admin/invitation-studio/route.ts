import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import InvitationStudioDesign from "@/models/InvitationStudioDesign";
import InvitationStudioTemplate from "@/models/InvitationStudioTemplate";
import User from "@/models/User";
import { isStudioAdmin, readStudioAuth } from "@/lib/invitationStudio/access";
import { mergeCatalog } from "@/lib/invitationStudio/catalog";
import { mergePlates } from "@/lib/invitationStudio/plateCatalog";
import { STUDIO_CATEGORIES, STUDIO_STYLES } from "@/lib/invitationStudio/types";
import { clone } from "@/lib/invitationStudio/render";
import { getPlate } from "@/lib/invitationStudio/plates";
import {
  clearMusicLibraryUpload,
  readOverrides,
  readStudioSettings,
  writeMusicLibrary,
  writePlateOverride,
  writeStudioPrice,
} from "@/lib/invitationStudio/store";

export const dynamic = "force-dynamic";

function deny(session: Awaited<ReturnType<typeof readStudioAuth>>) {
  if (!session) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  if (!isStudioAdmin(session.auth)) {
    return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  }
  return null;
}

export async function GET(req: Request) {
  const session = await readStudioAuth(req);
  const denied = deny(session);
  if (denied) return denied;

  const [overrides, settings, usage] = await Promise.all([
    readOverrides(),
    readStudioSettings(),
    InvitationStudioDesign.aggregate([
      { $group: { _id: "$templateId", count: { $sum: 1 } } },
    ]),
  ]);
  const counts = new Map(usage.map((row) => [String(row._id), row.count]));
  const templates = mergeCatalog(overrides).map((item) => ({
    ...item,
    usageCount: counts.get(item.id) || 0,
  }));
  const plates = mergePlates(settings.plates).map((item) => ({
    ...item,
    usageCount: counts.get(item.id) || 0,
  }));

  return NextResponse.json({
    success: true,
    templates,
    plates,
    settings: {
      ...settings,
      music: {
        ...settings.music,
        dataUrl: undefined,
        hasUpload: Boolean(settings.music.dataUrl),
      },
    },
  });
}

export async function PUT(req: Request) {
  const session = await readStudioAuth(req);
  const denied = deny(session);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const settings = await writeStudioPrice(body?.priceIls);
  return NextResponse.json({ success: true, settings });
}

export async function POST(req: Request) {
  const session = await readStudioAuth(req);
  const denied = deny(session);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  if (action === "save-plate") {
    const key = String(body?.id || "");
    if (!getPlate(key)) {
      return NextResponse.json({ success: false, error: "PLATE_NOT_FOUND" }, { status: 404 });
    }
    const settings = await writePlateOverride({
      key,
      hidden: Boolean(body?.hidden),
      free: typeof body?.free === "boolean" ? body.free : null,
      sort: body?.sort == null ? null : Number(body.sort),
      name: typeof body?.name === "string" ? body.name : null,
      description: typeof body?.description === "string" ? body.description : null,
      defaultMusic: typeof body?.defaultMusic === "boolean" ? body.defaultMusic : null,
    });
    return NextResponse.json({ success: true, settings });
  }

  if (action === "save-music") {
    try {
      if (body?.clearUpload) {
        const settings = await clearMusicLibraryUpload();
        return NextResponse.json({ success: true, settings });
      }
      const settings = await writeMusicLibrary({
        label: typeof body?.label === "string" ? body.label : undefined,
        dataUrl: typeof body?.dataUrl === "string" ? body.dataUrl : undefined,
        fileName: typeof body?.fileName === "string" ? body.fileName : undefined,
        rightsConfirmed: Boolean(body?.rightsConfirmed),
      });
      return NextResponse.json({
        success: true,
        settings: {
          ...settings,
          music: { ...settings.music, dataUrl: undefined, hasUpload: Boolean(settings.music.dataUrl) },
        },
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "MUSIC_FAILED";
      return NextResponse.json({ success: false, error: code }, { status: 400 });
    }
  }

  if (action === "entitlement") {
    const email = String(body?.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return NextResponse.json({ success: false, error: "USER_NOT_FOUND" }, { status: 404 });
    user.designedInvitationEnabled = Boolean(body?.enabled);
    await user.save();
    return NextResponse.json({
      success: true,
      email,
      designedInvitationEnabled: Boolean(user.designedInvitationEnabled),
      charged: false,
    });
  }

  if (action === "duplicate") {
    const overrides = await readOverrides();
    const source = mergeCatalog(overrides).find((item) => item.id === String(body?.fromId || ""));
    if (!source) return NextResponse.json({ success: false, error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
    const copy = clone(source);
    copy.id = `custom-${nanoid(8)}`;
    copy.name = String(body?.name || `${source.name} (עותק)`).slice(0, 80);
    copy.version = 1;
    copy.sort = source.sort + 1;
    await InvitationStudioTemplate.create({
      key: copy.id,
      source: "custom",
      hidden: false,
      free: copy.free,
      sort: copy.sort,
      name: copy.name,
      category: copy.category,
      style: copy.style,
      description: copy.description,
      template: copy,
    });
    return NextResponse.json({ success: true, id: copy.id });
  }

  if (action === "save") {
    const key = String(body?.id || "");
    const overrides = await readOverrides();
    const current = mergeCatalog(overrides).find((item) => item.id === key);
    if (!current) return NextResponse.json({ success: false, error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
    if (body?.fontFace && body.fontFace.licenseConfirmed !== true) {
      return NextResponse.json({ success: false, error: "FONT_LICENSE_REQUIRED" }, { status: 400 });
    }
    const dataUrl = String(body?.fontFace?.dataUrl || "");
    const allowedFont =
      dataUrl.startsWith("data:font/woff2;base64,") ||
      dataUrl.startsWith("data:application/font-woff;base64,") ||
      dataUrl.startsWith("data:application/octet-stream;base64,");
    if (dataUrl && !allowedFont) {
      return NextResponse.json({ success: false, error: "FONT_TYPE" }, { status: 400 });
    }
    if (dataUrl.length > 500_000) {
      return NextResponse.json({ success: false, error: "FONT_TOO_LARGE" }, { status: 400 });
    }
    const background = String(body?.backgroundImage || "");
    if (background && !background.startsWith("data:image/")) {
      return NextResponse.json({ success: false, error: "BACKGROUND_TYPE" }, { status: 400 });
    }
    const next = clone(current);
    if (typeof body?.name === "string") next.name = body.name.slice(0, 80);
    if (typeof body?.description === "string") next.description = body.description.slice(0, 240);
    if (STUDIO_CATEGORIES.includes(body?.category)) next.category = body.category;
    if (STUDIO_STYLES.includes(body?.style)) next.style = body.style;
    if (typeof body?.free === "boolean") next.free = body.free;
    if (body?.sort != null && Number.isFinite(Number(body.sort))) next.sort = Number(body.sort);
    if (typeof body?.hidden === "boolean") next.published = !body.hidden;
    next.version = Number(current.version || 1) + 1;
    if (body?.palette && typeof body.palette === "object") {
      for (const token of ["paper", "ink", "accent", "muted", "deep"] as const) {
        if (/^#[0-9a-fA-F]{6}$/.test(String(body.palette[token] || ""))) {
          next.palette[token] = body.palette[token];
        }
      }
    }
    if (dataUrl) {
      next.fontFace = {
        family: String(body.fontFace.family || "Studio Upload").slice(0, 40),
        dataUrl,
      };
    }
    if (background && background.length < 500_000) {
      next.defaultImages = { ...(next.defaultImages || {}), background };
      if (!next.layers.some((layer) => layer.type === "image" && layer.role === "background")) {
        next.layers = [
          {
            id: "uploaded-background",
            type: "image",
            role: "background",
            x: 0,
            y: 0,
            w: next.width,
            h: next.height,
            radius: 0,
          },
          ...next.layers,
        ];
      }
    }
    const existing = await InvitationStudioTemplate.findOne({ key });
    if (existing?.source === "custom") {
      existing.name = next.name;
      existing.category = next.category;
      existing.style = next.style;
      existing.description = next.description;
      existing.free = next.free;
      existing.sort = next.sort;
      existing.hidden = Boolean(body?.hidden);
      existing.template = next;
      existing.markModified("template");
      await existing.save();
    } else {
      await InvitationStudioTemplate.findOneAndUpdate(
        { key },
        {
          $set: {
            key,
            source: "catalog",
            hidden: Boolean(body?.hidden),
            free: next.free,
            sort: next.sort,
            name: next.name,
            category: next.category,
            style: next.style,
            description: next.description,
            template: next,
          },
        },
        { upsert: true }
      );
    }
    return NextResponse.json({ success: true, id: key, version: next.version });
  }

  return NextResponse.json({ success: false, error: "UNKNOWN_ACTION" }, { status: 400 });
}
