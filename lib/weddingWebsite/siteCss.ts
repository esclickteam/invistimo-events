import { textStyleToCss } from "./styles";
import type { WeddingDemoContent, WeddingSectionStyle } from "@/types/weddingWebsite";

/**
 * Turns saved editor values into plain CSS. The editor and the published site
 * both render through this, which is what keeps "what you see is what you
 * publish" true instead of approximated.
 */

export function cssEscapeIdent(value: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function declarations(style: Record<string, unknown> | object) {
  return Object.entries(style as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)}:${value}`);
}

/** Per-element typography overrides, scoped so they outrank theme defaults. */
export function buildTextStyleCss(styles?: Record<string, unknown> | null, prefix = ".ww-site ") {
  return Object.entries(styles || {})
    .map(([path, style]) => {
      const rules = declarations(textStyleToCss(style as never));
      if (!rules.length) return "";
      return `${prefix}[data-ww-path="${cssEscapeIdent(path)}"]{${rules.join(";")}}`;
    })
    .filter(Boolean)
    .join("");
}

function sectionRules(id: string, style: WeddingSectionStyle) {
  const selector = `#${cssEscapeIdent(id)}`;
  const blocks: string[] = [];

  const own: string[] = [];
  if (style.backgroundColor) own.push(`background-color:${style.backgroundColor}`);
  if (style.paddingTop) own.push(`padding-top:${style.paddingTop}`);
  if (style.paddingBottom) own.push(`padding-bottom:${style.paddingBottom}`);
  if (style.align) own.push(`text-align:${style.align}`);
  if (id === "hero" && style.heroHeight) own.push(`min-height:${style.heroHeight}svh`);
  if (own.length) blocks.push(`${selector}{${own.join(";")}}`);

  if (style.width) {
    blocks.push(`${selector} [class*="max-w-"]{max-width:${style.width}}`);
  }
  if (style.columns) {
    blocks.push(
      `${selector} [class*="grid-cols"]{grid-template-columns:repeat(${style.columns},minmax(0,1fr))}`,
      `${selector} [class*="columns-"]{columns:${style.columns}}`
    );
  }
  if (style.gap) {
    blocks.push(`${selector} [class*="gap-"]{gap:${style.gap}}`);
  }
  if (style.radius) {
    blocks.push(
      `${selector} img,${selector} video,${selector} [class*="rounded"]{border-radius:${style.radius}}`
    );
  }
  if (style.imageFit) {
    blocks.push(`${selector} img,${selector} video{object-fit:${style.imageFit}}`);
  }
  if (id === "hero" && style.overlayOpacity !== undefined) {
    blocks.push(
      `${selector} [class*="bg-gradient-to"]{opacity:${Math.max(0, Math.min(100, style.overlayOpacity)) / 100}}`
    );
  }

  return blocks.join("");
}

export function buildSectionStyleCss(content?: WeddingDemoContent | null) {
  return Object.entries(content?.sectionStyles || {})
    .map(([id, style]) => sectionRules(id, style || {}))
    .join("");
}

/**
 * Narrow-screen adjustments. Returned without a wrapper so the caller can drop
 * the same body into a media query (real devices) and a container query (the
 * editor's mobile canvas).
 */
export function buildMobileCss(content?: WeddingDemoContent | null) {
  const blocks: string[] = [buildTextStyleCss(content?.mobileStyles, ".ww-site ")];

  const heroMobile = content?.sectionStyles?.hero?.heroHeightMobile;
  if (heroMobile) blocks.push(`#hero{min-height:${heroMobile}svh}`);

  for (const [slotId, slot] of Object.entries(content?.media || {})) {
    if (!slot?.positionMobile) continue;
    blocks.push(
      `[data-ww-slot="${cssEscapeIdent(slotId)}"]{object-position:${slot.positionMobile}}`
    );
  }

  return blocks.filter(Boolean).join("");
}
