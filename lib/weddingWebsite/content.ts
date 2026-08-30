import { WEDDING_DEMO_CONTENT } from "@/config/weddingWebsite/demoContent";
import { parseCoord } from "@/lib/navigationLinks";
import { getWeddingTemplate } from "@/config/weddingWebsite/templates";
import {
  sanitizeWeddingImageUrl,
  sanitizeWeddingImageUrls,
} from "@/lib/weddingWebsite/images";
import { normalizeWeddingMediaSlot } from "@/lib/weddingWebsite/media";
import { sanitizeSectionStyle, sanitizeTextStyle } from "@/lib/weddingWebsite/styles";
import { sanitizeWeddingThemeOverride } from "@/lib/weddingWebsite/editorTheme";
import type {
  WeddingDemoContent,
  WeddingMediaSlot,
  WeddingSectionStyle,
  WeddingTextStyle,
  WeddingTemplateId,
} from "@/types/weddingWebsite";

export const DEFAULT_WEDDING_TEMPLATE_ID: WeddingTemplateId = "eternal-gold";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toIsoDate(value: unknown) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

export function normalizeWeddingTemplateId(value: unknown): WeddingTemplateId {
  const raw = cleanString(value);
  return getWeddingTemplate(raw) ? (raw as WeddingTemplateId) : DEFAULT_WEDDING_TEMPLATE_ID;
}

function normalizeList<T>(
  value: unknown,
  fallback: T[],
  mapItem: (item: any) => T | null
): T[] {
  if (!Array.isArray(value)) return fallback;

  const items = value.map(mapItem).filter(Boolean) as T[];
  return items.length > 0 ? items : fallback;
}

export function createEmptyWeddingWebsite(invitation?: {
  title?: string;
  eventDate?: Date | string | null;
  eventTime?: string;
  location?: { name?: string; address?: string; lat?: number | string | null; lng?: number | string | null };
} | null) {
  return {
    templateId: DEFAULT_WEDDING_TEMPLATE_ID,
    published: true,
    content: seedWeddingWebsiteContent({}, invitation),
  };
}

export function seedWeddingWebsiteContent(
  stored?: Partial<WeddingDemoContent> | null,
  invitation?: {
    title?: string;
    eventDate?: Date | string | null;
    eventTime?: string;
    location?: { name?: string; address?: string; lat?: number | string | null; lng?: number | string | null };
  } | null
): WeddingDemoContent {
  const title = cleanString(invitation?.title);
  const venueName = cleanString(invitation?.location?.name);
  const venueAddress = cleanString(invitation?.location?.address);
  const venueLat = parseCoord(invitation?.location?.lat);
  const venueLng = parseCoord(invitation?.location?.lng);
  const eventDate = toIsoDate(invitation?.eventDate);
  const eventTime = cleanString(invitation?.eventTime);

  const seeded: WeddingDemoContent = {
    ...WEDDING_DEMO_CONTENT,
    coupleNames: title || WEDDING_DEMO_CONTENT.coupleNames,
    coupleShort: title
      ? title
          .split(/[&+|]/)
          .map((part) => part.trim().charAt(0))
          .filter(Boolean)
          .join(" & ")
      : WEDDING_DEMO_CONTENT.coupleShort,
    weddingDate: eventDate || WEDDING_DEMO_CONTENT.weddingDate,
    weddingTime: eventTime || WEDDING_DEMO_CONTENT.weddingTime,
    venueName: venueName || WEDDING_DEMO_CONTENT.venueName,
    venueAddress: venueAddress || WEDDING_DEMO_CONTENT.venueAddress,
    venueLat,
    venueLng,
  };

  return mergeWeddingWebsiteContent(seeded, stored);
}

