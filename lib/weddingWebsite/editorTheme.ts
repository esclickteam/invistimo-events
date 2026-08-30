import type { CSSProperties } from "react";
import { WEDDING_TEMPLATE_PALETTE } from "@/config/weddingWebsite/templatePalette.generated";
import { getWeddingFont } from "./fonts";
import {
  WEDDING_RADIUS_STYLES,
  WEDDING_SPACING_STYLES,
  WEDDING_THEME_ROLES,
  expandHex,
  isHexColor,
  withAlpha,
  type WeddingPaletteRule,
  type WeddingRadiusStyle,
  type WeddingSpacingStyle,
  type WeddingThemeOverride,
  type WeddingThemeRole,
} from "./themeRoles";
import type { WeddingTemplate, WeddingTemplateId } from "@/types/weddingWebsite";

export * from "./themeRoles";

/** Marker class the theme stylesheet is scoped to. */
export const WEDDING_THEME_SCOPE = "ww-themed";

export function sanitizeWeddingThemeOverride(value: unknown): WeddingThemeOverride | undefined {
  const raw = value && typeof value === "object" ? (value as WeddingThemeOverride) : null;
  if (!raw) return undefined;

  const next: WeddingThemeOverride = {};

  const colors: Partial<Record<WeddingThemeRole, string>> = {};
  for (const role of WEDDING_THEME_ROLES) {
    const color = raw.colors?.[role];
    if (isHexColor(color)) colors[role] = expandHex(color).toUpperCase();
  }
  if (Object.keys(colors).length) next.colors = colors;

  if (getWeddingFont(raw.headingFont)) next.headingFont = String(raw.headingFont).slice(0, 80);
  if (getWeddingFont(raw.bodyFont)) next.bodyFont = String(raw.bodyFont).slice(0, 80);
  if (raw.radius && WEDDING_RADIUS_STYLES.includes(raw.radius)) next.radius = raw.radius;
  if (raw.spacing && WEDDING_SPACING_STYLES.includes(raw.spacing)) next.spacing = raw.spacing;

  return Object.keys(next).length ? next : undefined;
}

export function hasWeddingThemeOverride(theme?: WeddingThemeOverride | null) {
  if (!theme) return false;
  if (theme.headingFont || theme.bodyFont) return true;
  if (theme.radius && theme.radius !== "template") return true;
  if (theme.spacing && theme.spacing !== "template") return true;
  return Object.values(theme.colors || {}).some(Boolean);
}

/** Effective palette: template defaults with the couple's overrides on top. */
export function resolveWeddingPalette(
  template: Pick<WeddingTemplate, "theme">,
  theme?: WeddingThemeOverride | null
) {
  const palette = {} as Record<WeddingThemeRole, string>;
  for (const role of WEDDING_THEME_ROLES) {
    const override = theme?.colors?.[role];
    palette[role] = isHexColor(override)
      ? expandHex(override)
      : String(template.theme?.[role] || "");
  }
  return palette;
}

const RADIUS_VALUES: Record<Exclude<WeddingRadiusStyle, "template">, string> = {
  sharp: "2px",
  soft: "14px",
  round: "28px",
};

const SPACING_VALUES: Record<Exclude<WeddingSpacingStyle, "template">, string> = {
  compact: "3rem",
  airy: "8rem",
};

const UTIL_DECLARATIONS: Record<WeddingPaletteRule["util"], (color: string) => string> = {
  bg: (color) => `background-color:${color}`,
  text: (color) => `color:${color}`,
  border: (color) => `border-color:${color}`,
  ring: (color) => `--tw-ring-color:${color}`,
  // Tailwind's own `from-*` rule also parks a transparent stop in
  // `--tw-gradient-to`; re-declare it so the old hue cannot leak back in.
  from: (color) =>
    `--tw-gradient-from:${color} var(--tw-gradient-from-position);--tw-gradient-to:transparent var(--tw-gradient-to-position)`,
  via: (color) =>
    `--tw-gradient-stops:var(--tw-gradient-from), ${color} var(--tw-gradient-via-position), var(--tw-gradient-to)`,
  to: (color) => `--tw-gradient-to:${color} var(--tw-gradient-to-position)`,
};

/**
 * Which utilities each role is allowed to repaint.
 *
 * Templates reuse their dark ink hex for hero scrims and dark panels, so a
 * couple changing "text" should only change text — not suddenly tint every
 * overlay. Accent colours, on the other hand, are meant to carry through
 * borders, rings and gradients.
 */
const ROLE_UTILS: Record<WeddingThemeRole, ReadonlyArray<WeddingPaletteRule["util"]>> = {
  accent: ["bg", "text", "border", "ring", "from", "via", "to"],
  accentSoft: ["bg", "text", "border", "ring", "from", "via", "to"],
  bg: ["bg", "border", "ring", "from", "via", "to"],
  bgAlt: ["bg", "border", "ring", "from", "via", "to"],
  surface: ["bg", "border", "ring", "from", "via", "to"],
  text: ["text"],
  textMuted: ["text"],
};

