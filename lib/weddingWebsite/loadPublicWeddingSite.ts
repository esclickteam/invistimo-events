import db from "@/lib/db";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import WeddingWebsite from "@/models/WeddingWebsite";
import { getWeddingTemplate } from "@/config/weddingWebsite/templates";
import { resolveWeddingSiteContent } from "@/lib/weddingWebsite/resolveWeddingSiteContent";
import type {
  WeddingTemplateId,
  WeddingWebsiteGuestContext,
  WeddingWebsitePublicPayload,
} from "@/types/weddingWebsite";

function cleanStr(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export async function loadPublicWeddingSite(params: {
  shareId: string;
  token?: string | null;
  /** When true, allow draft sites (dashboard preview) */
  allowDraft?: boolean;
}): Promise<WeddingWebsitePublicPayload | null> {
  await db();

  const shareId = cleanStr(params.shareId);
  if (!shareId) return null;

  const website = await WeddingWebsite.findOne({ shareId }).lean();
  if (!website) return null;

  if (!params.allowDraft && website.status !== "published") {
    return null;
  }

  const invitation = await Invitation.findById(website.invitationId).lean();
  if (!invitation) return null;

  const event = website.eventId
    ? await Event.findById(website.eventId).lean()
    : invitation.eventId
      ? await Event.findById(invitation.eventId).lean()
      : null;

  const templateId = (website.templateId || "eternal-gold") as WeddingTemplateId;
  if (!getWeddingTemplate(templateId)) return null;

  const content = resolveWeddingSiteContent({
    invitation: invitation as any,
    event: event as any,
    overrides: (website.content || {}) as any,
    templateId,
  });

  let guest: WeddingWebsiteGuestContext | null = null;
  const token = cleanStr(params.token);
  if (token) {
    const guestDoc = await InvitationGuest.findOne({
      token,
      invitationId: invitation._id,
    }).lean();

    if (guestDoc) {
      const rsvpRaw = cleanStr((guestDoc as any).rsvp || (guestDoc as any).status);
      const rsvp =
        rsvpRaw === "yes" || rsvpRaw === "no" || rsvpRaw === "pending"
          ? rsvpRaw
          : "";

      guest = {
        token,
        name: cleanStr((guestDoc as any).name),
        rsvp,
        guestsCount: Number((guestDoc as any).guestsCount) || 1,
        arrivedCount: Number((guestDoc as any).arrivedCount) || 0,
        notes: cleanStr((guestDoc as any).notes),
        canSubmitRsvp: true,
      };
    }
  }

  const menu = (invitation as any).invitationSettings?.menuOptions || {};

  return {
    shareId,
    templateId,
    status: website.status as "draft" | "published",
    content,
    sections: (website.sections || {}) as any,
    guest,
    invitationId: String(invitation._id),
    eventId: String(website.eventId || invitation.eventId || ""),
    menuOptions: {
      vegetarian: menu.vegetarian === true,
      vegan: menu.vegan === true,
      glutenFree: menu.glutenFree === true,
      childrenMeal: menu.childrenMeal === true,
      kosher: menu.kosher === true,
      kosherGlatt: menu.kosherGlatt === true,
      kosherMahfoud: menu.kosherMahfoud === true,
      transportation: menu.transportation === true,
    },
  };
}
