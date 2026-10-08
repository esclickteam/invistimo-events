"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatCallRoundDateTimeDmy,
  formatCallRoundDateTimeInput,
} from "@/lib/calls/callRoundScheduleTime";

function roundStatusLabel(status) {
  const raw = String(status || "").toLowerCase();
  if (raw === "done" || raw === "completed") return "הושלם";
  if (raw === "failed") return "נכשל";
  if (raw === "in_progress" || raw === "opened") return "מתבצע";
  if (raw === "cancelled" || raw === "canceled") return "בוטל";
  return "מתוזמן";
}

const SELF_MAX_SECONDS = 45;

const GENDER_CHOICES = [
  { gender: "female", label: "קול נשי" },
  { gender: "male", label: "קול גברי" },
];

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function customerIvrError(raw, fallback) {
  const text = String(raw || "");
  if (
    /Cast to Object failed|User validation failed|ValidationError/i.test(text)
  ) {
    return "שמירת ההקלטה נכשלה בגלל מבנה נתונים לא תקין. הנתונים הקיימים לא נמחקו. נסו שוב.";
  }
  if (text.includes("טעינת רשימת הקולות")) {
    return fallback || "יצירת שם האירוע נכשלה. בחרו קול נשי או קול גברי ונסו שוב.";
  }
  return text || fallback || "שגיאה";
}

function splitIsraelInput(value) {
  const wall = formatCallRoundDateTimeInput(value);
  if (!wall || !wall.includes("T")) return { date: "", time: "" };
  const [y, m, d] = wall.slice(0, 10).split("-");
  return { date: `${d}/${m}/${y}`, time: wall.slice(11, 16) };
}

function joinIsraelInput(dateText, timeText) {
  const date = String(dateText || "")
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const time = String(timeText || "")
    .trim()
    .match(/^(\d{2}):(\d{2})$/);
  if (!date || !time) return "";
  const day = Number(date[1]);
  const month = Number(date[2]);
  const hour = Number(time[1]);
  const minute = Number(time[2]);
  if (
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59
  ) {
    return "";
  }
  return `${date[3]}-${date[2]}-${date[1]}T${time[1]}:${time[2]}`;
}

function IsraelDateTimeFields({ value, onChange }) {
  const parsed = splitIsraelInput(value);
  const [dateText, setDateText] = useState(parsed.date);
  const [timeText, setTimeText] = useState(parsed.time);

  useEffect(() => {
    const next = splitIsraelInput(value);
    setDateText(next.date);
    setTimeText(next.time);
  }, [value]);

  function commit(nextDate, nextTime) {
    setDateText(nextDate);
    setTimeText(nextTime);
    const dateEmpty = !String(nextDate || "").trim();
    const timeEmpty = !String(nextTime || "").trim();
    if (dateEmpty && timeEmpty) {
      onChange("");
      return;
    }
    const joined = joinIsraelInput(nextDate, nextTime);
    if (joined) onChange(joined);
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label className="block text-[11px] font-black text-[#8A7867]">
        תאריך (DD/MM/YYYY)
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="08/10/2026"
          value={dateText}
          onChange={(e) => commit(e.target.value, timeText)}
          className="mt-1 w-full rounded-xl border border-[#E7D8C6] bg-white px-3 py-2 text-sm font-bold text-[#3A2A1C]"
          data-testid="ivr-round-date"
        />
      </label>
      <label className="block text-[11px] font-black text-[#8A7867]">
        שעה (HH:mm)
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="18:00"
          value={timeText}
          onChange={(e) => commit(dateText, e.target.value)}
          className="mt-1 w-full rounded-xl border border-[#E7D8C6] bg-white px-3 py-2 text-sm font-bold text-[#3A2A1C]"
          data-testid="ivr-round-time"
        />
      </label>
    </div>
  );
}

