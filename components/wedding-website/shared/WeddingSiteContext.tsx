"use client";

import { createContext, useContext, type ReactNode } from "react";
import { WEDDING_DEMO_CONTENT } from "@/config/weddingWebsite/demoContent";
import type {
  WeddingSectionToggles,
  WeddingSiteContent,
  WeddingWebsiteGuestContext,
} from "@/types/weddingWebsite";

export type WeddingSiteContextValue = {
  content: WeddingSiteContent;
  guest: WeddingWebsiteGuestContext | null;
  sections: WeddingSectionToggles;
  mode: "demo" | "live";
  shareId: string | null;
};

const WeddingSiteContext = createContext<WeddingSiteContextValue>({
  content: WEDDING_DEMO_CONTENT,
  guest: null,
  sections: {},
  mode: "demo",
  shareId: null,
});

export function WeddingSiteProvider({
  content,
  guest = null,
  sections = {},
  mode = "demo",
  shareId = null,
  children,
}: {
  content: WeddingSiteContent;
  guest?: WeddingWebsiteGuestContext | null;
  sections?: WeddingSectionToggles;
  mode?: "demo" | "live";
  shareId?: string | null;
  children: ReactNode;
}) {
  return (
    <WeddingSiteContext.Provider
      value={{ content, guest, sections, mode, shareId }}
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
