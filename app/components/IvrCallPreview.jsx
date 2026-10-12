"use client";

import { useEffect, useRef, useState } from "react";
import {
  createPreviewSim,
  IVR_PREVIEW_COUNT_IDLE_MS,
  previewSimClipEnded,
  previewSimCountIdle,
  previewSimDigit,
} from "@/lib/calls/ivrPreviewSim";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function captionFor(sim, texts) {
  if (!texts) return "";
  if (sim.clip === "invalidChoice") return texts.invalidChoice;
  if (sim.clip === "invalidCount") return texts.invalidCount;
  if (sim.clip === "askCount" || sim.phase === "count") return texts.askCount;
  if (sim.clip === "thanksYes") return texts.thanksYes;
  if (sim.clip === "thanksOther") return texts.thanksOther;
  if (sim.phase === "ended") {
    return sim.countDigits ? texts.thanksYes : texts.thanksOther;
  }
  return texts.intro;
}

export default function IvrCallPreview({ userId = "" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [sim, setSim] = useState(createPreviewSim);
  const [runId, setRunId] = useState(0);
  const audioRef = useRef(null);
  const playToken = useRef(0);

  function stopAudio() {
    playToken.current += 1;
    const audio = audioRef.current;
    if (!audio) return;
    audio.onended = null;
    audio.pause();
    audio.removeAttribute("src");
  }

  function close() {
    stopAudio();
    setOpen(false);
  }

  async function openPreview() {
    setOpen(true);
    setLoading(true);
    setError("");
    setPayload(null);
    setSim(createPreviewSim());
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    try {
      const res = await fetch(`/api/ivr/preview${qs}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "לא הצלחנו לטעון את השיחה לדוגמה.");
      }
      setPayload(data);
      if (!data.ready) {
        setError(data.message || "הקריינות לדוגמה עדיין לא זמינה.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "לא הצלחנו לטעון את השיחה לדוגמה.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !payload?.ready || !sim.clip) {
      if (!open || !sim.clip) stopAudio();
      return undefined;
    }
    const urls =
      sim.clip === "intro"
        ? payload.introUrls || []
        : [payload.clips?.[sim.clip]].filter(Boolean);
    if (!urls.length) return undefined;

    const token = ++playToken.current;
    const audio = audioRef.current || new Audio();
    audioRef.current = audio;
    let index = 0;

    const step = () => {
      if (token !== playToken.current) return;
      if (index >= urls.length) {
        setSim((current) => previewSimClipEnded(current));
        return;
      }
      audio.src = urls[index];
      index += 1;
      audio.play().catch(() => {
        if (token !== playToken.current) return;
        setError("לא הצלחנו להשמיע את הקריינות.");
      });
    };

    audio.onended = step;
    step();
    return () => {
      if (token === playToken.current) stopAudio();
    };
    // Restart only when the clip changes, not while count digits accumulate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payload, sim.clip, runId]);

  useEffect(() => {
    if (!open || !sim.countDigits) return undefined;
    if (
      sim.clip === "intro" ||
      sim.clip === "invalidChoice" ||
      sim.clip === "thanksYes" ||
      sim.clip === "thanksOther"
    ) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setSim((current) => previewSimCountIdle(current));
    }, IVR_PREVIEW_COUNT_IDLE_MS);
    return () => clearTimeout(timer);
  }, [open, sim.countDigits, sim.clip, sim.phase]);

  useEffect(() => () => stopAudio(), []);

  const caption = captionFor(sim, payload?.texts);

  return (
    <>
      <button
        type="button"
        data-testid="ivr-preview-open"
        onClick={() => void openPreview()}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#E7D8C6] bg-white px-4 py-2 text-sm font-black text-[#3A2A1C] shadow-sm transition hover:bg-[#FFF8EE]"
      >
        🎧 האזנה לשיחה לדוגמה
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1E1B2E]/55 p-3 sm:items-center"
          dir="rtl"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="האזנה לשיחה לדוגמה"
            data-testid="ivr-preview-dialog"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-[28px] border border-[#E7D8C6] bg-[#241A14] p-4 text-white shadow-2xl sm:p-5"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-[#E7D8C6]">
                  האזנה בלבד · בלי חיוג ובלי עדכון אישורי הגעה
                </div>
                <div className="mt-1 text-base font-black">
                  {payload?.spokenName || "שיחה לדוגמה"}
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-black"
                aria-label="סגירה"
              >
                ×
              </button>
            </div>

            <div
              data-testid="ivr-preview-screen"
              data-phase={sim.phase}
              data-clip={sim.clip || ""}
              className="min-h-36 rounded-2xl bg-[#3A2A1C] px-4 py-3 text-sm font-bold leading-6 text-[#FFF8EE]"
            >
              {loading ? "טוען את הקריינות..." : null}
              {!loading && error ? <p>{error}</p> : null}
              {!loading && payload?.ready ? (
                <>
                  <p className="whitespace-pre-line">{caption}</p>
                  {sim.phase === "count" || sim.clip === "askCount" ? (
                    <p
                      data-testid="ivr-preview-count"
                      className="mt-2 text-center text-2xl font-black tracking-[0.3em]"
                      dir="ltr"
                    >
                      {sim.countDigits || "—"}
                    </p>
                  ) : null}
                  {sim.phase === "ended" ? (
                    <p className="mt-2 text-xs text-[#E7D8C6]">השיחה לדוגמה הסתיימה</p>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2" dir="ltr">
              {KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  data-testid={`ivr-preview-key-${key}`}
                  disabled={!payload?.ready || loading || sim.phase === "ended"}
                  onClick={() => setSim((current) => previewSimDigit(current, key))}
                  className="h-12 rounded-full bg-white/10 text-lg font-black text-white transition hover:bg-white/20 disabled:opacity-40 sm:h-14"
                >
                  {key}
                </button>
              ))}
            </div>

            <button
              type="button"
              data-testid="ivr-preview-restart"
              disabled={!payload?.ready || loading}
              onClick={() => {
                setError("");
                setSim(createPreviewSim());
                setRunId((current) => current + 1);
              }}
              className="mt-4 w-full rounded-xl bg-[#B97821] py-2 text-sm font-black text-white disabled:opacity-50"
            >
              השמעה מחדש
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
