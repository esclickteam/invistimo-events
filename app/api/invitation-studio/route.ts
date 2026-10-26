import { NextResponse } from "next/server";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import InvitationStudioDesign from "@/models/InvitationStudioDesign";
import { entitlementFor, readStudioAuth } from "@/lib/invitationStudio/access";
import { readMergedCatalog, readMergedPlates, readStudioSettings } from "@/lib/invitationStudio/store";
import {
  DESIGNED_INVITATION_DESCRIPTION,
  DESIGNED_INVITATION_LABEL,
  packageIncludesDigitalInvitation,
} from "@/lib/invitationStudio/entitlement";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await readStudioAuth(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const [templates, plates, settings, invitation, designs] = await Promise.all([
    readMergedCatalog(),
    readMergedPlates(),
    readStudioSettings(),
    Invitation.findOne({ ownerId: session.user._id, standaloneGame: { $ne: true } })
      .sort({ updatedAt: -1 })
      .select("title eventType eventDate eventTime location shareId eventId")
      .lean(),
    InvitationStudioDesign.find({ ownerId: session.user._id })
      .sort({ updatedAt: -1 })
      .select("templateId status invitationId updatedAt publishedAt snapshot.name snapshot.category")
      .lean(),
  ]);

  let event = null;
  if (invitation?.eventId) {
    event = await Event.findById(invitation.eventId)
      .select("title eventType date time location venue")
      .lean();
  }

  const entitlement = entitlementFor(session.user);

  return NextResponse.json({
    success: true,
    plates: plates.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      style: item.style,
      description: item.description,
      free: item.free,
      sort: item.sort,
      animation: item.animation,
      art: item.art,
      durationMs: item.durationMs,
      ink: item.ink,
      muted: item.muted,
      accent: item.accent,
      nameFont: item.nameFont,
      textFont: item.textFont,
      inset: item.inset,
      medallion: item.medallion,
      details: item.details,
      defaultMusic: item.defaultMusic,
    })),
    templates: templates.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      style: item.style,
      description: item.description,
      free: item.free,
      sort: item.sort,
      motion: item.motion,
      formats: item.formats,
      preview: {
        capturedAt: item.id,
        templateId: item.id,
        templateVersion: item.version,
        name: item.name,
        category: item.category,
        style: item.style,
        free: item.free,
        width: item.width,
        height: item.height,
        motion: item.motion,
        formats: item.formats,
        background: item.background,
        palette: item.palette,
        layers: item.layers,
        content: item.defaultContent,
        layerOverrides: {},
        images: item.defaultImages || {},
        personalGreeting: false,
        fontFace: item.fontFace || null,
      },
    })),
    settings: {
      priceIls: settings.priceIls,
      musicLabel: settings.music.label,
      label: DESIGNED_INVITATION_LABEL,
      description: DESIGNED_INVITATION_DESCRIPTION,
      includedInCurrentPackages: packageIncludesDigitalInvitation("messages"),
    },
    entitlement,
    invitation,
    event,
    designs,
  });
}
