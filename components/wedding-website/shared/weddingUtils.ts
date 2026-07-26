import { WEDDING_DEMO_CONTENT } from "@/config/weddingWebsite/demoContent";
import type { WeddingTemplate } from "@/types/weddingWebsite";

export const DEMO = WEDDING_DEMO_CONTENT;

export const VIDEOS = {
  couple: "https://assets.mixkit.co/videos/preview/mixkit-wedding-couple-holding-hands-4826-large.mp4",
  romantic: "https://assets.mixkit.co/videos/preview/mixkit-romantic-couple-looking-at-each-other-4179-large.mp4",
  beach: "https://assets.mixkit.co/videos/preview/mixkit-white-sand-beach-and-palm-trees-1564-large.mp4",
  forest: "https://assets.mixkit.co/videos/preview/mixkit-young-couple-walking-in-a-forest-4256-large.mp4",
  party: "https://assets.mixkit.co/videos/preview/mixkit-people-dancing-at-a-party-1174-large.mp4",
  rings: "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-couple-with-wedding-rings-4830-large.mp4",
};

export function formatHebrewDate(dateStr: string) {
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
  const target = `${targetDate}T${targetTime}:00`;
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
};
