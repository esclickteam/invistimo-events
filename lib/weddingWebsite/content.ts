import { WEDDING_DEMO_CONTENT } from "@/config/weddingWebsite/demoContent";
import { getWeddingTemplate } from "@/config/weddingWebsite/templates";
import type { WeddingDemoContent, WeddingTemplateId } from "@/types/weddingWebsite";

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
  location?: { name?: string; address?: string };
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
    location?: { name?: string; address?: string };
  } | null
): WeddingDemoContent {
  const title = cleanString(invitation?.title);
  const venueName = cleanString(invitation?.location?.name);
  const venueAddress = cleanString(invitation?.location?.address);
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
  };
}

export function serializeWeddingWebsite(
  invitation?: {
    title?: string;
    eventDate?: Date | string | null;
    eventTime?: string;
    location?: { name?: string; address?: string };
    weddingWebsite?: {
      templateId?: unknown;
      published?: unknown;
      content?: Partial<WeddingDemoContent> | null;
    } | null;
  } | null
) {
  const stored = invitation?.weddingWebsite;
  const templateId = normalizeWeddingTemplateId(stored?.templateId);

  return {
    templateId,
    published: stored?.published !== false,
    content: seedWeddingWebsiteContent(stored?.content, invitation),
  };
}
