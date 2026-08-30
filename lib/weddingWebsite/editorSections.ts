import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";
import type { WeddingDemoContent, WeddingSectionId } from "@/types/weddingWebsite";
import { isSectionVisible } from "./editorSchema";

/**
 * Design controls a section can expose. Business rules (RSVP statuses, guest
 * limits, transport capacity, ...) are deliberately absent: the editor only
 * ever changes presentation.
 */
export type SectionSettingKey =
  | "background"
  | "spacing"
  | "align"
  | "width"
  | "columns"
  | "gap"
  | "radius"
  | "imageFit"
  | "media"
  | "heroOverlay"
  | "heroHeight"
  | "typography";

export type EditorSectionMeta = {
  id: WeddingSectionId;
  /** Label used inside the editor; may differ from the public nav label. */
  label: string;
  navLabel: string;
  /** Core sections carry the site's purpose and cannot be hidden. */
  core?: boolean;
  /** Sections whose data lives on the event, not on the website document. */
  dynamic?: boolean;
  settings: SectionSettingKey[];
  hint?: string;
};

const BASE_SETTINGS: SectionSettingKey[] = ["background", "spacing", "align", "width", "typography"];

const OVERRIDES: Partial<Record<WeddingSectionId, Partial<EditorSectionMeta>>> = {
  hero: {
    label: "ראשי",
    core: true,
    settings: ["media", "heroOverlay", "heroHeight", "align", "typography"],
    hint: "האזור הראשון שהאורחים רואים.",
  },
  countdown: { label: "ספירה לאחור" },
  invitation: { label: "הזמנה" },
  "our-story": { label: "הסיפור שלנו", settings: [...BASE_SETTINGS, "media"] },
  "how-we-met": { label: "איך נפגשנו", settings: [...BASE_SETTINGS, "media", "radius"] },
  proposal: { label: "ההצעה", settings: [...BASE_SETTINGS, "media", "radius"] },
  gallery: {
    label: "גלריה",
    settings: ["background", "spacing", "columns", "gap", "radius", "imageFit", "typography"],
  },
  video: { label: "וידאו", settings: ["background", "spacing", "media", "radius", "typography"] },
  "event-details": {
    label: "פרטי האירוע",
    core: true,
    dynamic: true,
    hint: "התאריך, השעה והאולם מגיעים מפרטי האירוע.",
  },
  schedule: { label: "לוח זמנים" },
  location: {
    label: "מיקום",
    core: true,
    dynamic: true,
    hint: "הכתובת והמפה מגיעות מפרטי האירוע.",
  },
  "dress-code": { label: "קוד לבוש" },
  accommodations: { label: "לינה" },
  transportation: {
    label: "הסעות",
    hint: "ההרשמה להסעות מנוהלת במערכת ההסעות. כאן משנים רק עיצוב.",
  },
  faq: { label: "שאלות נפוצות" },
  rsvp: {
    label: "אישור הגעה",
    core: true,
    settings: ["background", "spacing", "align", "radius", "typography"],
    hint: "הטופס זהה לזה שבהזמנה האישית. בעורך משנים רק עיצוב וכותרות.",
  },
  gifts: { label: "מתנות" },
  guestbook: {
    label: "הודעה לזוג",
    hint: "ההודעות שהאורחים שולחים מגיעות לדשבורד.",
  },
  "guest-upload": { label: "זיכרונות מהאורחים" },
  playlist: { label: "מוזיקה" },
  footer: { label: "סיום", core: true, settings: ["background", "spacing", "align", "typography"] },
};

export const EDITOR_SECTIONS: EditorSectionMeta[] = WEDDING_SECTIONS.map((section) => {
  const override = OVERRIDES[section.id] || {};
  return {
    id: section.id,
    label: override.label || section.navLabel,
    navLabel: section.navLabel,
    core: override.core,
    dynamic: override.dynamic,
    settings: override.settings || BASE_SETTINGS,
    hint: override.hint,
  };
});

const BY_ID = new Map(EDITOR_SECTIONS.map((section) => [section.id, section]));

export function editorSection(id: string) {
  return BY_ID.get(id as WeddingSectionId) || null;
}

export function editorSectionLabel(id: string) {
  return BY_ID.get(id as WeddingSectionId)?.label || id;
}

export function canHideSection(id: string) {
  return !BY_ID.get(id as WeddingSectionId)?.core;
}

/**
 * Section order as shown in the editor, with unknown ids dropped and missing
 * ones appended so a stale saved order can never hide a section.
 */
export function resolveSectionOrder(content?: WeddingDemoContent | null): WeddingSectionId[] {
  const known = EDITOR_SECTIONS.map((section) => section.id);
  const saved = (content?.sectionOrder || []).filter((id): id is WeddingSectionId =>
    known.includes(id as WeddingSectionId)
  );
  const seen = new Set(saved);
  return [...saved, ...known.filter((id) => !seen.has(id))];
}

export function visibleSectionIds(content?: WeddingDemoContent | null) {
  return resolveSectionOrder(content).filter((id) => isSectionVisible(content, id));
}

export function moveInOrder<T>(list: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
