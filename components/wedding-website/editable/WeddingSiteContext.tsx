"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { WeddingGiftLinks } from "@/lib/weddingWebsite/gifts";
import type { WeddingDemoContent, WeddingMediaSlot, WeddingTemplate, WeddingTextStyle } from "@/types/weddingWebsite";

export type WeddingSiteMode = "public" | "editor";

export type WeddingSiteSelection =
  | { type: "text"; path: string; label: string }
  | { type: "media"; path: string; label: string }
  | { type: "section"; path: string; label: string }
  | { type: "gallery"; path: string; label: string }
  | { type: "countdown"; path: string; label: string }
  | null;

export type WeddingLiveRole = "demo" | "guest" | "couple";

export type WeddingLiveMeta = {
  shareId?: string;
  token?: string;
  invitationId?: string;
  role: WeddingLiveRole;
  gifts?: WeddingGiftLinks | null;
};

export type WeddingSiteEditorApi = {
  selection: WeddingSiteSelection;
  setSelection: (selection: WeddingSiteSelection) => void;
  updateContent: (updater: (current: WeddingDemoContent) => WeddingDemoContent) => void;
  updateText: (path: string, value: string) => void;
  updateTextStyle: (path: string, style: WeddingTextStyle | null) => void;
  updateMedia: (slotId: string, slot: WeddingMediaSlot | null) => void;
  toggleSection: (id: string, visible: boolean) => void;
  moveSection: (id: string, direction: -1 | 1) => void;
  setSectionOrder: (order: string[]) => void;
  resetStyle: (path: string) => void;
  uploadMedia: (file: File) => Promise<WeddingMediaSlot>;
};

type WeddingSiteContextValue = {
  mode: WeddingSiteMode;
  template: WeddingTemplate;
  content: WeddingDemoContent;
  editor: WeddingSiteEditorApi | null;
  live?: WeddingLiveMeta | null;
};

const WeddingSiteContext = createContext<WeddingSiteContextValue | null>(null);

export function WeddingSiteProvider({
  mode = "public",
  template,
  content,
  editor = null,
  live = null,
  children,
}: WeddingSiteContextValue & { children: ReactNode }) {
  return (
    <WeddingSiteContext.Provider value={{ mode, template, content, editor, live }}>
      {children}
    </WeddingSiteContext.Provider>
  );
}

export function useWeddingSite() {
  return useContext(WeddingSiteContext);
}

export function useWeddingSiteEditor() {
  return useWeddingSite()?.editor || null;
}
