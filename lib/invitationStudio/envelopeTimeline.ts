/** Shared envelope open / card-rise timing for live CSS and MP4 export. */

export type EnvelopeTimeline = {
  /** 1 = closed, 0 = fully open */
  flap: number;
  /** 0 = tucked in pocket, 1 = full frame */
  rise: number;
  /** Envelope chrome fade */
  envelopeAlpha: number;
  /** Seal visible while flap still covers the pocket mouth */
  sealVisible: boolean;
  /** Card should paint above the pocket lip */
  cardAbovePocket: boolean;
};

export const ENVELOPE_FLAP_START = 1.05;
export const ENVELOPE_FLAP_DURATION = 1.35;
/** Card begins rising while the flap is still opening — no blank-paper gap. */
export const ENVELOPE_RISE_START = 1.55;
export const ENVELOPE_RISE_DURATION = 2.8;
export const ENVELOPE_FADE_START = 4.7;
export const ENVELOPE_FADE_DURATION = 0.7;

export function envelopeTimeline(time: number): EnvelopeTimeline {
  const flap =
    time < ENVELOPE_FLAP_START
      ? 1
      : Math.max(0, 1 - (time - ENVELOPE_FLAP_START) / ENVELOPE_FLAP_DURATION);
  const rise = Math.max(
    0,
    Math.min(1, (time - ENVELOPE_RISE_START) / ENVELOPE_RISE_DURATION)
  );
  const envelopeAlpha =
    time < ENVELOPE_FADE_START
      ? 1
      : Math.max(0, 1 - (time - ENVELOPE_FADE_START) / ENVELOPE_FADE_DURATION);
  return {
    flap,
    rise,
    envelopeAlpha,
    sealVisible: flap > 0.35,
    cardAbovePocket: rise > 0.02,
  };
}
