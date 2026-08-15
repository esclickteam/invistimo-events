"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import type {
  WeddingDemoContent,
  WeddingTemplate,
  WeddingThemeOverrides,
} from "@/types/weddingWebsite";
import { WW_FONT_OPTIONS } from "@/config/weddingWebsite/media";

type WeddingContextValue = {
  template: WeddingTemplate;
  content: WeddingDemoContent;
  themeOverrides: WeddingThemeOverrides;
};

const WeddingContext = createContext<WeddingContextValue | null>(null);

function resolveFontCss(fontFamily?: string) {
  if (!fontFamily) return "";
  const fromList = WW_FONT_OPTIONS.find(
    (f) => f.id === fontFamily || f.css === fontFamily || f.label === fontFamily
  );
  return fromList?.css || fontFamily;
}

export function buildThemeCssVars(
  template: WeddingTemplate,
  overrides: WeddingThemeOverrides = {}
): CSSProperties {
  const font = resolveFontCss(overrides.fontFamily);
  const scale =
    typeof overrides.headingScale === "number" && overrides.headingScale > 0
      ? overrides.headingScale
      : 1;

  const accent = overrides.accent || template.theme.accent;
  const bg = overrides.background || template.theme.bg;
  const text = overrides.text || template.theme.text;
  const button = overrides.button || overrides.accent || template.theme.accent;
  const bgAlt = overrides.secondary || template.theme.bgAlt;
  const surface = overrides.card || template.theme.surface;
  const muted = overrides.text
    ? softenHex(overrides.text, 0.42)
    : template.theme.textMuted;

  return {
    "--ww-bg": bg,
    "--ww-bg-alt": bgAlt,
    "--ww-surface": surface,
    "--ww-text": text,
    "--ww-text-muted": muted,
    "--ww-accent": accent,
    "--ww-accent-soft": overrides.accent
      ? softenHex(accent, 0.75)
      : template.theme.accentSoft,
    "--ww-border": overrides.accent
      ? `${accent}55`
      : template.theme.border,
    "--ww-hero-overlay": template.theme.heroOverlay,
    "--ww-font-display": font || template.theme.fontDisplay,
    "--ww-font-body": template.theme.fontBody,
    "--ww-radius": template.theme.radius,
    "--ww-shadow": template.theme.shadow,
    "--ww-button": button,
    "--ww-heading-scale": String(scale),
    "--ww-style-preset": overrides.stylePreset || "classic",
    backgroundColor: bg,
    color: text,
    ...(font ? { fontFamily: font } : {}),
  } as CSSProperties;
}

function softenHex(hex: string, amount: number) {
  const raw = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return hex;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function WeddingThemeProvider({
  template,
  content,
  themeOverrides = {},
  children,
}: WeddingContextValue & { children: ReactNode }) {
  const style = buildThemeCssVars(template, themeOverrides);

  return (
    <WeddingContext.Provider value={{ template, content, themeOverrides }}>
      <div
        className={`wedding-website-root min-h-screen ${template.theme.grain ? "ww-grain" : ""}`}
        style={style}
        data-template={template.id}
        data-mood={template.mood}
        data-style-preset={themeOverrides.stylePreset || "classic"}
      >
        {children}
      </div>
    </WeddingContext.Provider>
  );
}

export function useWeddingTheme() {
  const ctx = useContext(WeddingContext);
  if (!ctx) {
    throw new Error("useWeddingTheme must be used within WeddingThemeProvider");
  }
  return ctx;
}