/** Play global before + event name + global after as one continuous preview. */
function ConcatPreviewPlayer({ playlist, onEnded, label }) {
  const audioRef = useRef(null);
  const [index, setIndex] = useState(0);
  const urls = Array.isArray(playlist) ? playlist.filter(Boolean) : [];

  useEffect(() => {
    setIndex(0);
  }, [urls.join("|")]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !urls[index]) return;
    el.src = urls[index];
    el.play().catch(() => null);
  }, [index, urls]);

  if (!urls.length) return null;

  return (
    <div className="space-y-2">
      <audio
        ref={audioRef}
        controls
        className="w-full"
        onEnded={() => {
          if (index + 1 < urls.length) {
            setIndex((i) => i + 1);
          } else {
            onEnded?.();
          }
        }}
      />
      <p className="text-[11px] font-bold text-[#8A7867]">
        {label ? `${label} · ` : ""}
        מנגן קטע {index + 1} מתוך {urls.length} (פתיח → שם האירוע → המשך)
      </p>
    </div>
  );
}

function SingleClipPlayer({ url, label, onEnded }) {
  if (!url) {
    return (
      <p className="text-xs font-bold text-[#8A7867]">
        {label || "קטע גלובלי"} — עדיין לא זמין ב-Voice Pack
      </p>
    );
  }
  return (
    <div className="space-y-1">
      {label ? (
        <p className="text-[11px] font-bold text-[#8A7867]">{label}</p>
      ) : null}
      <audio
        controls
        autoPlay
        src={url}
        className="w-full"
        onEnded={() => onEnded?.()}
      />
    </div>
  );
}

