import { NextResponse } from "next/server";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import InvitationStudioDesign from "@/models/InvitationStudioDesign";
import { readStudioAuth } from "@/lib/invitationStudio/access";
import { contentFromEvent } from "@/lib/invitationStudio/prefill";
import { freezeSnapshot } from "@/lib/invitationStudio/render";
import { readMergedCatalog } from "@/lib/invitationStudio/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await readStudioAuth(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const templateId = String(body?.templateId || "");
  const templates = await readMergedCatalog();
  const template = templates.find((item) => item.id === templateId);
  if (!template) {
    return NextResponse.json({ success: false, error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
  }

  const requestedId = String(body?.invitationId || "");
  const invitation = requestedId
    ? await Invitation.findOne({ _id: requestedId, ownerId: session.user._id }).lean()
    : await Invitation.findOne({ ownerId: session.user._id, standaloneGame: { $ne: true } })
        .sort({ updatedAt: -1 })
        .lean();

  if (requestedId && !invitation) {
    return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const event = invitation?.eventId
    ? await Event.findById(invitation.eventId).lean()
    : null;
  const snapshot = freezeSnapshot(template, {
    content: invitation ? contentFromEvent(template, invitation, event) : undefined,
    personalGreeting: true,
  });

  const design = await InvitationStudioDesign.create({
    ownerId: session.user._id,
    invitationId: invitation?._id || null,
    eventId: invitation?.eventId || null,
    templateId: template.id,
    status: "draft",
    snapshot,
  });

  return NextResponse.json({ success: true, designId: String(design._id) });
}
