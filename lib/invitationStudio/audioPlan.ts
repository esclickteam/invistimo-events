import type { StudioMusic } from "@/lib/invitationStudio/types";

export function syncDelayMs(sync: StudioMusic["sync"], speed = 1) {
  const base = sync === "names" ? 1800 : sync === "details" ? 3200 : 0;
  const safe = Math.max(0.6, Math.min(1.6, speed || 1));
  return Math.round(base / safe);
}

export function libraryMusic(sync: StudioMusic["sync"] = "start"): StudioMusic {
  return {
    mode: "library",
    cueId: "evening-motif",
    start: 0.4,
    end: 12,
    fadeIn: 0.8,
    fadeOut: 1.4,
    volume: 0.72,
    sync,
    rightsConfirmed: true,
  };
}
