"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SELF_MAX_SECONDS = 45;

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** Play global before + event name + global after as one continuous preview. */
function ConcatPreviewPlayer({ playlist, onEnded }) {
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
        מנגן קטע {index + 1} מתוך {urls.length} (פתיח גלובלי → שם האירוע → המשך
        גלובלי)
      </p>
    </div>
  );
}

function IvrCallSimulator({
  previewPlaylist,
  systemPromptTexts,
  onClose,
}) {
  const [step, setStep] = useState("intro");
  const [choice, setChoice] = useState("");
  const [count, setCount] = useState("");

  const followText =
    choice === "1"
      ? systemPromptTexts?.afterPress1 ||
        systemPromptTexts?.askGuestCount ||
        ""
      : choice === "2" || choice === "3"
        ? systemPromptTexts?.afterPress2Or3 ||
          systemPromptTexts?.thanksReceived ||
          ""
        : "";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4">
      <div
        dir="rtl"
        className="w-full max-w-lg rounded-3xl border border-[#E7D8C6] bg-white p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#3A2A1C]">
              תצוגה מקדימה של השיחה
            </h3>
            <p className="mt-1 text-xs font-bold text-[#8A7867]">
              סימולציה בדפדפן בלבד — ללא שיחת Telnyx אמיתית.
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
                    setStep(digit === "1" ? "count" : "done");
                  }}
                  className="flex-1 rounded-xl bg-[#B97821] px-3 py-3 text-lg font-black text-white"
                >
                  {digit}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === "count" ? (
          <div className="space-y-3">
            <p className="text-sm font-bold text-[#3A2A1C]">{followText}</p>
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
              onClick={() => setStep("done")}
              className="rounded-xl bg-[#B97821] px-4 py-2 text-sm font-black text-white"
            >
              המשך
            </button>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="space-y-2 text-sm font-bold text-[#3A2A1C]">
            <p>
              {choice === "1"
                ? systemPromptTexts?.afterValidQuantity ||
                  systemPromptTexts?.thanksAttending
                : systemPromptTexts?.afterPress2Or3 ||
                  systemPromptTexts?.thanksReceived}
            </p>
            <p className="text-xs text-[#8A7867]">
              בחירה: {choice}
              {choice === "1" && count ? ` · כמות: ${count}` : ""}
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
  const [voices, setVoices] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
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
    if (Array.isArray(preview?.playlist) && preview.playlist.length) {
      return preview.playlist;
    }
    return [
      preview?.introBeforeEventNameUrl,
      preview?.eventNameAudioUrl || config?.ivrConfig?.eventNameAudio?.audioUrl,
      preview?.introAfterEventNameUrl,
    ].filter(Boolean);
  }, [config]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      // Config already resolves the two system voices (Dana / male).
      // Do NOT load /api/ivr/voices as an ElevenLabs catalog for the client.
      const [cfgRes, statsRes] = await Promise.all([
        fetch(`/api/ivr/config${qs}`, { credentials: "include" }),
        fetch(`/api/ivr/rounds/stats${qs}`, { credentials: "include" }),
      ]);

      const cfg = await cfgRes.json().catch(() => null);
      const statsData = await statsRes.json().catch(() => null);

      if (!cfgRes.ok || !cfg?.ok) {
        throw new Error(cfg?.error || "טעינת הגדרות IVR נכשלה");
      }

      setConfig(cfg);

      const fromConfig = Array.isArray(cfg?.ivrConfig?.systemVoices)
        ? cfg.ivrConfig.systemVoices
        : [];
      const nextVoices =
        fromConfig.length > 0
          ? fromConfig.map((v) => ({
              gender: v.gender,
              label:
                v.gender === "female"
                  ? "דנה – קול נשי"
                  : v.label ||
                    (v.name ? `${v.name} – קול גברי` : "קול גברי"),
              name: v.name || "",
              voiceId: v.voiceId,
            }))
          : [
              {
                gender: "female",
                label: "דנה – קול נשי",
                name: "Dana",
                voiceId: "",
              },
              {
                gender: "male",
                label: "קול גברי",
                name: "",
                voiceId: "",
              },
            ];
      setVoices(nextVoices);
      setStats(Array.isArray(statsData?.rounds) ? statsData.rounds : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינה");
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
        throw new Error(data?.error || "שמירה נכשלה");
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
      setError(err instanceof Error ? err.message : "שמירה נכשלה");
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
          data?.message || data?.error || "יצירת שם האירוע נכשלה",
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
        previewAudio: data.previewAudio,
        previewText: data.previewText,
        recommendedScript: data.previewText,
      });
      setMessage(
        data.reused
          ? "שם האירוע לא השתנה — מנגנים Preview מהקבצים הקיימים (ללא ElevenLabs)."
          : "נוצר רק שם האירוע. מאזינים ל-Preview המחובר (גלובלי + שם + גלובלי) ואז מאשרים."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "יצירת שם האירוע נכשלה");
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
        throw new Error(data?.error || "אישור נכשל");
      }
      setConfig((prev) => ({
        ...prev,
        ivrConfig: data.ivrConfig || prev?.ivrConfig,
      }));
      setMessage("ההודעה אושרה ומוכנה לשיחות IVR.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "אישור נכשל");
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
      throw new Error(data?.error || "העלאת האודיו נכשלה");
    }
    patchLocal({
      audioMode: "self_recorded",
      introAudio: data.introAudio,
    });
    setMessage("ההקלטה נשמרה — האזינו ואשרו לפני השיחות.");
  }

  async function startRecording() {
    setError("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
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
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      try {
        await uploadBlob(blob, durationSeconds, "recording");
      } catch (err) {
        setError(err instanceof Error ? err.message : "שמירת הקלטה נכשלה");
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
      : Boolean(eventNameAudio?.approved);
  const aiReady =
    audioMode === "ai" &&
    eventNameAudio?.status === "ready" &&
    previewPlaylist.length >= 3;
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
      {showSimulator && (aiReady || selfReady) ? (
        <IvrCallSimulator
          previewPlaylist={
            audioMode === "ai" ? previewPlaylist : [intro?.audioUrl]
          }
          systemPromptTexts={config?.ivrConfig?.systemPromptTexts}
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
                <input
                  type="datetime-local"
                  value={String(round.scheduledAt || "").slice(0, 16)}
                  onChange={(e) => {
                    const value = e.target.value;
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
                  className="w-full rounded-xl border border-[#E7D8C6] bg-white px-3 py-2 text-sm font-bold text-[#3A2A1C]"
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

        <label className="mt-4 block text-sm font-bold text-[#3A2A1C]">
          שם האירוע
          <input
            value={config?.ivrConfig?.eventName || ""}
            onChange={(e) => patchLocal({ eventName: e.target.value })}
            placeholder="החתונה של הדס ורועי"
            className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
            data-testid="ivr-event-name"
          />
        </label>

        {audioMode === "ai" ? (
          <div className="mt-4 space-y-3">
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
              <div className="mb-2 text-sm font-bold text-[#3A2A1C]">
                בחירת קול
              </div>
              <p className="mb-2 text-[11px] font-bold text-[#8A7867]">
                שני קולות קבועים במערכת בלבד — ללא רשימת ElevenLabs.
              </p>
              <div
                className="flex flex-col gap-2 sm:flex-row"
                data-testid="ivr-voice-gender"
                role="radiogroup"
                aria-label="בחירת קול"
              >
                {(voices.length
                  ? voices
                  : [
                      {
                        gender: "female",
                        label: "דנה – קול נשי",
                        voiceId: "",
                      },
                      { gender: "male", label: "קול גברי", voiceId: "" },
                    ]
                ).map((voice) => {
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
                            systemVoiceId: voice.voiceId,
                            voiceId: voice.voiceId,
                          })
                        }
                        className="h-4 w-4 accent-[#B97821]"
                      />
                      <span>
                        {voice.gender === "female"
                          ? "דנה – קול נשי"
                          : voice.label || "קול גברי"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-black text-[#B97821]">
                תצוגה מקדימה של ההודעה (טקסט)
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-[#FFFDF8] p-3 text-xs font-bold text-[#6B5A48]">
                {previewText || "הזינו שם אירוע כדי לראות את התבנית."}
              </pre>
              <p className="mt-2 text-[11px] font-bold text-[#8A7867]">
                הקריינות הקבועה זהה לכל האירועים. ElevenLabs מייצר רק את שם
                האירוע לפי הקול שנבחר.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving || !config?.ivrConfig?.voiceGender}
                onClick={() => generateAi({ force: false })}
                className="rounded-xl bg-[#B97821] px-4 py-2 text-sm font-black text-white disabled:opacity-60"
                data-testid="ivr-generate-event-name"
              >
                יצירת שם האירוע + Preview
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
                        err instanceof Error ? err.message : "העלאה נכשלה"
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
                ? "הודעה מאושרת — מוכנה לשיחות IVR"
                : "Preview מוכן — האזינו ואשרו לפני חיוג"}
            </div>
            <ConcatPreviewPlayer playlist={previewPlaylist} />
            <div className="flex flex-wrap gap-2">
              {!approved ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={approveAudio}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white"
                  data-testid="ivr-approve-audio"
                >
                  ✓ אישור ושמירה
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowSimulator(true)}
                className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-black text-emerald-900"
              >
                תצוגה מקדימה של השיחה
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
                ? "הודעה מאושרת — מוכנה לשיחות IVR"
                : "קובץ מוכן — האזינו ואשרו לפני חיוג"}
            </div>
            <audio controls src={intro.audioUrl} className="w-full" />
            <div className="flex flex-wrap gap-2">
              {!approved ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={approveAudio}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white"
                >
                  ✓ אישור ההודעה
                </button>
              ) : null}
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