function IvrCallSimulator({
  previewPlaylist,
  followUpAudio,
  systemPromptTexts,
  onClose,
  directionLabel,
}) {
  const [step, setStep] = useState("intro");
  const [choice, setChoice] = useState("");
  const [count, setCount] = useState("");

  const afterPress1Url = followUpAudio?.afterPress1Url || "";
  const afterValidQuantityUrl = followUpAudio?.afterValidQuantityUrl || "";
  const afterPress2Or3Url = followUpAudio?.afterPress2Or3Url || "";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4">
      <div
        dir="rtl"
        className="w-full max-w-lg rounded-3xl border border-[#E7D8C6] bg-white p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#3A2A1C]">
              תצוגה מקדימה — {directionLabel || "שיחה יוצאת"}
            </h3>
            <p className="mt-1 text-xs font-bold text-[#8A7867]">
              סימולציה מדפדפן, ללא שיחת Telnyx — הקטעים הקבועים מה-Voice Pack
              הגלובלי + שם האירוע בלבד.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E7D8C6] px-3 py-1 text-sm font-black"
          >
            ×
          </button>
        </div>

        {step === "intro" ? (
          <div className="space-y-3">
            <ConcatPreviewPlayer
              playlist={previewPlaylist}
              label={directionLabel || "שיחה יוצאת"}
              onEnded={() => setStep("choice")}
            />
            <button
              type="button"
              onClick={() => setStep("choice")}
              className="rounded-xl border border-[#E7D8C6] px-4 py-2 text-sm font-black"
            >
              המשך לבחירה 1/2/3
            </button>
          </div>
        ) : null}

        {step === "choice" ? (
          <div className="space-y-3">
            <p className="text-sm font-bold text-[#3A2A1C]">
              בחרו כפי שאורח היה מקיש בטלפון:
            </p>
            <div className="flex gap-2">
              {["1", "2", "3"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    setChoice(digit);
                    setStep(digit === "1" ? "after1" : "after23");
                  }}
                  className="flex-1 rounded-xl bg-[#B97821] px-3 py-3 text-lg font-black text-white"
                >
                  {digit}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === "after1" ? (
          <div className="space-y-3">
            <SingleClipPlayer
              url={afterPress1Url}
              label={
                systemPromptTexts?.afterPress1 ||
                systemPromptTexts?.askGuestCount ||
                "אחרי הקשה 1"
              }
            />
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
              placeholder="מספר מגיעים"
            />
            <button
              type="button"
              onClick={() => setStep("afterQty")}
              className="rounded-xl bg-[#B97821] px-4 py-2 text-sm font-black text-white"
            >
              המשך
            </button>
          </div>
        ) : null}

        {step === "afterQty" ? (
          <div className="space-y-3">
            <SingleClipPlayer
              url={afterValidQuantityUrl}
              label={
                systemPromptTexts?.afterValidQuantity ||
                systemPromptTexts?.thanksAttending ||
                "אישור הגעה"
              }
            />
            <p className="text-xs font-bold text-[#8A7867]">
              בחירה: 1{count ? ` · כמות: ${count}` : ""}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#E7D8C6] px-4 py-2"
            >
              סיום סימולציה
            </button>
          </div>
        ) : null}

        {step === "after23" ? (
          <div className="space-y-3">
            <SingleClipPlayer
              url={afterPress2Or3Url}
              label={
                systemPromptTexts?.afterPress2Or3 ||
                systemPromptTexts?.thanksReceived ||
                "תשובה התקבלה"
              }
            />
            <p className="text-xs font-bold text-[#8A7867]">
              בחירה: {choice}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#E7D8C6] px-4 py-2"
            >
              סיום סימולציה
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function IvrRoundsPanel({
  schedule,
  onScheduleChange,
  userId = "",
}) {
  const [config, setConfig] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorDirection, setSimulatorDirection] = useState("outbound");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);

  const previewText = useMemo(() => {
    return (
      cleanText(config?.ivrConfig?.previewText) ||
      cleanText(config?.ivrConfig?.recommendedScript) ||
      ""
    );
  }, [config]);

  const previewPlaylist = useMemo(() => {
    const preview = config?.ivrConfig?.previewAudio;
    if (preview?.seamless && preview?.composedIntroAudioUrl) {
      return [preview.composedIntroAudioUrl];
    }
    if (Array.isArray(preview?.playlist) && preview.playlist.length) {
      return preview.playlist;
    }
    return [
      preview?.introBeforeEventNameUrl,
      preview?.eventNameAudioUrl || config?.ivrConfig?.eventNameAudio?.audioUrl,
      preview?.introAfterEventNameUrl,
    ].filter(Boolean);
  }, [config]);

  const inboundPreviewPlaylist = useMemo(() => {
    const preview = config?.ivrConfig?.previewAudio;
    if (Array.isArray(preview?.inboundPlaylist) && preview.inboundPlaylist.length) {
      return preview.inboundPlaylist;
    }
    return [
      preview?.inboundBeforeEventNameUrl,
      preview?.eventNameAudioUrl || config?.ivrConfig?.eventNameAudio?.audioUrl,
      preview?.inboundAfterEventNameUrl,
    ].filter(Boolean);
  }, [config]);

  const composedReady = Boolean(
    config?.ivrConfig?.previewAudio?.seamless &&
      config?.ivrConfig?.previewAudio?.composedIntroAudioUrl
  );

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      // Never load /api/ivr/voices — gender radios are fixed (קול נשי / קול גברי).
      // packsReady is not a client gate.
      const [cfgRes, statsRes] = await Promise.all([
        fetch(`/api/ivr/config${qs}`, { credentials: "include" }),
        fetch(`/api/ivr/rounds/stats${qs}`, { credentials: "include" }),
      ]);

      const cfg = await cfgRes.json().catch(() => null);
      const statsData = await statsRes.json().catch(() => null);

      if (cfg?.approvalReset) {
        setMessage(
          "נוסח השיחה היוצאת תוקן. יש להאזין לרצף היוצא ולאשר מחדש לפני חיוג."
        );
      }
      if (!cfgRes.ok || !cfg?.ok) {
        throw new Error(
          customerIvrError(
            cfg?.message || cfg?.error,
            "טעינת הגדרות IVR נכשלה"
          )
        );
      }

      setConfig(cfg);
      setStats(Array.isArray(statsData?.rounds) ? statsData.rounds : []);
    } catch (err) {
      setError(
        customerIvrError(
          err instanceof Error ? err.message : "",
          "שגיאה בטעינה"
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function patchLocal(partial) {
    setConfig((prev) => ({
      ...prev,
      ivrConfig: {
        ...(prev?.ivrConfig || {}),
        ...partial,
      },
    }));
  }

  async function saveConfig(extra = {}) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const body = {
        userId,
        eventName: config?.ivrConfig?.eventName || "",
        eventNamePronunciation:
          config?.ivrConfig?.eventNamePronunciation || "",
        voiceGender: config?.ivrConfig?.voiceGender || "",
        audioMode: config?.ivrConfig?.audioMode || null,
        ...extra,
      };

      const res = await fetch("/api/ivr/config", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(
          customerIvrError(data?.message || data?.error, "שמירה נכשלה")
        );
      }
      setConfig((prev) => ({
        ...prev,
        ivrConfig: data.ivrConfig || prev?.ivrConfig,
      }));
      if (data.needsRegenerate) {
        setMessage(
          "שם האירוע או הקול השתנו — יש ליצור מחדש רק את שם האירוע ולאשר."
        );
      } else if (data.needsApproval) {
        setMessage("האודיו מוכן — יש לאשר אותו לפני חיוג.");
      } else {
        setMessage("ההגדרות נשמרו.");
      }
    } catch (err) {
      setError(
        customerIvrError(err instanceof Error ? err.message : "", "שמירה נכשלה")
      );
    } finally {
      setSaving(false);
    }
  }

  async function generateAi({ force = false } = {}) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/ivr/config", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_ai",
          userId,
          force,
          eventName: config?.ivrConfig?.eventName || "",
          eventNamePronunciation:
            config?.ivrConfig?.eventNamePronunciation || "",
          voiceGender: config?.ivrConfig?.voiceGender || "",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        const parts = [
          customerIvrError(
            data?.message || data?.error,
            "יצירת שם האירוע נכשלה"
          ),
        ];
        if (data?.providerStatusCode) {
          parts.push(String(data.providerStatusCode));
        }
        if (data?.providerDetail) {
          parts.push(String(data.providerDetail));
        }
        if (
          data?.error === "ELEVENLABS_INSUFFICIENT_CREDITS" ||
          data?.error === "ELEVENLABS_PAYMENT_REQUIRED" ||
          data?.providerStatus === 402
        ) {
          parts.unshift(
            "חסרים קרדיטים ב-ElevenLabs (402) — זה הגורם, לא בחירת הקול."
          );
        }
        throw new Error(parts.filter(Boolean).join(" · "));
      }
      patchLocal({
        audioMode: "ai",
        voiceGender: config?.ivrConfig?.voiceGender,
        eventNameAudio: data.eventNameAudio,
        composedIntroAudio: data.composedIntroAudio,
        previewAudio: data.previewAudio,
        previewText: data.previewText,
        recommendedScript: data.previewText,
        followUpAudio: data.followUpAudio || config?.ivrConfig?.followUpAudio,
      });
      setMessage(
        data.reused
          ? "שם האירוע לא השתנה — מנגנים Preview מחובר מהקבצים הקיימים (ללא ElevenLabs)."
          : data.reusedEventName
            ? "חובר מחדש משפט אחד רציף מהקטעים הקיימים (ללא ElevenLabs נוסף). האזינו ואשרו."
            : "נוצר רק שם האירוע וחובר למשפט אחד רציף. האזינו לתצוגה המקדימה ואשרו."
      );
    } catch (err) {
      setError(
        customerIvrError(
          err instanceof Error ? err.message : "",
          "יצירת שם האירוע נכשלה"
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function approveAudio() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ivr/config", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_audio", userId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(
          customerIvrError(data?.message || data?.error, "אישור נכשל")
        );
      }
      setConfig((prev) => ({
        ...prev,
        ivrConfig: data.ivrConfig || prev?.ivrConfig,
      }));
      setMessage("ההודעה אושרה ומוכנה לשיחות IVR.");
    } catch (err) {
      setError(
        customerIvrError(err instanceof Error ? err.message : "", "אישור נכשל")
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadBlob(blob, durationSeconds, source) {
    const form = new FormData();
    form.append(
      "file",
      blob,
      source === "recording" ? "recording.webm" : "upload.mp3"
    );
    form.append("durationSeconds", String(durationSeconds || 0));
    form.append("source", source);

    const res = await fetch("/api/ivr/audio/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      throw new Error(
        customerIvrError(data?.message || data?.error, "העלאת האודיו נכשלה")
      );
    }
    patchLocal({
      audioMode: "self_recorded",
      introAudio: data.introAudio,
    });
    setMessage("ההקלטה נשמרה — האזינו ואשרו לפני השיחות.");
  }

  async function deleteRecording() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ivr/audio/upload", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(
          customerIvrError(data?.message || data?.error, "מחיקת ההקלטה נכשלה")
        );
      }
      patchLocal({
        audioMode: "self_recorded",
        introAudio: data.introAudio,
        recordingApproval: { approved: false },
      });
      setMessage("ההקלטה נמחקה. אפשר להקליט או להעלות מחדש.");
    } catch (err) {
      setError(
        customerIvrError(
          err instanceof Error ? err.message : "",
          "מחיקת ההקלטה נכשלה"
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("הדפדפן לא מאפשר הקלטה. אפשר להעלות קובץ אודיו מהמכשיר.");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("לא ניתנה הרשאת מיקרופון. אפשר להעלות קובץ אודיו במקום.");
      return;
    }
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
      (type) =>
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported?.(type)
    );
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    chunksRef.current = [];
    startedAtRef.current = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const durationSeconds = Math.round(
        (Date.now() - startedAtRef.current) / 1000
      );
      if (durationSeconds > SELF_MAX_SECONDS) {
        setError(`ההקלטה ארוכה מדי. מקסימום ${SELF_MAX_SECONDS} שניות.`);
        return;
      }
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      try {
        await uploadBlob(blob, durationSeconds, "recording");
      } catch (err) {
        setError(
          customerIvrError(
            err instanceof Error ? err.message : "",
            "שמירת הקלטה נכשלה"
          )
        );
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);

    window.setTimeout(() => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
        setRecording(false);
      }
    }, SELF_MAX_SECONDS * 1000);
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  const rounds = Array.isArray(schedule?.rounds) ? schedule.rounds : [];
  const eventNameAudio = config?.ivrConfig?.eventNameAudio;
  const intro = config?.ivrConfig?.introAudio;
  const audioMode = config?.ivrConfig?.audioMode || "ai";
  const approved =
    audioMode === "self_recorded"
      ? Boolean(intro?.approved)
      : Boolean(
          eventNameAudio?.approved &&
            config?.ivrConfig?.composedIntroAudio?.approved
        );
  const aiReady =
    audioMode === "ai" &&
    eventNameAudio?.status === "ready" &&
    (composedReady || previewPlaylist.length >= 3);
  const selfReady =
    audioMode === "self_recorded" &&
    intro?.status === "ready" &&
    Boolean(intro?.audioUrl);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E7D8C6] bg-white p-5 text-sm font-bold text-[#8A7867]">
        טוען הגדרות שיחות מוקלטות...
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {showSimulator && (aiReady || selfReady || inboundPreviewPlaylist.length) ? (
        <IvrCallSimulator
          previewPlaylist={
            simulatorDirection === "inbound"
              ? inboundPreviewPlaylist
              : audioMode === "ai"
                ? previewPlaylist
                : [intro?.audioUrl]
          }
          followUpAudio={config?.ivrConfig?.followUpAudio}
          systemPromptTexts={config?.ivrConfig?.systemPromptTexts}
          directionLabel={
            simulatorDirection === "inbound" ? "שיחה נכנסת" : "שיחה יוצאת"
          }
          onClose={() => setShowSimulator(false)}
        />
      ) : null}

      <section className="rounded-2xl border border-[#E7D8C6] bg-white p-5">
        <h3 className="text-lg font-black text-[#3A2A1C]">
          תזמון 3 סבבי שיחות מוקלטות
        </h3>
        <p className="mt-1 text-xs font-bold text-[#8A7867]">
          השיחות יוצאות רק במועד שנקבע. הקהל מחושב מחדש בזמן הביצוע — לא בשמירת
          התזמון.
        </p>

        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((roundNumber) => {
            const round =
              rounds.find((r) => Number(r.roundNumber) === roundNumber) || {
                roundNumber,
                scheduledAt: "",
              };
            const stat = stats.find((s) => Number(s.round) === roundNumber);

            return (
              <div
                key={roundNumber}
                className="rounded-xl border border-[#EFE2D1] bg-[#FFFDF8] p-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-black text-[#3A2A1C]">
                    סבב מוקלט {roundNumber}
                  </div>
                  {stat ? (
                    <div className="text-[11px] font-bold text-[#8A7867]">
                      לחייג: {stat.toDial} · חויגו: {stat.attempted} · נענו:{" "}
                      {stat.answered} · אישרו: {stat.confirmed} · לא מגיעים:{" "}
                      {stat.declined} · מתלבטים: {stat.undecided} · לא ענו:{" "}
                      {stat.noAnswer} · נכשלו: {stat.failed} · ממתינים:{" "}
                      {stat.pending}
                    </div>
                  ) : null}
                </div>
                <div className="mb-2 text-[11px] font-black text-[#3A2A1C]">
                  {stat?.executionLabel ||
                    roundStatusLabel(round.status)}
                  {stat?.scheduledAtDisplay
                    ? ` · ${stat.scheduledAtDisplay}`
                    : round.scheduledAt
                      ? ` · ${formatCallRoundDateTimeDmy(
                          formatCallRoundDateTimeInput(round.scheduledAt) ||
                            round.scheduledAt
                        )}`
                      : ""}
                </div>
                {stat?.failureReason ? (
                  <div className="mb-2 text-[11px] font-bold text-rose-700">
                    {stat.failureReason}
                  </div>
                ) : null}
                <IsraelDateTimeFields
                  value={round.scheduledAt}
                  onChange={(value) => {
                    const nextRounds = [1, 2, 3].map((n) => {
                      const existing =
                        rounds.find((r) => Number(r.roundNumber) === n) || {
                          roundNumber: n,
                          scheduledAt: "",
                          title: `סבב מוקלט ${n}`,
                        };
                      if (n !== roundNumber) return existing;
                      return {
                        ...existing,
                        roundNumber: n,
                        scheduledAt: value,
                        title: `סבב מוקלט ${n}`,
                      };
                    });
                    onScheduleChange?.({
                      enabled: true,
                      rounds: nextRounds,
                    });
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[#E7D8C6] bg-white p-5">
        <h3 className="text-lg font-black text-[#3A2A1C]">סוג ההודעה הקולית</h3>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => patchLocal({ audioMode: "ai" })}
            className={`rounded-xl border px-4 py-2 text-sm font-black ${
              audioMode === "ai"
                ? "border-[#B97821] bg-[#FFF4E4] text-[#3A2A1C]"
                : "border-[#E7D8C6] bg-white text-[#8A7867]"
            }`}
          >
            קריינות AI
          </button>
          <button
            type="button"
            onClick={() => patchLocal({ audioMode: "self_recorded" })}
            className={`rounded-xl border px-4 py-2 text-sm font-black ${
              audioMode === "self_recorded"
                ? "border-[#B97821] bg-[#FFF4E4] text-[#3A2A1C]"
                : "border-[#E7D8C6] bg-white text-[#8A7867]"
            }`}
          >
            הקלטה עצמית
          </button>
        </div>

        {audioMode === "ai" ? (
          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-2 text-sm font-bold text-[#3A2A1C]">
                בחירת קול
              </div>
              <p className="mb-2 text-[11px] font-bold text-[#8A7867]">
                שני קולות מערכת קבועים בלבד.
              </p>
              <div
                className="flex flex-col gap-2 sm:flex-row"
                data-testid="ivr-voice-gender"
                role="radiogroup"
                aria-label="בחירת קול"
              >
                {GENDER_CHOICES.map((voice) => {
                  const selected =
                    config?.ivrConfig?.voiceGender === voice.gender;
                  return (
                    <label
                      key={voice.gender}
                      className={`flex flex-1 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-black ${
                        selected
                          ? "border-[#B97821] bg-[#FFF4E4] text-[#3A2A1C]"
                          : "border-[#E7D8C6] bg-white text-[#8A7867]"
                      }`}
                      data-testid={`ivr-voice-${voice.gender}`}
                    >
                      <input
                        type="radio"
                        name="ivr-voice-gender"
                        value={voice.gender}
                        checked={selected}
                        onChange={() =>
                          patchLocal({
                            voiceGender: voice.gender,
                          })
                        }
                        className="h-4 w-4 accent-[#B97821]"
                      />
                      <span>{voice.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="block text-sm font-bold text-[#3A2A1C]">
              שם האירוע
              <input
                value={config?.ivrConfig?.eventName || ""}
                onChange={(e) => patchLocal({ eventName: e.target.value })}
                placeholder="החתונה של הדר ורועי"
                className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
                data-testid="ivr-event-name"
              />
            </label>

            <label className="block text-sm font-bold text-[#3A2A1C]">
              הגייה לקריינות (אופציונלי)
              <input
                value={config?.ivrConfig?.eventNamePronunciation || ""}
                onChange={(e) =>
                  patchLocal({ eventNamePronunciation: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
              />
            </label>

            <div>
              <div className="mb-1 text-xs font-black text-[#B97821]">
                תצוגה מקדימה של ההודעה (טקסט)
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-[#FFFDF8] p-3 text-xs font-bold text-[#6B5A48]">
                {previewText || "הזינו שם אירוע כדי לראות את התבנית."}
              </pre>
              <p className="mt-2 text-[11px] font-bold text-[#8A7867]">
                הקריינות הקבועה זהה לכל האירועים. נוצר רק שם האירוע לפי הקול
                שנבחר.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={
                  saving ||
                  !config?.ivrConfig?.voiceGender ||
                  !cleanText(config?.ivrConfig?.eventName)
                }
                onClick={() => generateAi({ force: false })}
                className="rounded-xl bg-[#B97821] px-4 py-2 text-sm font-black text-white disabled:opacity-60"
                data-testid="ivr-generate-event-name"
              >
                יצירת שם האירוע + תצוגה מקדימה
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => saveConfig({ audioMode: "ai" })}
                className="rounded-xl border border-[#E7D8C6] px-4 py-2 text-sm font-black text-[#3A2A1C]"
              >
                שמור שדות
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-bold text-[#3A2A1C]">
              שם האירוע
              <input
                value={config?.ivrConfig?.eventName || ""}
                onChange={(e) => patchLocal({ eventName: e.target.value })}
                placeholder="החתונה של הדר ורועי"
                className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
                data-testid="ivr-event-name"
              />
            </label>
            <p className="text-xs font-bold text-[#8A7867]">
              מומלץ לשמור על הודעה קצרה של 20–30 שניות. ניתן להקליט עד 45 שניות.
            </p>
            <pre className="whitespace-pre-wrap rounded-xl bg-[#FFFDF8] p-3 text-xs font-bold text-[#6B5A48]">
              {previewText}
            </pre>

            <div className="flex flex-wrap gap-2">
              {!recording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="rounded-xl bg-[#B97821] px-4 py-2 text-sm font-black text-white"
                >
                  התחלת הקלטה
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="rounded-xl bg-[#B45309] px-4 py-2 text-sm font-black text-white"
                >
                  עצור ושמור
                </button>
              )}

              <label className="cursor-pointer rounded-xl border border-[#E7D8C6] px-4 py-2 text-sm font-black text-[#3A2A1C]">
                העלאת קובץ
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      await uploadBlob(file, 0, "upload");
                    } catch (err) {
                      setError(
                        customerIvrError(
                          err instanceof Error ? err.message : "",
                          "העלאה נכשלה"
                        )
                      );
                    }
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {aiReady ? (
          <div className="mt-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-sm font-black text-emerald-800">
              {approved
                ? "ההקלטה אושרה לשיחות"
                : "ממתין לאישור הקלטה"}
            </div>
            <p className="text-[11px] font-bold text-emerald-800">
              שיחה יוצאת: פתיח יוצא, שם האירוע, והוראות ההקשה (1 / 2 / 3). שיחה
              נכנסת מושמעת בנפרד, עם קטעי ההמשך לפי הבחירה.
            </p>
            <p className="text-xs font-black text-emerald-900">שיחה יוצאת</p>
            {composedReady ? (
              <div className="space-y-2">
                <audio
                  controls
                  preload="metadata"
                  src={previewPlaylist[0]}
                  className="w-full"
                  data-testid="ivr-composed-preview"
                />
                <p className="text-[11px] font-bold text-emerald-800">
                  קריינות אחת רציפה (פתיח יוצא + שם האירוע + המשך יוצא).
                </p>
              </div>
            ) : (
              <ConcatPreviewPlayer
                playlist={previewPlaylist}
                label="שיחה יוצאת"
              />
            )}
            {inboundPreviewPlaylist.length ? (
              <div className="space-y-2">
                <p className="text-xs font-black text-emerald-900">
                  שיחה נכנסת / שיחה חוזרת
                </p>
                <ConcatPreviewPlayer
                  playlist={inboundPreviewPlaylist}
                  label="שיחה נכנסת"
                />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {!approved ? (
                <button
                  type="button"
                  disabled={saving || !composedReady}
                  onClick={approveAudio}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white disabled:opacity-60"
                  data-testid="ivr-approve-audio"
                  title={
                    composedReady
                      ? "אישור אחרי האזנה למשפט המחובר"
                      : "יש ליצור תצוגה מקדימה מחוברת לפני אישור"
                  }
                >
                  אני מאשר/ת את ההקלטה לשיחות
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setSimulatorDirection("outbound");
                  setShowSimulator(true);
                }}
                className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-black text-emerald-900"
              >
                תצוגה מקדימה — שיחה יוצאת
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimulatorDirection("inbound");
                  setShowSimulator(true);
                }}
                className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-black text-emerald-900"
              >
                תצוגה מקדימה — שיחה נכנסת
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => generateAi({ force: true })}
                className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-black text-emerald-900"
              >
                יצירה מחדש של שם האירוע
              </button>
            </div>
            <p className="text-[11px] font-bold text-emerald-800">
              הטקסטים הקבועים (פתיח / אחרי הקשות) לא נוצרים מחדש לכל אירוע —
              רק שם האירוע.
            </p>
          </div>
        ) : null}

        {selfReady ? (
          <div className="mt-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-sm font-black text-emerald-800">
              {approved
                ? "ההקלטה אושרה לשיחות"
                : "ממתין לאישור הקלטה"}
            </div>
            <p className="text-[11px] font-bold text-emerald-800">
              זו ההקלטה המלאה שתושמע לאורחים, בלי קריינות AI.
            </p>
            <audio controls src={intro.audioUrl} className="w-full" />
            <div className="flex flex-wrap gap-2">
              {!approved ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={approveAudio}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white"
                  data-testid="ivr-approve-self-audio"
                >
                  אני מאשר/ת את ההקלטה לשיחות
                </button>
              ) : null}
              <button
                type="button"
                disabled={saving}
                onClick={deleteRecording}
                className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-black text-rose-800"
              >
                מחיקה והקלטה מחדש
              </button>
              <button
                type="button"
                onClick={() => setShowSimulator(true)}
                className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-black text-emerald-900"
              >
                תצוגה מקדימה של השיחה
              </button>
            </div>
          </div>
        ) : null}

        {audioMode === "ai" && eventNameAudio?.status === "stale" ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            שם האירוע או הקול השתנו. יש ליצור מחדש רק את שם האירוע ולאשר לפני
            השיחות.
          </div>
        ) : null}

        {message ? (
          <div className="mt-3 text-xs font-bold text-emerald-700">{message}</div>
        ) : null}
        {error ? (
          <div className="mt-3 text-xs font-bold text-rose-700">{error}</div>
        ) : null}
      </section>
    </div>
  );
}
