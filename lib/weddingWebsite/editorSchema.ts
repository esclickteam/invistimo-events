import { formatHebrewDate } from "@/components/wedding-website/shared/weddingUtils";
import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";
import type { WeddingDemoContent, WeddingSectionId } from "@/types/weddingWebsite";

export type EditorFieldType = "text" | "richtext" | "media" | "section" | "gallery" | "button";

export type EditorField = {
  path: string;
  type: EditorFieldType;
  label: string;
  sectionId?: string;
  locked?: boolean;
};

export const RSVP_LOGIC_LOCK = "rsvp-logic";

export const EDITOR_TEXT_FIELDS: EditorField[] = [
  { path: "coupleNames", type: "text", label: "שמות בני הזוג", sectionId: "hero" },
  { path: "coupleShort", type: "text", label: "ראשי תיבות", sectionId: "hero" },
  { path: "heroSubtitle", type: "text", label: "משפט פתיחה", sectionId: "hero" },
  { path: "invitationText", type: "richtext", label: "טקסט הזמנה", sectionId: "invitation" },
  { path: "howWeMet", type: "richtext", label: "איך נפגשנו", sectionId: "how-we-met" },
  { path: "proposalStory", type: "richtext", label: "הצעת הנישואין", sectionId: "proposal" },
  { path: "dressCode", type: "richtext", label: "קוד לבוש", sectionId: "dress-code" },
  { path: "giftsNote", type: "richtext", label: "מתנות", sectionId: "gifts" },
  { path: "playlistNote", type: "richtext", label: "מוזיקה", sectionId: "playlist" },
  { path: "footerNote", type: "richtext", label: "סיום", sectionId: "footer" },
  { path: "guestMessageTitle", type: "text", label: "כותרת הודעה לזוג", sectionId: "guestbook" },
  { path: "guestMessageDescription", type: "text", label: "תיאור הודעה לזוג", sectionId: "guestbook" },
  { path: "rsvpTitle", type: "text", label: "כותרת אישור הגעה", sectionId: "rsvp" },
  { path: "rsvpSubtitle", type: "text", label: "משנה לאישור הגעה", sectionId: "rsvp" },
  { path: "transportationTitle", type: "text", label: "כותרת הגעה", sectionId: "transportation" },
  { path: "transportationDescription", type: "text", label: "תיאור הגעה", sectionId: "transportation" },
];

export const STATIC_COPY_FIELDS: Array<{ path: string; match: string; label: string; sectionId: string }> = [
  { path: "copy.countdown", match: "הספירה לאחור", label: "כותרת ספירה", sectionId: "countdown" },
  { path: "copy.invitation", match: "הזמנה חמה", label: "כותרת הזמנה", sectionId: "invitation" },
  { path: "copy.invitationAlt", match: "הזמנה", label: "כותרת הזמנה", sectionId: "invitation" },
  { path: "copy.ourStory", match: "הסיפור שלנו", label: "כותרת הסיפור", sectionId: "our-story" },
  { path: "copy.howWeMet", match: "איך נפגשנו", label: "כותרת איך נפגשנו", sectionId: "how-we-met" },
  { path: "copy.proposal", match: "ההצעה", label: "כותרת הצעה", sectionId: "proposal" },
  { path: "copy.gallery", match: "גלריה", label: "כותרת גלריה", sectionId: "gallery" },
  { path: "copy.video", match: "סרטון", label: "כותרת וידאו", sectionId: "video" },
  { path: "copy.details", match: "פרטי האירוע", label: "כותרת פרטים", sectionId: "event-details" },
  { path: "copy.schedule", match: "לוח זמנים", label: "כותרת לוח זמנים", sectionId: "schedule" },
  { path: "copy.location", match: "מיקום", label: "כותרת מיקום", sectionId: "location" },
  { path: "copy.dressCode", match: "קוד לבוש", label: "כותרת לבוש", sectionId: "dress-code" },
  { path: "copy.hotels", match: "לינה", label: "כותרת לינה", sectionId: "accommodations" },
  { path: "copy.transport", match: "הגעה", label: "כותרת הגעה", sectionId: "transportation" },
  { path: "copy.faq", match: "שאלות נפוצות", label: "כותרת שאלות", sectionId: "faq" },
  { path: "copy.rsvp", match: "אישור הגעה", label: "כותרת אישור הגעה", sectionId: "rsvp" },
  { path: "copy.gifts", match: "מתנות", label: "כותרת מתנות", sectionId: "gifts" },
  { path: "copy.guestbook", match: "ספר ברכות", label: "כותרת ברכות", sectionId: "guestbook" },
  { path: "copy.memories", match: "זיכרונות", label: "כותרת זיכרונות", sectionId: "guest-upload" },
  { path: "copy.music", match: "מוזיקה", label: "כותרת מוזיקה", sectionId: "playlist" },
];

