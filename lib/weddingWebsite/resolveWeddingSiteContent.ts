import { WEDDING_DEMO_CONTENT } from "@/config/weddingWebsite/demoContent";
import { getWeddingTemplate } from "@/config/weddingWebsite/templates";
import type {
  WeddingSiteContent,
  WeddingTemplateId,
} from "@/types/weddingWebsite";

function cleanStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function cleanStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(cleanStr).filter(Boolean);
}

function asNumberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function buildMapsUrl(address: string, lat: number | null, lng: number | null) {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return "";
}

function buildWazeUrl(address: string, lat: number | null, lng: number | null) {
  if (lat != null && lng != null) {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }
  if (address) {
    return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
  }
  return "";
}

type InvitationLike = {
  title?: string;
  eventDate?: string | Date | null;
  eventTime?: string | null;
  location?: {
    name?: string;
    address?: string;
    lat?: number | null;
    lng?: number | null;
  } | null;
  publicEventPage?: {
    schedule?: {
      enabled?: boolean;
      items?: { time?: string; title?: string; description?: string }[];
    };
    parking?: {
      enabled?: boolean;
      name?: string;
      address?: string;
      instructions?: string;
    };
    gifts?: {
      creditUrl?: string;
      payboxUrl?: string;
      bitPhone?: string;
      bitUrl?: string;
    };
    coupleImage?: { enabled?: boolean; url?: string };
    note?: { enabled?: boolean; text?: string };
  } | null;
  giftOptions?: {
    creditUrl?: string;
    payboxUrl?: string;
  } | null;
};

type EventLike = {
  title?: string;
  date?: string | Date | null;
  time?: string | null;
  location?: {
    address?: string;
    lat?: number | null;
    lng?: number | null;
  } | null;
  giftCreditUrl?: string | null;
  venueHallName?: string | null;
};

type ContentOverrides = Partial<WeddingSiteContent> | null | undefined;

function formatDateInput(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") {
    // already YYYY-MM-DD or ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return "";
}

function formatTimeInput(value: unknown): string {
  const s = cleanStr(value);
  if (!s) return "";
  // HH:mm or HH:mm:ss
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return s;
}

/**
 * Merge WeddingWebsite content overrides with real Invitation + Event data.
 * Never invents couple names / dates when real data exists.
 */
