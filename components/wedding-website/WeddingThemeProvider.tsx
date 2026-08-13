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

  return {
    "--ww-bg": bg,
    "--ww-bg-alt": overrides.secondary || template.theme.bgAlt,
    "--ww-surface": overrides.card || template.theme.surface,
    "--ww-text": text,
    "--ww-text-muted": template.theme.textMuted,
    "--ww-accent": accent,
    "--ww-accent-soft": template.theme.accentSoft,
    "--ww-border": template.theme.border,
    "--ww-hero-overlay": template.theme.heroOverlay,
    "--ww-font-display": font || template.theme.fontDisplay,
    "--ww-font-body": template.theme.fontBody,
    "--ww-radius": template.theme.radius,
    "--ww-shadow": template.theme.shadow,
    "--ww-button": button,
    "--ww-heading-scale": String(scale),
    "--ww-style-preset": overrides.stylePreset || "classic",
    // Force visible theme application even when templates hardcode some colors
    backgroundColor: bg,
    color: text,
    ...(font ? { fontFamily: font } : {}),
  } as CSSProperties;
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
