"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SELF_MAX_SECONDS = 45;

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export default function IvrRoundsPanel({
  schedule,
  onScheduleChange,
  userId,
}) {
  const [config, setConfig] = useState(null);
  const [voices, setVoices] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);

  const recommendedScript = useMemo(() => {
    if (config?.ivrConfig?.recommendedScript) {
      return config.ivrConfig.recommendedScript;
    }
    const eventType = cleanText(config?.ivrConfig?.eventTypeLabel) || "חתונה";
    const names = cleanText(config?.ivrConfig?.hostsNames) || "הדס ורועי";
    return [
      `שלום, אנחנו מתקשרים בנוגע ל${eventType} של ${names}.`,
      "נשמח לדעת האם תוכלו להגיע ולחגוג איתנו.",
      "לאישור הגעה, הקישו 1.",
      "לאי הגעה, הקישו 2.",
      "אם עדיין אינכם יודעים, הקישו 3.",
    ].join("\n");
  }, [config]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      const [cfgRes, voicesRes, statsRes] = await Promise.all([
        fetch(`/api/ivr/config${qs}`, { credentials: "include" }),
        fetch("/api/ivr/voices", { credentials: "include" }),
        fetch(`/api/ivr/rounds/stats${qs}`, { credentials: "include" }),
      ]);

      const cfg = await cfgRes.json().catch(() => null);
      const voicesData = await voicesRes.json().catch(() => null);
      const statsData = await statsRes.json().catch(() => null);

      if (!cfgRes.ok || !cfg?.ok) {
        throw new Error(cfg?.error || "טעינת הגדרות IVR נכשלה");
      }

      setConfig(cfg);
      setVoices(Array.isArray(voicesData?.voices) ? voicesData.voices : []);
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
        eventTypeLabel: config?.ivrConfig?.eventTypeLabel || "",
        hostsNames: config?.ivrConfig?.hostsNames || "",
        hostsNamesPronunciation:
          config?.ivrConfig?.hostsNamesPronunciation || "",
        voiceId: config?.ivrConfig?.voiceId || "",
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
        ivrConfig: {
          ...(prev?.ivrConfig || {}),
          ...(data.ivrConfig || {}),
          recommendedScript:
            data.recommendedScript || prev?.ivrConfig?.recommendedScript,
        },
      }));
      if (data.needsRegenerate) {
        setMessage("השדות השתנו — יש ליצור קריינות מחדש לפני השיחות.");
      } else {
        setMessage("ההגדרות נשמרו.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function generateAi() {
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
          force: true,
          eventTypeLabel: config?.ivrConfig?.eventTypeLabel || "",
          hostsNames: config?.ivrConfig?.hostsNames || "",
          hostsNamesPronunciation:
            config?.ivrConfig?.hostsNamesPronunciation || "",
          voiceId: config?.ivrConfig?.voiceId || "",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "יצירת קריינות נכשלה");
      }
      patchLocal({
        audioMode: "ai",
        introAudio: data.introAudio,
      });
      setMessage(
        data.reused
          ? "הקריינות הקיימת עדיין מעודכנת — מנגנים את הקובץ השמור."
          : "הקריינות נוצרה ונשמרה. אותה הקלטה תשמש את כל האורחים."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "יצירת קריינות נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function uploadBlob(blob, durationSeconds, source) {
    const form = new FormData();
    form.append("file", blob, source === "recording" ? "recording.webm" : "upload.mp3");
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
    setMessage("ההקלטה נשמרה.");
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
  const intro = config?.ivrConfig?.introAudio;
  const audioMode = config?.ivrConfig?.audioMode || "ai";

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E7D8C6] bg-white p-5 text-sm font-bold text-[#8A7867]">
        טוען הגדרות שיחות מוקלטות...
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
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
                      לחייג עכשיו: {stat.toDial} · נענו: {stat.answered} · אישרו:{" "}
                      {stat.confirmed} · לא מגיעים: {stat.declined} · מתלבטים:{" "}
                      {stat.undecided} · לא ענו: {stat.noAnswer} · נכשלו:{" "}
                      {stat.failed}
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

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm font-bold text-[#3A2A1C]">
            סוג האירוע
            <input
              value={config?.ivrConfig?.eventTypeLabel || ""}
              onChange={(e) => patchLocal({ eventTypeLabel: e.target.value })}
              placeholder="חתונה"
              className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
            />
          </label>
          <label className="text-sm font-bold text-[#3A2A1C]">
            שמות בעלי האירוע
            <input
              value={config?.ivrConfig?.hostsNames || ""}
              onChange={(e) => patchLocal({ hostsNames: e.target.value })}
              placeholder="הדס ורועי"
              className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
            />
          </label>
        </div>

        {audioMode === "ai" ? (
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-bold text-[#3A2A1C]">
              הגיית השמות לקריינות (אופציונלי)
              <input
                value={config?.ivrConfig?.hostsNamesPronunciation || ""}
                onChange={(e) =>
                  patchLocal({ hostsNamesPronunciation: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
              />
            </label>

            <label className="block text-sm font-bold text-[#3A2A1C]">
              בחירת קול
              <select
                value={config?.ivrConfig?.voiceId || ""}
                onChange={(e) => patchLocal({ voiceId: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
              >
                <option value="">בחרו קול</option>
                {voices.map((voice) => (
                  <option key={voice.voiceId} value={voice.voiceId}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </label>

            <pre className="whitespace-pre-wrap rounded-xl bg-[#FFFDF8] p-3 text-xs font-bold text-[#6B5A48]">
              {recommendedScript}
            </pre>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={generateAi}
                className="rounded-xl bg-[#B97821] px-4 py-2 text-sm font-black text-white disabled:opacity-60"
              >
                צור קריינות והאזן
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
              {recommendedScript}
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

        {intro?.audioUrl && intro?.status === "ready" ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="mb-2 text-sm font-black text-emerald-800">
              קובץ קריינות שמור — Preview מנגן את הקובץ הקיים (ללא בקשת AI חדשה)
            </div>
            <audio controls src={intro.audioUrl} className="w-full" />
          </div>
        ) : null}

        {intro?.status === "stale" ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            השדות השתנו מאז יצירת הקריינות. יש ליצור קריינות מחדש לפני השיחות.
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