export function resolveWeddingSiteContent(params: {
  invitation: InvitationLike;
  event?: EventLike | null;
  overrides?: ContentOverrides;
  templateId?: WeddingTemplateId | string;
}): WeddingSiteContent {
  const { invitation, event, overrides, templateId } = params;
  const o = overrides || {};
  const template = templateId ? getWeddingTemplate(String(templateId)) : null;

  const inviteDate = formatDateInput(invitation.eventDate);
  const eventDate = formatDateInput(event?.date);
  const weddingDate =
    cleanStr(o.weddingDate) || inviteDate || eventDate || "";

  const weddingTime =
    cleanStr(o.weddingTime) ||
    formatTimeInput(invitation.eventTime) ||
    formatTimeInput(event?.time) ||
    "";

  const coupleNames =
    cleanStr(o.coupleNames) ||
    cleanStr(invitation.title) ||
    cleanStr(event?.title) ||
    "";

  const venueName =
    cleanStr(o.venueName) ||
    cleanStr(invitation.location?.name) ||
    cleanStr(event?.venueHallName) ||
    "";

  const venueAddress =
    cleanStr(o.venueAddress) ||
    cleanStr(invitation.location?.address) ||
    cleanStr(event?.location?.address) ||
    "";

  const venueLat =
    o.venueLat ??
    asNumberOrNull(invitation.location?.lat) ??
    asNumberOrNull(event?.location?.lat);

  const venueLng =
    o.venueLng ??
    asNumberOrNull(invitation.location?.lng) ??
    asNumberOrNull(event?.location?.lng);

  const scheduleFromOverride = Array.isArray(o.schedule) ? o.schedule : null;
  const scheduleFromInvite =
    invitation.publicEventPage?.schedule?.enabled &&
    Array.isArray(invitation.publicEventPage.schedule.items)
      ? invitation.publicEventPage.schedule.items.map((item) => ({
          time: cleanStr(item?.time),
          title: cleanStr(item?.title),
          description: cleanStr(item?.description),
        }))
      : [];

  const transportationFromOverride = Array.isArray(o.transportation)
    ? o.transportation
    : null;

  const parking = invitation.publicEventPage?.parking;
  const transportationFromInvite: WeddingSiteContent["transportation"] = [];
  if (parking?.enabled) {
    const bits = [
      cleanStr(parking.name),
      cleanStr(parking.address),
      cleanStr(parking.instructions),
    ].filter(Boolean);
    if (bits.length) {
      transportationFromInvite.push({
        title: "חנייה",
        description: bits.join(" · "),
      });
    }
  }

  const gifts = invitation.publicEventPage?.gifts || {};
  const giftOptions = invitation.giftOptions || {};

  const galleryUrls =
    cleanStrArray(o.galleryUrls).length > 0
      ? cleanStrArray(o.galleryUrls)
      : invitation.publicEventPage?.coupleImage?.enabled &&
          cleanStr(invitation.publicEventPage.coupleImage.url)
        ? [cleanStr(invitation.publicEventPage.coupleImage.url)]
        : template?.galleryImages || [];

  const heroImageUrl =
    cleanStr(o.heroImageUrl) ||
    (invitation.publicEventPage?.coupleImage?.enabled
      ? cleanStr(invitation.publicEventPage.coupleImage.url)
      : "") ||
    template?.heroImage ||
    "";

  const storyParagraphs =
    Array.isArray(o.storyParagraphs) && o.storyParagraphs.length > 0
      ? o.storyParagraphs.map(cleanStr).filter(Boolean)
      : [];

  const faq =
    Array.isArray(o.faq) && o.faq.length > 0
      ? o.faq.map((f) => ({
          question: cleanStr(f?.question),
          answer: cleanStr(f?.answer),
        }))
      : [];

  const noteText =
    invitation.publicEventPage?.note?.enabled !== false
      ? cleanStr(invitation.publicEventPage?.note?.text)
      : "";

  const content: WeddingSiteContent = {
    coupleNames,
    coupleShort:
      cleanStr(o.coupleShort) ||
      coupleNames
        .split(/&|ו/)
        .map((s) => s.trim().charAt(0))
        .filter(Boolean)
        .join(" & "),
    weddingDate,
    weddingTime,
    venueName,
    venueAddress,
    venueLat,
    venueLng,
    heroSubtitle: cleanStr(o.heroSubtitle),
    invitationText: cleanStr(o.invitationText) || noteText,
    storyParagraphs,
    howWeMet: cleanStr(o.howWeMet),
    proposalStory: cleanStr(o.proposalStory),
    schedule:
      scheduleFromOverride && scheduleFromOverride.length > 0
        ? scheduleFromOverride.map((s) => ({
            time: cleanStr(s?.time),
            title: cleanStr(s?.title),
            description: cleanStr(s?.description),
          }))
        : scheduleFromInvite,
    dressCode: cleanStr(o.dressCode),
    accommodations: Array.isArray(o.accommodations)
      ? o.accommodations.map((a) => ({
          name: cleanStr(a?.name),
          note: cleanStr(a?.note),
          link: cleanStr(a?.link),
        }))
      : [],
    transportation:
      transportationFromOverride && transportationFromOverride.length > 0
        ? transportationFromOverride.map((t) => ({
            title: cleanStr(t?.title),
            description: cleanStr(t?.description),
          }))
        : transportationFromInvite,
    faq,
    giftsNote: cleanStr(o.giftsNote),
    giftLinks: {
      creditUrl:
        cleanStr(gifts.creditUrl) ||
        cleanStr(giftOptions.creditUrl) ||
        cleanStr(event?.giftCreditUrl),
      payboxUrl: cleanStr(gifts.payboxUrl) || cleanStr(giftOptions.payboxUrl),
      bitPhone: cleanStr(gifts.bitPhone),
      bitUrl: cleanStr(gifts.bitUrl),
    },
    contactPhone: cleanStr(o.contactPhone),
    contactNote: cleanStr(o.contactNote),
    galleryUrls,
    heroImageUrl,
    guestbookMessages: Array.isArray(o.guestbookMessages)
      ? o.guestbookMessages
      : [],
    playlistNote: cleanStr(o.playlistNote),
    footerNote: cleanStr(o.footerNote),
    wazeUrl: buildWazeUrl(venueAddress || venueName, venueLat, venueLng),
    mapsUrl: buildMapsUrl(venueAddress || venueName, venueLat, venueLng),
  };

  return content;
}

/** Demo gallery only — never used for published customer sites */
export function getDemoWeddingSiteContent(
  templateId?: string
): WeddingSiteContent {
  const template = templateId ? getWeddingTemplate(templateId) : null;
  return {
    ...WEDDING_DEMO_CONTENT,
    galleryUrls:
      WEDDING_DEMO_CONTENT.galleryUrls.length > 0
        ? WEDDING_DEMO_CONTENT.galleryUrls
        : template?.galleryImages || [],
    heroImageUrl:
      WEDDING_DEMO_CONTENT.heroImageUrl || template?.heroImage || "",
  };
}