export const BUSINESS_LOGIC_SKIP =
  "[data-rsvp-core],[data-rsvp-state],input,textarea,select,button,[contenteditable='true']";

export const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  WEDDING_SECTIONS.map((section) => [section.id, section.navLabel])
);

export function getByPath(content: WeddingDemoContent, path: string): unknown {
  if (path.startsWith("copy.")) {
    return content.copy?.[path.slice(5)] ?? content.copy?.[path] ?? "";
  }
  const parts = path.split(".");
  let current: any = content;
  for (const part of parts) {
    if (current == null) return "";
    current = current[part];
  }
  return current ?? "";
}

export const LOCKED_EVENT_PATHS = new Set([
  "weddingDate",
  "weddingTime",
  "venueName",
  "venueAddress",
]);

export function setByPath(content: WeddingDemoContent, path: string, value: unknown): WeddingDemoContent {
  if (LOCKED_EVENT_PATHS.has(path)) return content;

  if (path.startsWith("copy.")) {
    const key = path.slice(5);
    return {
      ...content,
      copy: { ...(content.copy || {}), [key]: String(value ?? "") },
    };
  }

  const parts = path.split(".");
  if (parts.length === 1) {
    return { ...content, [path]: value } as WeddingDemoContent;
  }

  const rootKey = parts[0] as keyof WeddingDemoContent;
  const list = Array.isArray(content[rootKey]) ? [...(content[rootKey] as any[])] : [];
  const index = Number(parts[1]);
  if (!Number.isFinite(index) || index < 0 || index >= list.length) {
    return content;
  }
  if (parts.length === 2) {
    list[index] = value;
    return { ...content, [rootKey]: list } as WeddingDemoContent;
  }
  const item = { ...list[index], [parts[2]]: value };
  list[index] = item;
  return { ...content, [rootKey]: list } as WeddingDemoContent;
}

export function buildTextIndex(content: WeddingDemoContent) {
  const entries: Array<{ path: string; value: string; label: string; type: EditorFieldType }> = [];

  function add(path: string, value: unknown, label: string, type: EditorFieldType = "text") {
    const text = String(value || "").trim();
    if (!text) return;
    entries.push({ path, value: text, label, type });
  }

  for (const field of EDITOR_TEXT_FIELDS) {
    add(field.path, getByPath(content, field.path), field.label, field.type);
  }

  add("weddingDate", formatHebrewDate(content.weddingDate), "תאריך", "text");
  add("weddingTime", content.weddingTime, "שעה", "text");
  add("venueName", content.venueName, "אולם", "text");
  add("venueAddress", content.venueAddress, "כתובת", "text");

  content.storyParagraphs?.forEach((text, index) => {
    add(`storyParagraphs.${index}`, text, `פסקת סיפור ${index + 1}`, "richtext");
  });
  content.schedule?.forEach((item, index) => {
    add(`schedule.${index}.time`, item.time, `שעת לו״ז ${index + 1}`);
    add(`schedule.${index}.title`, item.title, `אירוע לו״ז ${index + 1}`);
    add(`schedule.${index}.description`, item.description, `תיאור לו״ז ${index + 1}`, "richtext");
  });
  content.faq?.forEach((item, index) => {
    add(`faq.${index}.question`, item.question, `שאלה ${index + 1}`);
    add(`faq.${index}.answer`, item.answer, `תשובה ${index + 1}`, "richtext");
  });
  content.accommodations?.forEach((item, index) => {
    add(`accommodations.${index}.name`, item.name, `מלון ${index + 1}`);
    add(`accommodations.${index}.note`, item.note, `הערת מלון ${index + 1}`);
  });
  content.transportation?.forEach((item, index) => {
    add(`transportation.${index}.title`, item.title, `הגעה ${index + 1}`);
    add(`transportation.${index}.description`, item.description, `תיאור הגעה ${index + 1}`, "richtext");
  });

  for (const field of STATIC_COPY_FIELDS) {
    const override = content.copy?.[field.path.replace(/^copy\./, "")] || content.copy?.[field.path];
    add(field.path, override || field.match, field.label);
  }

  entries.sort((a, b) => b.value.length - a.value.length);
  return entries;
}

export function matchTextField(
  text: string,
  index: ReturnType<typeof buildTextIndex>
) {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value || value.length < 2) return null;
  return index.find((entry) => entry.value === value) || null;
}

export function defaultSectionOrder(): WeddingSectionId[] {
  return WEDDING_SECTIONS.map((section) => section.id);
}

export function isSectionVisible(
  content: WeddingDemoContent | null | undefined,
  id: string
) {
  const sections = content?.sections || {};
  if (id === "guestbook" && sections["guest-message"] === false) return false;
  return sections[id as keyof typeof sections] !== false;
}
