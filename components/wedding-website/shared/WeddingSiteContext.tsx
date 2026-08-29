"use client";

import { createContext, useContext, type ReactNode } from "react";
import { WEDDING_DEMO_CONTENT } from "@/config/weddingWebsite/demoContent";
import type {
  WeddingSectionToggles,
  WeddingSiteContent,
  WeddingThemeOverrides,
  WeddingWebsiteGuestContext,
} from "@/types/weddingWebsite";
import type { WeddingEditApi } from "../editor/EditablePrimitives";

export type WeddingSiteContextValue = {
  content: WeddingSiteContent;
  guest: WeddingWebsiteGuestContext | null;
  sections: WeddingSectionToggles;
  themeOverrides: WeddingThemeOverrides;
  mode: "demo" | "live" | "preview" | "edit";
  shareId: string | null;
  edit: WeddingEditApi | null;
};

const WeddingSiteContext = createContext<WeddingSiteContextValue>({
  content: WEDDING_DEMO_CONTENT,
  guest: null,
  sections: {},
  themeOverrides: {},
  mode: "demo",
  shareId: null,
  edit: null,
});

export function WeddingSiteProvider({
  content,
  guest = null,
  sections = {},
  themeOverrides = {},
  mode = "demo",
  shareId = null,
  edit = null,
  children,
}: {
  content: WeddingSiteContent;
  guest?: WeddingWebsiteGuestContext | null;
  sections?: WeddingSectionToggles;
  themeOverrides?: WeddingThemeOverrides;
  mode?: "demo" | "live" | "preview" | "edit";
  shareId?: string | null;
  edit?: WeddingEditApi | null;
  children: ReactNode;
}) {
  return (
    <WeddingSiteContext.Provider
      value={{ content, guest, sections, themeOverrides, mode, shareId, edit }}
    >
      {children}
    </WeddingSiteContext.Provider>
  );
}

export function useWeddingSite() {
  return useContext(WeddingSiteContext);
}

/** Drop-in replacement for the old DEMO constant inside template components */
export function useWeddingContent(): WeddingSiteContent {
  return useContext(WeddingSiteContext).content;
}

export function useWeddingThemeOverrides(): WeddingThemeOverrides {
  return useContext(WeddingSiteContext).themeOverrides;
}

export function useWeddingGuest() {
  return useContext(WeddingSiteContext).guest;
}

export function isSectionEnabled(
  sections: WeddingSectionToggles,
  id: string,
  fallback = true
) {
  const value = sections[id as keyof WeddingSectionToggles];
  return value === undefined ? fallback : value !== false;
}
