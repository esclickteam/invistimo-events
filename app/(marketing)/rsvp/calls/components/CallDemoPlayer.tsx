"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  DEMO_AUDIO_SRC,
  DEMO_AUDIO_VOICE_NOTE,
  DEMO_KEYPAD,
  DEMO_SCRIPT_LINES,
} from "../content";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallDemoPlayer() {
  const reduce = useReducedMotion();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [pressed, setPressed] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onLoaded = () => {
      setReady(true);
      setUnavailable(false);
      setDuration(el.duration || 0);
    };
    const onTime = () => {
      setCurrent(el.currentTime || 0);
      if (el.duration > 0) {
        const progress = el.currentTime / el.duration;
        const idx = Math.min(
          DEMO_SCRIPT_LINES.length - 1,
          Math.floor(progress * DEMO_SCRIPT_LINES.length)
        );
        setLineIdx(idx);
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
      setLineIdx(0);
    };
    const onError = () => {
      setUnavailable(true);
      setReady(false);
      setPlaying(false);
    };

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    el.load();

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
  }, []);

  const toggle = useCallback(async () => {
    const el = audioRef.current;
    if (!el || unavailable) return;
    if (playing) {
      el.pause();
      return;
    }
    try {
      await el.play();
    } catch {
      setUnavailable(true);
    }
  }, [playing, unavailable]);

  const onKey = (digit: string) => {
    const item = DEMO_KEYPAD.find((k) => k.digit === digit);
    if (!item) return;
    setPressed(digit);
    setResult(`${item.result} — ${item.next}`);
  };

  const bars = reduce ? 12 : 28;
  const progress = duration > 0 ? current / duration : 0;

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-gradient-to-br from-[#FFFDF8] via-[#FBF6EE] to-[#F3E8D6] shadow-[0_24px_60px_rgba(58,39,20,0.1)]">
      <div className="border-b border-[#E8D9C2] bg-[#2A211A] px-5 py-4 text-[#F7EDDF]">
        <p className="text-xs font-black tracking-[0.18em] text-[#E8C988]">האזינו לדוגמה</p>
        <p className="mt-1 text-lg font-black">שיחת אישור הגעה מוקלטת — קול דנה</p>
        <p className="mt-1 text-sm text-[#C9B8A4]">{DEMO_AUDIO_VOICE_NOTE}</p>
      </div>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- transcript below */}
      <audio ref={audioRef} src={DEMO_AUDIO_SRC} preload="metadata" playsInline />

      <div className="grid gap-6 p-5 md:grid-cols-[1.1fr_0.9fr] md:p-7">
        <div>
          <div className="flex h-16 items-end gap-[3px]" aria-hidden>
            {Array.from({ length: bars }).map((_, i) => {
              const active = playing && !reduce;
              const wave =
                18 +
                Math.abs(Math.sin(i * 0.55 + progress * 18)) * 42 +
                ((i * 13) % 17);
              const h = active ? wave : 10 + (i % 5) * 4;
              return (
                <span
                  key={i}
                  className={`w-full max-w-[8px] rounded-full bg-gradient-to-t from-[#8A642E] to-[#E8C988] transition-[height] duration-150 ${
                    active ? "opacity-100" : "opacity-45"
                  }`}
                  style={{ height: `${h}%`, minHeight: 8 }}
                />
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              disabled={unavailable}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-7 text-sm font-black text-white shadow-[0_14px_32px_rgba(58,39,20,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              aria-pressed={playing}
            >
              {playing ? "השהה הדגמה" : "נגן הדגמה"}
            </button>
            <span className="text-sm font-semibold text-[#7A6042]" dir="ltr">
              {unavailable
                ? "קובץ ההדגמה אינו זמין כרגע"
                : ready
                  ? `${formatTime(current)} / ${formatTime(duration)}`
                  : "טוען משך הקלטה…"}
            </span>
          </div>

          {unavailable ? (
            <p className="mt-4 rounded-2xl border border-[#E0BDBD] bg-[#F8EAEA] px-4 py-3 text-sm font-bold leading-7 text-[#7A3A3A]" role="alert">
              לא הצלחנו לטעון את קובץ הקריינות של דנה. נסו לרענן את העמוד מאוחר יותר — אין השמעת קול
              חלופי מהדפדפן.
            </p>
          ) : null}

          <div className="mt-6 rounded-2xl border border-[#E8D9C2] bg-white/80 p-4">
            <p className="text-xs font-black tracking-[0.14em] text-[#8A642E]">תמלול נגיש</p>
            <ol className="mt-3 space-y-2">
              {DEMO_SCRIPT_LINES.map((line, i) => (
                <li
                  key={line}
                  className={`text-[15px] leading-7 transition ${
                    i === lineIdx && playing ? "font-bold text-[#2A211A]" : "text-[#5C4A3A]"
                  }`}
                  aria-current={i === lineIdx && playing ? "true" : undefined}
                >
                  {line}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div>
          <p className="text-sm font-black text-[#2A211A]">הקישו בתצוגת הדגמה</p>
          <p className="mt-1 text-sm leading-6 text-[#5C4A3A]">
            המחשה בלבד — לא מעדכנת אישורי הגעה אמיתיים ולא נשלחת למסד הנתונים.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {DEMO_KEYPAD.map((k) => (
              <button
                key={k.digit}
                type="button"
                onClick={() => onKey(k.digit)}
                className={`rounded-2xl border px-3 py-4 text-center transition hover:-translate-y-0.5 ${
                  pressed === k.digit
                    ? "border-[#8A642E] bg-[#8A642E] text-white shadow-[0_12px_28px_rgba(138,100,46,0.25)]"
                    : "border-[#E6D2AA] bg-[#FFFDF8] text-[#2A211A] hover:border-[#C9A45C]"
                }`}
              >
                <span className="block text-2xl font-black">{k.digit}</span>
                <span className="mt-1 block text-xs font-bold leading-5 opacity-90">{k.label}</span>
              </button>
            ))}
          </div>
          {result ? (
            <p
              className="mt-4 rounded-2xl border border-[#E6D2AA] bg-[#F7EDDF] px-4 py-3 text-sm font-bold leading-7 text-[#2A211A]"
              role="status"
            >
              תוצאה בהדגמה בלבד: {result}
            </p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[#7A6042]">
              בחרו מקש כדי לראות איך התשובה ממופה בסטטוסים: אישר הגעה / לא מגיע / מתלבט.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