/** Escapes a Tailwind class token so it can be used inside a CSS selector. */
export function escapeClassSelector(cls: string) {
  return cls.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

function fontStack(family?: string) {
  const font = getWeddingFont(family);
  return font ? font.cssFamily : "";
}

/**
 * Builds the stylesheet that turns a global theme change into a site-wide
 * repaint. Templates keep their hard-coded Tailwind classes; we simply outrank
 * them with a `.ww-themed`-scoped rule of higher specificity.
 */
export function buildWeddingThemeCss(
  template: Pick<WeddingTemplate, "id" | "theme">,
  theme?: WeddingThemeOverride | null
) {
  if (!hasWeddingThemeOverride(theme)) return "";

  const scope = `.${WEDDING_THEME_SCOPE}`;
  const blocks: string[] = [];

  const rules = WEDDING_TEMPLATE_PALETTE[template.id as WeddingTemplateId] || [];
  const declarationsBySelector = new Map<string, string[]>();

  for (const rule of rules) {
    const override = theme?.colors?.[rule.role];
    if (!isHexColor(override)) continue;
    if (!ROLE_UTILS[rule.role].includes(rule.util)) continue;
    const color = withAlpha(override, rule.alpha);
    const selector = `${scope} .${escapeClassSelector(rule.cls)}`;
    const list = declarationsBySelector.get(selector) || [];
    list.push(UTIL_DECLARATIONS[rule.util](color));
    declarationsBySelector.set(selector, list);
  }

  for (const [selector, declarations] of declarationsBySelector) {
    blocks.push(`${selector}{${declarations.join(";")}}`);
  }

  const body = fontStack(theme?.bodyFont);
  if (body) {
    blocks.push(
      `${scope} .wedding-website-root,${scope} [class*="font-['"]{font-family:${body}}`
    );
  }

  const heading = fontStack(theme?.headingFont);
  if (heading) {
    const targets = ["h1", "h2", "h3", ".ww-display"];
    const selectors = [
      ...targets.map((target) => `${scope} .wedding-website-root ${target}`),
      ...targets.map((target) => `${scope} ${target}[class*="font-['"]`),
    ];
    blocks.push(`${selectors.join(",")}{font-family:${heading}}`);
  }

  if (theme?.radius && theme.radius !== "template") {
    const radius = RADIUS_VALUES[theme.radius];
    blocks.push(
      `${scope} [class*="rounded"]:not([class*="rounded-full"]):not(.ww-editor-ui){border-radius:${radius}}`
    );
  }

  if (theme?.spacing && theme.spacing !== "template") {
    const padding = SPACING_VALUES[theme.spacing];
    blocks.push(
      `${scope} section[id]:not(#hero):not(#footer){padding-top:${padding};padding-bottom:${padding}}`
    );
  }

  // Countdown digits/labels follow theme even when templates hard-code colors
  // (including inline styles). Keep the unit cards readable on any section bg.
  if (isHexColor(theme?.colors?.accent)) {
    const accent = expandHex(theme.colors.accent);
    blocks.push(
      `${scope} [data-ww-countdown="units"] span{color:${accent}!important}`,
      `${scope} [data-ww-countdown="units"] > *{border-color:${withAlpha(accent, 35)}!important}`
    );
  }
  if (isHexColor(theme?.colors?.textMuted)) {
    blocks.push(
      `${scope} [data-ww-countdown="units"] p{color:${expandHex(theme.colors.textMuted)}!important}`
    );
  }
  if (isHexColor(theme?.colors?.text)) {
    blocks.push(
      `${scope} #countdown h2,${scope} #countdown .ww-display{color:${expandHex(theme.colors.text)}!important}`
    );
  }
  if (isHexColor(theme?.colors?.surface)) {
    blocks.push(
      `${scope} [data-ww-countdown="units"] > *{background-color:${withAlpha(expandHex(theme.colors.surface), 92)}!important}`
    );
  } else if (isHexColor(theme?.colors?.bgAlt)) {
    blocks.push(
      `${scope} [data-ww-countdown="units"] > *{background-color:${withAlpha(expandHex(theme.colors.bgAlt), 92)}!important}`
    );
  }

  return blocks.join("\n");
}

/** CSS custom properties so `--ww-*` consumers follow the override too. */
export function weddingThemeCssVars(
  template: Pick<WeddingTemplate, "theme">,
  theme?: WeddingThemeOverride | null
): CSSProperties {
  if (!hasWeddingThemeOverride(theme)) return {};
  const palette = resolveWeddingPalette(template, theme);
  const vars: Record<string, string> = {};
  if (theme?.colors?.accent) vars["--ww-accent"] = palette.accent;
  if (theme?.colors?.accentSoft) vars["--ww-accent-soft"] = palette.accentSoft;
  if (theme?.colors?.bg) vars["--ww-bg"] = palette.bg;
  if (theme?.colors?.bgAlt) vars["--ww-bg-alt"] = palette.bgAlt;
  if (theme?.colors?.text) vars["--ww-text"] = palette.text;
  if (theme?.colors?.textMuted) vars["--ww-text-muted"] = palette.textMuted;
  const heading = fontStack(theme?.headingFont);
  if (heading) vars["--ww-font-display"] = heading;
  const body = fontStack(theme?.bodyFont);
  if (body) vars["--ww-font-body"] = body;
  return vars as CSSProperties;
}

/** Which theme roles a given template can actually repaint. */
export function weddingThemeRoleCoverage(templateId: string) {
  const rules = WEDDING_TEMPLATE_PALETTE[templateId as WeddingTemplateId] || [];
  const covered = new Set<WeddingThemeRole>();
  for (const rule of rules) {
    if (ROLE_UTILS[rule.role].includes(rule.util)) covered.add(rule.role);
  }
  return covered;
}
