/**
 * Shared vocabulary for wedding-website theming.
 *
 * Kept free of React and of the generated palette so both the runtime CSS
 * builder and the palette generator script can import it.
 */
import type { WeddingThemeOverrides } from "@/types/weddingWebsite";

export const WEDDING_THEME_ROLES = [
  "accent",
  "accentSoft",
  "bg",
  "bgAlt",
  "surface",
  "text",
  "textMuted",
] as const;

export type WeddingThemeRole = (typeof WEDDING_THEME_ROLES)[number];

/** Tailwind color utilities the templates actually use with arbitrary hex values. */
export const WEDDING_PALETTE_UTILS = [
  "bg",
  "text",
  "border",
  "ring",
  "from",
  "via",
  "to",
] as const;

export type WeddingPaletteUtil = (typeof WEDDING_PALETTE_UTILS)[number];

export type WeddingPaletteRule = {
  /** Literal class token as written in the template, e.g. `border-[#C9A962]/30`. */
  cls: string;
  util: WeddingPaletteUtil;
  role: WeddingThemeRole;
  /** Tailwind opacity modifier, when present. */
  alpha?: number;
};

export const WEDDING_THEME_ROLE_LABELS: Record<WeddingThemeRole, string> = {
  accent: "צבע ראשי",
  accentSoft: "צבע משני",
  bg: "רקע האתר",
  bgAlt: "רקע מקטעים",
  surface: "כרטיסים",
  text: "טקסט",
  textMuted: "טקסט משני",
};

/** Roles surfaced in the theme panel, in display order. */
export const WEDDING_THEME_ROLE_ORDER: WeddingThemeRole[] = [
  "accent",
  "accentSoft",
  "bg",
  "bgAlt",
  "text",
  "textMuted",
];

export const WEDDING_RADIUS_STYLES = ["template", "sharp", "soft", "round"] as const;
export type WeddingRadiusStyle = (typeof WEDDING_RADIUS_STYLES)[number];

export const WEDDING_RADIUS_LABELS: Record<WeddingRadiusStyle, string> = {
  template: "כמו בתבנית",
  sharp: "פינות חדות",
  soft: "פינות רכות",
  round: "פינות מעוגלות",
};

export const WEDDING_SPACING_STYLES = ["template", "compact", "airy"] as const;
export type WeddingSpacingStyle = (typeof WEDDING_SPACING_STYLES)[number];

export const WEDDING_SPACING_LABELS: Record<WeddingSpacingStyle, string> = {
  template: "כמו בתבנית",
  compact: "צפוף",
  airy: "מרווח",
};

export type WeddingThemeOverride = WeddingThemeOverrides;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function expandHex(value: string) {
  const hex = value.trim().replace("#", "");
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((part) => part + part)
      .join("")}`;
  }
  return `#${hex}`;
}

export function hexToRgbTriplet(value: string) {
  const hex = expandHex(value).slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

/** Renders a hex with an optional Tailwind-style opacity percentage. */
export function withAlpha(hex: string, alpha?: number) {
  if (alpha === undefined || alpha >= 100) return expandHex(hex);
  const { r, g, b } = hexToRgbTriplet(hex);
  const ratio = Math.max(0, Math.min(100, alpha)) / 100;
  return `rgb(${r} ${g} ${b} / ${ratio})`;
}
