import type { CSSProperties } from "react";
import type { WeddingSectionStyle, WeddingTextStyle } from "@/types/weddingWebsite";

export const EMPTY_TEXT_STYLE: WeddingTextStyle = {};

export function sanitizeTextStyle(value: unknown): WeddingTextStyle {
  const raw = value && typeof value === "object" ? (value as WeddingTextStyle) : {};
  const next: WeddingTextStyle = {};

  if (typeof raw.fontFamily === "string" && raw.fontFamily.trim()) {
    next.fontFamily = raw.fontFamily.trim().slice(0, 80);
  }
  if (typeof raw.fontSize === "string" && raw.fontSize.trim()) {
    next.fontSize = raw.fontSize.trim().slice(0, 24);
  }
  if (raw.fontWeight !== undefined && String(raw.fontWeight).trim()) {
    next.fontWeight = raw.fontWeight;
  }
  if (raw.fontStyle === "italic" || raw.fontStyle === "normal") {
    next.fontStyle = raw.fontStyle;
  }
  if (typeof raw.color === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(raw.color.trim())) {
    next.color = raw.color.trim();
  }
  if (raw.textAlign === "right" || raw.textAlign === "center" || raw.textAlign === "left") {
    next.textAlign = raw.textAlign;
  }
  if (raw.lineHeight !== undefined && String(raw.lineHeight).trim()) {
    next.lineHeight = raw.lineHeight;
  }
  if (typeof raw.letterSpacing === "string" && raw.letterSpacing.trim()) {
    next.letterSpacing = raw.letterSpacing.trim().slice(0, 24);
  }

  return next;
}

const LENGTH_PATTERN = /^\d+(?:\.\d+)?(?:px|rem|em|%|svh|vh)$/;

function clampNumber(value: unknown, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function sanitizeSectionStyle(value: unknown): WeddingSectionStyle {
  const raw = value && typeof value === "object" ? (value as WeddingSectionStyle) : {};
  const next: WeddingSectionStyle = {};
  if (typeof raw.backgroundColor === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw.backgroundColor.trim())) {
    next.backgroundColor = raw.backgroundColor.trim();
  }
  if (
    typeof raw.cardBackgroundColor === "string" &&
    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw.cardBackgroundColor.trim())
  ) {
    next.cardBackgroundColor = raw.cardBackgroundColor.trim();
  }
  if (
    typeof raw.buttonBackgroundColor === "string" &&
    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw.buttonBackgroundColor.trim())
  ) {
    next.buttonBackgroundColor = raw.buttonBackgroundColor.trim();
  }
  if (typeof raw.paddingTop === "string") next.paddingTop = raw.paddingTop.trim().slice(0, 16);
  if (typeof raw.paddingBottom === "string") next.paddingBottom = raw.paddingBottom.trim().slice(0, 16);
  if (raw.align === "right" || raw.align === "center" || raw.align === "left") {
    next.align = raw.align;
  }
  if (typeof raw.width === "string" && LENGTH_PATTERN.test(raw.width.trim())) {
    next.width = raw.width.trim();
  }
  const columns = clampNumber(raw.columns, 1, 6);
  if (columns !== undefined) next.columns = columns;
  if (typeof raw.gap === "string" && LENGTH_PATTERN.test(raw.gap.trim())) {
    next.gap = raw.gap.trim();
  }
  if (typeof raw.radius === "string" && LENGTH_PATTERN.test(raw.radius.trim())) {
    next.radius = raw.radius.trim();
  }
  if (raw.imageFit === "cover" || raw.imageFit === "contain") next.imageFit = raw.imageFit;
  const overlay = clampNumber(raw.overlayOpacity, 0, 100);
  if (overlay !== undefined) next.overlayOpacity = overlay;
  const heroHeight = clampNumber(raw.heroHeight, 40, 130);
  if (heroHeight !== undefined) next.heroHeight = heroHeight;
  const heroHeightMobile = clampNumber(raw.heroHeightMobile, 40, 130);
  if (heroHeightMobile !== undefined) next.heroHeightMobile = heroHeightMobile;
  return next;
}

export function textStyleToCss(style?: WeddingTextStyle | null): CSSProperties {
  if (!style) return {};
  return {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight as CSSProperties["fontWeight"],
    fontStyle: style.fontStyle,
    color: style.color,
    textAlign: style.textAlign,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
  };
}

function relativeLuminance(hex: string) {
  const color = hex.replace("#", "");
  const full =
    color.length === 3
      ? color
          .split("")
          .map((part) => part + part)
          .join("")
      : color;
  const toLin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const r = toLin(parseInt(full.slice(0, 2), 16) / 255);
  const g = toLin(parseInt(full.slice(2, 4), 16) / 255);
  const b = toLin(parseInt(full.slice(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors, or 0 when either is unusable. */
export function contrastRatio(foreground?: string | null, background?: string | null) {
  const isHex = (value?: string | null) =>
    typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
  if (!isHex(foreground) || !isHex(background)) return 0;
  const a = relativeLuminance(String(foreground).trim());
  const b = relativeLuminance(String(background).trim());
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function contrastOn(hex?: string | null) {
  const color = String(hex || "").replace("#", "");
  if (color.length !== 3 && color.length !== 6) return { ratio: 0, safe: false, on: "#111" };
  const full =
    color.length === 3
      ? color
          .split("")
          .map((part) => part + part)
          .join("")
      : color;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const toLin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  const white = 1.05 / (L + 0.05);
  const black = (L + 0.05) / 0.05;
  const onWhite = white >= black;
  return {
    ratio: Number((onWhite ? white : black).toFixed(2)),
    safe: Math.max(white, black) >= 3,
    on: onWhite ? "#fff" : "#111",
  };
}
