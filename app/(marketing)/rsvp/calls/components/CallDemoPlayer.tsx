"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { DEMO_KEYPAD, DEMO_SCRIPT_LINES } from "../content";

const LINE_MS = 3200;

export default function CallDemoPlayer() {
  const reduce = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const [pressed, setPressed] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeech = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    utterRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    clearTimer();
    stopSpeech();
    setPlaying(false);
  }, [clearTimer, stopSpeech]);

  useEffect(() => () => stopAll(), [stopAll]);

  const speakCurrent = useCallback(
    (idx: number) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      stopSpeech();
      const text = DEMO_SCRIPT_LINES[idx];
      if (!text) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "he-IL";
      u.rate = 0.95;
      utterRef.current = u;
      window.speechSynthesis.speak(u);
    },
    [stopSpeech]
  );

  const start = () => {
    setPressed(null);
    setResult(null);
    setLineIdx(0);
    setPlaying(true);
    if (!reduce) speakCurrent(0);
    clearTimer();
    let i = 0;
    timerRef.current = setInterval(() => {
      i += 1;
      if (i >= DEMO_SCRIPT_LINES.length) {
        stopAll();
        setLineIdx(DEMO_SCRIPT_LINES.length - 1);
        return;
      }
      setLineIdx(i);
      if (!reduce) speakCurrent(i);
    }, LINE_MS);
  };

  const toggle = () => {
    if (playing) {
      stopAll();
      return;
    }
    start();
  };

  const onKey = (digit: string) => {
    const item = DEMO_KEYPAD.find((k) => k.digit === digit);
    if (!item) return;
    stopAll();
    setPressed(digit);
    setResult(`${item.result} — ${item.next}`);
  };

  const bars = reduce ? 12 : 24;

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-gradient-to-br from-[#FFFDF8] via-[#FBF6EE] to-[#F3E8D6] shadow-[0_24px_60px_rgba(58,39,20,0.1)]">
      <div className="border-b border-[#E8D9C2] bg-[#2A211A] px-5 py-4 text-[#F7EDDF]">
        <p className="text-xs font-black tracking-[0.18em] text-[#E8C988]">האזינו לדוגמה</p>
        <p className="mt-1 text-lg font-black">שיחת אישור הגעה מוקלטת — הדגמה</p>
        <p className="mt-1 text-sm text-[#C9B8A4]">
          הדגמה להמחשה בלבד. לא הקלטה שנשלחה ללקוח. התסריט תואם את מקשי המערכת בפועל.
        </p>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[1.1fr_0.9fr] md:p-7">
        <div>
          <div className="flex items-end gap-[3px] h-16" aria-hidden>
            {Array.from({ length: bars }).map((_, i) => {
              const active = playing && !reduce;
              const h = active
                ? 20 + ((i * 17 + lineIdx * 11) % 44)
                : 10 + (i % 5) * 4;
              return (
                <span
                  key={i}
                  className={`w-full max-w-[8px] rounded-full bg-gradient-to-t from-[#8A642E] to-[#E8C988] transition-[height] duration-300 ${
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
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-7 text-sm font-black text-white shadow-[0_14px_32px_rgba(58,39,20,0.2)] transition hover:-translate-y-0.5"
              aria-pressed={playing}
            >
              {playing ? "השהה" : "נגן הדגמה"}
            </button>
            <span className="text-sm font-semibold text-[#7A6042]">
              כ־{Math.round((DEMO_SCRIPT_LINES.length * LINE_MS) / 1000)} שניות · לחיצה מתחילה קריינות בדפדפן כשזמינה
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-[#E8D9C2] bg-white/80 p-4">
            <p className="text-xs font-black tracking-[0.14em] text-[#8A642E]">תמלול נגיש</p>
            <ol className="mt-3 space-y-2">
              {DEMO_SCRIPT_LINES.map((line, i) => (
                <li
                  key={line}
                  className={`text-[15px] leading-7 transition ${
                    i === lineIdx && playing
                      ? "font-bold text-[#2A211A]"
                      : "text-[#5C4A3A]"
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
            כך נראית בחירת המענה בשיחה המוקלטת. התוצאה כאן להמחשה בלבד.
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
              תוצאה בהדגמה: {result}
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
