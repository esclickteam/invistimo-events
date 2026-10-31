import type { InteractiveInviteMusicTrack } from "@/types/interactiveInvite";

/**
 * Synthetic ambient beds generated for this preview (no third-party audio).
 * Future: swap for curated licensed library + customer uploads via INVISTIMO media API.
 */
export const INTERACTIVE_INVITE_MUSIC: InteractiveInviteMusicTrack[] = [
  {
    id: "soft-dusk",
    title: "שקיעה רכה",
    artist: "INVISTIMO Ambient",
    src: "/preview/interactive-invites/music/soft-dusk.mp3",
    mood: "חמים ושקט",
  },
  {
    id: "warm-ember",
    title: "גחלת חמה",
    artist: "INVISTIMO Ambient",
    src: "/preview/interactive-invites/music/warm-ember.mp3",
    mood: "עמוק ואינטימי",
  },
  {
    id: "pearl-tide",
    title: "גאות פנינה",
    artist: "INVISTIMO Ambient",
    src: "/preview/interactive-invites/music/pearl-tide.mp3",
    mood: "קליל ופתוח",
  },
  {
    id: "velvet-night",
    title: "לילה קטיפתי",
    artist: "INVISTIMO Ambient",
    src: "/preview/interactive-invites/music/velvet-night.mp3",
    mood: "אלגנטי ולילי",
  },
];

export function getInteractiveInviteMusic(id: string) {
  return INTERACTIVE_INVITE_MUSIC.find((t) => t.id === id) || INTERACTIVE_INVITE_MUSIC[0];
}
