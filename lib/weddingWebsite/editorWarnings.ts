import { EDITOR_SECTIONS, editorSectionLabel } from "./editorSections";
import { isSectionVisible } from "./editorSchema";
import { resolveWeddingPalette } from "./editorTheme";
import { contrastRatio } from "./styles";
import type { WeddingDemoContent, WeddingTemplate } from "@/types/weddingWebsite";

export type EditorWarningLevel = "warning" | "info";

export type EditorWarning = {
  id: string;
  level: EditorWarningLevel;
  message: string;
  /** Section the warning belongs to, so the UI can jump straight to it. */
  sectionId?: string;
  /** Text path the warning belongs to, when it is about a single element. */
  path?: string;
};

const LONG_TITLE_CHARS = 34;
const HUGE_FONT_PX = 44;
const HUGE_FONT_CHARS = 22;
const DEEP_ZOOM = 1.9;
const TALL_SECTION_REM = 10;
const MIN_CONTRAST = 3;

function fontPx(value?: string) {
  const match = /^(\d+(?:\.\d+)?)px$/.exec(String(value || "").trim());
  return match ? Number(match[1]) : 0;
}

function remValue(value?: string) {
  const raw = String(value || "").trim();
  const rem = /^(\d+(?:\.\d+)?)rem$/.exec(raw);
  if (rem) return Number(rem[1]);
  const px = /^(\d+(?:\.\d+)?)px$/.exec(raw);
  if (px) return Number(px[1]) / 16;
  return 0;
}

/**
 * Non-blocking quality checks. The editor surfaces these so a couple can see a
 * problem before their guests do, but never prevents the edit itself.
 */
export function collectEditorWarnings(
  content: WeddingDemoContent | null | undefined,
  template: Pick<WeddingTemplate, "id" | "theme"> | null | undefined
): EditorWarning[] {
  if (!content) return [];
  const warnings: EditorWarning[] = [];

  if ((content.coupleNames || "").length > LONG_TITLE_CHARS) {
    warnings.push({
      id: "long-couple-names",
      level: "warning",
      sectionId: "hero",
      path: "coupleNames",
      message: "השמות ארוכים — הכותרת עלולה להיחתך במובייל.",
    });
  }

  const styles = content.styles || {};
  for (const [path, style] of Object.entries(styles)) {
    const size = fontPx(style?.fontSize);
    if (!size || size < HUGE_FONT_PX) continue;
    const text = String(
      path.startsWith("copy.")
        ? content.copy?.[path.slice(5)] || ""
        : (content as unknown as Record<string, unknown>)[path] || ""
    );
    if (text.length < HUGE_FONT_CHARS) continue;
    warnings.push({
      id: `huge-font-${path}`,
      level: "warning",
      path,
      message: `הטקסט מוגדר ל-${size}px וארוך — הוא עלול להיחתך במובייל.`,
    });
  }

  const palette = template ? resolveWeddingPalette(template, content.theme) : null;
  for (const section of EDITOR_SECTIONS) {
    const sectionStyle = content.sectionStyles?.[section.id];
    const background = sectionStyle?.backgroundColor || palette?.bg;
    if (background) {
      const textColor =
        styles[`copy.${section.id}`]?.color || palette?.text || undefined;
      const ratio = contrastRatio(textColor, background);
      if (ratio && ratio < MIN_CONTRAST) {
        warnings.push({
          id: `contrast-${section.id}`,
          level: "warning",
          sectionId: section.id,
          message: `ניגודיות חלשה במקטע "${section.label}" (${ratio}:1) — הטקסט יהיה קשה לקריאה.`,
        });
      }
    }

    const tall =
      remValue(sectionStyle?.paddingTop) > TALL_SECTION_REM ||
      remValue(sectionStyle?.paddingBottom) > TALL_SECTION_REM;
    if (tall) {
      warnings.push({
        id: `tall-${section.id}`,
        level: "info",
        sectionId: section.id,
        message: `המקטע "${section.label}" גבוה מאוד — אורחים במובייל יגללו הרבה.`,
      });
    }
  }

  for (const [slotId, slot] of Object.entries(content.media || {})) {
    if (!slot) continue;
    if ((slot.zoom || 1) > DEEP_ZOOM) {
      warnings.push({
        id: `zoom-${slotId}`,
        level: "warning",
        message: "התמונה מוגדלת מאוד — היא עלולה להיראות חתוכה או מטושטשת.",
      });
    }
    if (slot.type === "video" && slot.autoplay && slot.muted === false) {
      warnings.push({
        id: `video-sound-${slotId}`,
        level: "info",
        message: "סרטון שמתנגן אוטומטית חייב להיות מושתק כדי לעבוד בדפדפנים ובמובייל.",
      });
    }
  }

  const galleryCount = (content.galleryImages || []).filter(Boolean).length;
  if (isSectionVisible(content, "gallery") && galleryCount === 0) {
    warnings.push({
      id: "empty-gallery",
      level: "info",
      sectionId: "gallery",
      message: "עדיין לא הוספתם תמונות לגלריה — כרגע מוצגות תמונות ההשראה של התבנית.",
    });
  }

  if (!isSectionVisible(content, "rsvp")) {
    warnings.push({
      id: "rsvp-hidden",
      level: "warning",
      sectionId: "rsvp",
      message: `המקטע "${editorSectionLabel("rsvp")}" מוסתר — אורחים לא יוכלו לאשר הגעה מהאתר.`,
    });
  }

  return warnings;
}

export function warningsForSection(warnings: EditorWarning[], sectionId: string) {
  return warnings.filter((warning) => warning.sectionId === sectionId);
}
