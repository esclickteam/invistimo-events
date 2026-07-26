"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import type { WeddingDemoContent, WeddingTemplate } from "@/types/weddingWebsite";

type WeddingContextValue = {
  template: WeddingTemplate;
  content: WeddingDemoContent;
};

const WeddingContext = createContext<WeddingContextValue | null>(null);

export function WeddingThemeProvider({
  template,
  content,
  children,
}: WeddingContextValue & { children: ReactNode }) {
  const style = {
    "--ww-bg": template.theme.bg,
    "--ww-bg-alt": template.theme.bgAlt,
    "--ww-surface": template.theme.surface,
    "--ww-text": template.theme.text,
    "--ww-text-muted": template.theme.textMuted,
    "--ww-accent": template.theme.accent,
    "--ww-accent-soft": template.theme.accentSoft,
    "--ww-border": template.theme.border,
    "--ww-hero-overlay": template.theme.heroOverlay,
    "--ww-font-display": template.theme.fontDisplay,
    "--ww-font-body": template.theme.fontBody,
    "--ww-radius": template.theme.radius,
    "--ww-shadow": template.theme.shadow,
  } as CSSProperties;

  return (
    <WeddingContext.Provider value={{ template, content }}>
      <div
        className={`wedding-website-root min-h-screen ${template.theme.grain ? "ww-grain" : ""}`}
        style={style}
        data-template={template.id}
        data-mood={template.mood}
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