export function mergeWeddingWebsiteContent(
  base: WeddingDemoContent,
  stored?: Partial<WeddingDemoContent> | null
): WeddingDemoContent {
  const raw = stored && typeof stored === "object" ? stored : {};

  return {
    coupleNames: cleanString(raw.coupleNames) || base.coupleNames,
    coupleShort: cleanString(raw.coupleShort) || base.coupleShort,
    weddingDate: cleanString(raw.weddingDate) || base.weddingDate,
    weddingTime: cleanString(raw.weddingTime) || base.weddingTime,
    venueName: cleanString(raw.venueName) || base.venueName,
    venueAddress: cleanString(raw.venueAddress) || base.venueAddress,
    venueLat: parseCoord((raw as WeddingDemoContent).venueLat) ?? base.venueLat ?? null,
    venueLng: parseCoord((raw as WeddingDemoContent).venueLng) ?? base.venueLng ?? null,
    heroSubtitle: cleanString(raw.heroSubtitle) || base.heroSubtitle,
    invitationText: cleanString(raw.invitationText) || base.invitationText,
    storyParagraphs: normalizeList(
      raw.storyParagraphs,
      base.storyParagraphs,
      (item) => {
        const text = cleanString(item);
        return text || null;
      }
    ),
    howWeMet: cleanString(raw.howWeMet) || base.howWeMet,
    proposalStory: cleanString(raw.proposalStory) || base.proposalStory,
    schedule: normalizeList(
      raw.schedule,
      base.schedule,
      (item) => {
        const title = cleanString(item?.title);
        if (!title) return null;
        return {
          time: cleanString(item?.time),
          title,
          description: cleanString(item?.description),
        };
      }
    ),
    dressCode: cleanString(raw.dressCode) || base.dressCode,
    accommodations: normalizeList(
      raw.accommodations,
      base.accommodations,
      (item) => {
        const name = cleanString(item?.name);
        if (!name) return null;
        return {
          name,
          note: cleanString(item?.note),
          link: cleanString(item?.link) || undefined,
        };
      }
    ),
    transportation: normalizeList(
      raw.transportation,
      base.transportation,
      (item) => {
        const title = cleanString(item?.title);
        if (!title) return null;
        return {
          title,
          description: cleanString(item?.description),
        };
      }
    ),
    faq: normalizeList(raw.faq, base.faq, (item) => {
      const question = cleanString(item?.question);
      if (!question) return null;
      return {
        question,
        answer: cleanString(item?.answer),
      };
    }),
    giftsNote: cleanString(raw.giftsNote) || base.giftsNote,
    guestbookMessages: normalizeList(
      raw.guestbookMessages,
      base.guestbookMessages,
      (item) => {
        const name = cleanString(item?.name);
        const message = cleanString(item?.message);
        if (!name || !message) return null;
        return {
          name,
          message,
          date: cleanString(item?.date),
        };
      }
    ),
    playlistNote: cleanString(raw.playlistNote) || base.playlistNote,
    footerNote: cleanString(raw.footerNote) || base.footerNote,
    guestMessageTitle:
      cleanString(raw.guestMessageTitle) ||
      base.guestMessageTitle ||
      "השאירו לנו כמה מילים ❤️",
    guestMessageDescription:
      cleanString(raw.guestMessageDescription) ||
      base.guestMessageDescription ||
      "נשמח לקרוא ברכה, איחול או הודעה מכם.",
    rsvpTitle: cleanString((raw as WeddingDemoContent).rsvpTitle) || base.rsvpTitle,
    rsvpSubtitle: cleanString((raw as WeddingDemoContent).rsvpSubtitle) || base.rsvpSubtitle,
    transportationTitle:
      cleanString((raw as WeddingDemoContent).transportationTitle) || base.transportationTitle,
    transportationDescription:
      cleanString((raw as WeddingDemoContent).transportationDescription) ||
      base.transportationDescription,
    heroImage: Object.prototype.hasOwnProperty.call(raw, "heroImage")
      ? sanitizeWeddingImageUrl(raw.heroImage)
      : sanitizeWeddingImageUrl(base.heroImage),
    galleryImages: Array.isArray(raw.galleryImages)
      ? sanitizeWeddingImageUrls(raw.galleryImages)
      : Array.isArray(base.galleryImages)
        ? sanitizeWeddingImageUrls(base.galleryImages)
        : undefined,
    media: mergeMediaMap(base.media, (raw as WeddingDemoContent).media),
    styles: mergeStyleMap(base.styles, (raw as WeddingDemoContent).styles),
    mobileStyles: mergeStyleMap(base.mobileStyles, (raw as WeddingDemoContent).mobileStyles),
    sectionStyles: mergeSectionStyleMap(
      base.sectionStyles,
      (raw as WeddingDemoContent).sectionStyles
    ),
    theme:
      sanitizeWeddingThemeOverride((raw as WeddingDemoContent).theme) ??
      sanitizeWeddingThemeOverride(base.theme),
    sectionOrder: Array.isArray((raw as WeddingDemoContent).sectionOrder)
      ? ((raw as WeddingDemoContent).sectionOrder as WeddingDemoContent["sectionOrder"])
      : base.sectionOrder,
    copy: {
      ...(base.copy || {}),
      ...(((raw as WeddingDemoContent).copy && typeof (raw as WeddingDemoContent).copy === "object"
        ? (raw as WeddingDemoContent).copy
        : {}) as Record<string, string>),
    },
    sections: {
      ...(base.sections || {}),
      ...((raw.sections && typeof raw.sections === "object"
        ? raw.sections
        : {}) as WeddingDemoContent["sections"]),
    },
  };
}

