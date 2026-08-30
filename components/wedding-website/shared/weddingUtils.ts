import type { ReactNode } from "react";
import { WEDDING_DEMO_CONTENT } from "@/config/weddingWebsite/demoContent";
import type { WeddingDemoContent, WeddingTemplate } from "@/types/weddingWebsite";
import type { GuestRsvpController } from "@/lib/rsvp/useGuestRsvpController";
import {
  getGoogleMapsEmbedUrl,
  getGoogleMapsLink,
  getWazeLink,
} from "@/lib/navigationLinks";

let liveContent: WeddingDemoContent | null = null;

export function setLiveWeddingContent(content: WeddingDemoContent | null) {
  liveContent = content;
}

export const DEMO = new Proxy(WEDDING_DEMO_CONTENT, {
  get(_target, prop) {
    const source = liveContent || WEDDING_DEMO_CONTENT;
    return source[prop as keyof WeddingDemoContent];
  },
});

export function getVenueLocation() {
  return {
    name: String(DEMO.venueName || "").trim(),
    address: String(DEMO.venueAddress || "").trim(),
    lat: DEMO.venueLat ?? null,
    lng: DEMO.venueLng ?? null,
  };
}

export function getVenueMapEmbedUrl(zoom = 14) {
  return getGoogleMapsEmbedUrl(getVenueLocation(), zoom) || "";
}

export function getVenueGoogleMapsLink() {
  return getGoogleMapsLink(getVenueLocation()) || "";
}

export function getVenueWazeLink() {
  return getWazeLink(getVenueLocation()) || "";
}

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
  live?: boolean;
  rsvpController?: GuestRsvpController | null;
  guestMessageSlot?: ReactNode;
};
