"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type { InteractiveInviteMusicTrack } from "@/types/interactiveInvite";

type Props = {
  tracks: InteractiveInviteMusicTrack[];
  defaultTrackId: string;
  accent: string;
  ink: string;
  paper: string;
  /** Call after first user gesture (e.g. envelope open) */
  autoStartToken: number;
};

export default function MusicController({
  tracks,
  defaultTrackId,
  accent,
  ink,
  paper,
  autoStartToken,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const customUrlRef = useRef<string | null>(null);
  const inputId = useId();
  const [trackId, setTrackId] = useState(defaultTrackId);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [customName, setCustomName] = useState<string | null>(null);

  const current = tracks.find((t) => t.id === trackId) || tracks[0];

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (playing) pause();
    else void play();
  }, [pause, play, playing]);

  useEffect(() => {
    if (autoStartToken > 0) void play();
  }, [autoStartToken, play]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || customName) return;
    audio.src = current.src;
    audio.loop = true;
    if (playing) void audio.play().catch(() => setPlaying(false));
  }, [current.src, customName, playing]);

  useEffect(() => {
    return () => {
      if (customUrlRef.current) URL.revokeObjectURL(customUrlRef.current);
    };
  }, []);

  const onCustomFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (customUrlRef.current) URL.revokeObjectURL(customUrlRef.current);
    const url = URL.createObjectURL(file);
    customUrlRef.current = url;
    setCustomName(file.name);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.loop = true;
      void play();
    }
  };

  const clearCustom = () => {
    if (customUrlRef.current) URL.revokeObjectURL(customUrlRef.current);
    customUrlRef.current = null;
    setCustomName(null);
    if (audioRef.current) {
      audioRef.current.src = current.src;
      if (playing) void audioRef.current.play().catch(() => setPlaying(false));
    }
  };

  return (
    <div className="ii-music fixed bottom-5 start-5 z-[80] flex flex-col items-start gap-2">
      <audio ref={audioRef} preload="metadata" playsInline />
      {open && (
        <div
          id="ii-music-panel"
          className="w-[min(86vw,280px)] rounded-2xl border p-3 shadow-xl backdrop-blur-md"
          style={{
            background: paper,
            borderColor: `${accent}55`,
            color: ink,
          }}
        >
          <p className="mb-2 text-[11px] font-semibold tracking-wide opacity-70">
            ספריית מנגינות
          </p>
          <ul className="mb-3 max-h-40 space-y-1 overflow-auto">
            {tracks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCustomName(null);
                    setTrackId(t.id);
                    void play();
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-start text-sm transition hover:bg-black/5"
                  style={{
                    background:
                      !customName && trackId === t.id ? `${accent}22` : "transparent",
                  }}
                >
                  <span>
                    <span className="block font-medium">{t.title}</span>
                    <span className="block text-[11px] opacity-60">{t.mood}</span>
                  </span>
                  {!customName && trackId === t.id && playing ? (
                    <span className="ii-eq" aria-hidden>
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          <label
            htmlFor={inputId}
            className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed px-3 py-2 text-xs font-medium"
            style={{ borderColor: `${accent}88`, color: ink }}
          >
            העלאת מוזיקה אישית
          </label>
          <input
            id={inputId}
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={onCustomFile}
          />
          {customName && (
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate opacity-80">{customName}</span>
              <button type="button" className="underline" onClick={clearCustom}>
                הסר
              </button>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={playing}
          aria-label={playing ? "השתק מוזיקה" : "נגן מוזיקה"}
          className="flex h-12 w-12 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition hover:scale-105"
          style={{
            background: paper,
            borderColor: `${accent}66`,
            color: ink,
          }}
        >
          {playing ? (
            <span className="ii-eq" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border px-3 py-2 text-xs font-medium shadow-md backdrop-blur-md"
          style={{ background: paper, borderColor: `${accent}66`, color: ink }}
          aria-expanded={open}
          aria-controls="ii-music-panel"
        >
          {open ? "סגירה" : "בחירת מנגינה"}
        </button>
      </div>
    </div>
  );
}
