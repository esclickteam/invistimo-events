import { WEDDING_DEMO_CONTENT } from "@/config/weddingWebsite/demoContent";
import { WW_VIDEOS } from "@/config/weddingWebsite/media";
import type { WeddingSiteContent, WeddingTemplate } from "@/types/weddingWebsite";
import type { WeddingWebsiteGuestContext } from "@/types/weddingWebsite";

export { useWeddingContent as useContent } from "./WeddingSiteContext";

/** Demo fallback — prefer useWeddingContent() inside React components */
export const DEMO = WEDDING_DEMO_CONTENT;

/** Verified working videos (Pexels). Keys kept for template compatibility. */
export const VIDEOS = {
  couple: WW_VIDEOS.coupleWalk,
  romantic: WW_VIDEOS.romantic,
  beach: WW_VIDEOS.natureSoft,
  forest: WW_VIDEOS.natureSoft,
  party: WW_VIDEOS.celebration,
  rings: WW_VIDEOS.romantic,
};

export function formatHebrewDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function useCountdown(targetDate: string, targetTime: string) {
  const target = `${targetDate}T${targetTime || "00:00"}:00`;
  const calc = () => {
    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };
  return { target, calc };
}

export type TemplateProps = {
  template: WeddingTemplate;
  embed?: boolean;
  content?: WeddingSiteContent;
  guest?: WeddingWebsiteGuestContext | null;
  mode?: "demo" | "live";
  shareId?: string | null;
  hideDemoBadge?: boolean;
};
