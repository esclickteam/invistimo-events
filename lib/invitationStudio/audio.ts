import { syncDelayMs } from "@/lib/invitationStudio/audioPlan";
import type { StudioMusic } from "@/lib/invitationStudio/types";

export type StudioPlayback = {
  stop: () => void;
  setMuted: (muted: boolean) => void;
};

export function startStudioAudio(music: StudioMusic, speed = 1, preview = false): StudioPlayback {
  const src =
    music.mode === "library" ? "/invitation-studio/music/evening-motif.wav" : music.dataUrl || "";
  const audio = new Audio();
  if (!src) {
    return { stop() {}, setMuted() {} };
  }
  audio.preload = "auto";
  audio.src = src;
  let timer = 0;
  let frame = 0;
  let stopped = false;
  const start = Math.max(0, Number(music.start) || 0);
  const requestedEnd = Number(music.end) || 0;
  const end = requestedEnd > start ? requestedEnd : start + 8;
  const fadeIn = Math.max(0, Number(music.fadeIn) || 0);
  const fadeOut = Math.max(0, Number(music.fadeOut) || 0);
  const volume = Math.max(0, Math.min(1, Number(music.volume ?? 0.8)));
  const delay = preview ? 0 : syncDelayMs(music.sync || "start", speed);

  const begin = () => {
    if (stopped) return;
    const length = Math.max(200, (end - start) * 1000);
    const playSlice = () => {
      if (stopped) return;
      audio.currentTime = start;
      const t0 = performance.now();
      const tick = () => {
        if (stopped) return;
        const elapsed = performance.now() - t0;
        if (elapsed >= length || (audio.currentTime > start && audio.currentTime >= end - 0.03)) {
          audio.pause();
          return;
        }
        let level = volume;
        if (fadeIn > 0 && elapsed < fadeIn * 1000) level = volume * (elapsed / (fadeIn * 1000));
        const fadeStart = length - fadeOut * 1000;
        if (fadeOut > 0 && elapsed > fadeStart) level = volume * Math.max(0, (length - elapsed) / (fadeOut * 1000));
        if (!audio.muted) audio.volume = Math.max(0, Math.min(1, level));
        frame = requestAnimationFrame(tick);
      };
      audio.play().catch(() => undefined);
      tick();
    };
    if (audio.readyState >= 1) playSlice();
    else audio.addEventListener("loadedmetadata", playSlice, { once: true });
  };

  audio.play().then(() => {
    audio.pause();
    if (delay <= 40) begin();
    else timer = window.setTimeout(begin, delay);
  }).catch(() => undefined);

  return {
    stop() {
      stopped = true;
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      audio.pause();
    },
    setMuted(muted: boolean) {
      audio.muted = muted;
    },
  };
}