export function extractInvitationEventData(invitation?: {
  title?: string;
  eventDate?: Date | string | null;
  eventTime?: string;
  location?: { name?: string; address?: string; lat?: number | string | null; lng?: number | string | null };
} | null) {
  return {
    coupleNames: cleanString(invitation?.title),
    weddingDate: toIsoDate(invitation?.eventDate),
    weddingTime: cleanString(invitation?.eventTime),
    venueName: cleanString(invitation?.location?.name),
    venueAddress: cleanString(invitation?.location?.address),
    venueLat: parseCoord(invitation?.location?.lat),
    venueLng: parseCoord(invitation?.location?.lng),
  };
}

export function applyEventDataToWebsiteContent(
  content: WeddingDemoContent,
  event?: ReturnType<typeof extractInvitationEventData> | null
): WeddingDemoContent {
  if (!event) return content;

  return {
    ...content,
    coupleNames: event.coupleNames || content.coupleNames,
    coupleShort: event.coupleNames
      ? event.coupleNames
          .split(/[&+|]/)
          .map((part) => part.trim().charAt(0))
          .filter(Boolean)
          .join(" & ") || content.coupleShort
      : content.coupleShort,
    weddingDate: event.weddingDate || content.weddingDate,
    weddingTime: event.weddingTime || content.weddingTime,
    venueName: event.venueName || content.venueName,
    venueAddress: event.venueAddress || content.venueAddress,
    venueLat: event.venueLat ?? content.venueLat ?? null,
    venueLng: event.venueLng ?? content.venueLng ?? null,
  };
}

export function serializeWeddingWebsite(
  invitation?: {
    title?: string;
    eventDate?: Date | string | null;
    eventTime?: string;
    location?: { name?: string; address?: string; lat?: number | string | null; lng?: number | string | null };
    weddingWebsite?: {
      templateId?: unknown;
      published?: unknown;
      content?: Partial<WeddingDemoContent> | null;
      draftContent?: Partial<WeddingDemoContent> | null;
    } | null;
  } | null,
  options?: { draft?: boolean }
) {
  const stored = invitation?.weddingWebsite;
  const templateId = normalizeWeddingTemplateId(stored?.templateId);
  const event = extractInvitationEventData(invitation);
  const publishedContent = applyEventDataToWebsiteContent(
    seedWeddingWebsiteContent(stored?.content, invitation),
    event
  );
  const draftContent = applyEventDataToWebsiteContent(
    seedWeddingWebsiteContent(stored?.draftContent || stored?.content, invitation),
    event
  );

  return {
    templateId,
    published: stored?.published !== false,
    hasSite: Boolean(cleanString(stored?.templateId)),
    event,
    content: options?.draft ? draftContent : publishedContent,
    draftContent,
    publishedContent,
  };
}

function mergeMediaMap(
  base?: Record<string, WeddingMediaSlot>,
  stored?: Record<string, WeddingMediaSlot>
) {
  const raw = stored && typeof stored === "object" ? stored : {};
  const next: Record<string, WeddingMediaSlot> = { ...(base || {}) };
  for (const [key, value] of Object.entries(raw)) {
    const slot = normalizeWeddingMediaSlot(value);
    if (slot) next[key] = slot;
  }
  return next;
}

function mergeStyleMap(
  base?: Record<string, WeddingTextStyle>,
  stored?: Record<string, WeddingTextStyle>
) {
  const raw = stored && typeof stored === "object" ? stored : {};
  const next: Record<string, WeddingTextStyle> = { ...(base || {}) };
  for (const [key, value] of Object.entries(raw)) {
    next[key] = sanitizeTextStyle(value);
  }
  return next;
}

function mergeSectionStyleMap(
  base?: Record<string, WeddingSectionStyle>,
  stored?: Record<string, WeddingSectionStyle>
) {
  const raw = stored && typeof stored === "object" ? stored : {};
  const next: Record<string, WeddingSectionStyle> = { ...(base || {}) };
  for (const [key, value] of Object.entries(raw)) {
    next[key] = sanitizeSectionStyle(value);
  }
  return next;
}
