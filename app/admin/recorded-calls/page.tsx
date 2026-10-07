"use client";

import { useCallback, useEffect, useState } from "react";

type PackSegment = {
  key: string;
  label: string;
  text: string;
  audioUrl: string;
  ready: boolean;
};

type VoicePack = {
  gender: "female" | "male";
  label: string;
  voiceId: string;
  adminNote: string;
  segmentsReady: boolean;
  approved: boolean;
  readyCount: number;
  totalCount: number;
  segments: PackSegment[];
};

export default function AdminIvrNarrationPage() {
  const [packs, setPacks] = useState<VoicePack[]>([]);
  const [bothApproved, setBothApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draftIds, setDraftIds] = useState<Record<string, string>>({
    female: "",
    male: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ivr/voice-packs", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.message || data?.error || data?.detail || "טעינה נכשלה"
        );
      }
      const next = Array.isArray(data.packs) ? data.packs : [];
      setPacks(next);
      setBothApproved(Boolean(data.bothApproved));
      setDraftIds({
        female: next.find((p: VoicePack) => p.gender === "female")?.voiceId || "",
        male: next.find((p: VoicePack) => p.gender === "male")?.voiceId || "",
      });
      if (data.warning) {
        setMessage(
          "נטען מצב ברירת מחדל — שמרו voiceId וצרו את הקטעים לכל Pack."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveVoiceId(gender: "female" | "male") {
    setBusy(`save-${gender}`);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/ivr/voice-packs", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_voice_id",
          gender,
          voiceId: draftIds[gender],
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "שמירת voiceId נכשלה");
      }
      setPacks(data.packs || []);
      setBothApproved(Boolean(data.bothApproved));
      setMessage("voiceId נשמר. יש ליצור את הקטעים ולאשר את ה-Pack.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setBusy("");
    }
  }

  async function generatePack(gender: "female" | "male", force = false) {
    setBusy(`gen-${gender}`);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/ivr/voice-packs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_pack", gender, force }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        const parts = [
          data?.message || data?.error || "יצירת ה-Pack נכשלה",
          data?.providerStatusCode,
          data?.providerDetail,
        ].filter(Boolean);
        throw new Error(parts.join(" · "));
      }
      setPacks(data.packs || []);
      setBothApproved(Boolean(data.bothApproved));
      setMessage(
        force
          ? "ה-Pack נוצר מחדש. האזינו ואשרו."
          : "הקטעים נוצרו / נטענו מהמטמון. האזינו ואשרו."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "יצירה נכשלה");
    } finally {
      setBusy("");
    }
  }

  async function regenerateSegment(
    gender: "female" | "male",
    segment: string
  ) {
    setBusy(`seg-${gender}-${segment}`);
    setError("");
    try {
      const res = await fetch("/api/admin/ivr/voice-packs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "regenerate_segment",
          gender,
          segment,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || "יצירה מחדש נכשלה");
      }
      setPacks(data.packs || []);
      setBothApproved(Boolean(data.bothApproved));
      setMessage("הקטע נוצר מחדש — יש לאשר את ה-Pack שוב.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "יצירה מחדש נכשלה");
    } finally {
      setBusy("");
    }
  }

  async function approvePack(gender: "female" | "male") {
    setBusy(`approve-${gender}`);
    setError("");
    try {
      const res = await fetch("/api/admin/ivr/voice-packs", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", gender }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "אישור נכשל");
      }
      setPacks(data.packs || []);
      setBothApproved(Boolean(data.bothApproved));
      setMessage(
        data.bothApproved
          ? "שני ה-Voice Packs מאושרים — לקוחות יכולים ליצור שם אירוע."
          : "ה-Pack אושר."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "אישור נכשל");
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <div dir="rtl" className="text-sm font-bold text-slate-500">
        טוען הגדרות קריינות...
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">
          שיחות מוקלטות · הגדרות קריינות
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-500">
          שני Voice Packs גלובליים בלבד (קול נשי / קול גברי). הקטעים הקבועים
          נוצרים כאן פעם אחת ומשמשים את כל הלקוחות והאירועים. הלקוח יוצר רק את
          שם האירוע.
        </p>
        <div
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${
            bothApproved
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {bothApproved
            ? "שני ה-Packs מאושרים — לקוחות יכולים ליצור שם אירוע"
            : "ממתינים לאישור שני ה-Packs לפני פתיחה ללקוחות"}
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {packs.map((pack) => (
          <section
            key={pack.gender}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            data-testid={`admin-ivr-pack-${pack.gender}`}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {pack.label}
                </h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {pack.readyCount}/{pack.totalCount} קטעים מוכנים
                  {pack.approved ? " · מאושר" : " · לא מאושר"}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                  pack.approved
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {pack.approved ? "מאושר" : "טיוטה"}
              </span>
            </div>

            <label className="block text-sm font-bold text-slate-700">
              voiceId (ElevenLabs) — פנימי לאדמין בלבד
              <input
                value={draftIds[pack.gender] || ""}
                onChange={(e) =>
                  setDraftIds((prev) => ({
                    ...prev,
                    [pack.gender]: e.target.value,
                  }))
                }
                placeholder="הדביקו voice_id קבוע"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm"
                data-testid={`admin-ivr-voiceid-${pack.gender}`}
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void saveVoiceId(pack.gender)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-800 disabled:opacity-50"
              >
                שמור voiceId
              </button>
              <button
                type="button"
                disabled={Boolean(busy) || !draftIds[pack.gender]}
                onClick={() => void generatePack(pack.gender, false)}
                className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                {busy === `gen-${pack.gender}`
                  ? "יוצר..."
                  : "צור את כל הקטעים"}
              </button>
              <button
                type="button"
                disabled={Boolean(busy) || !pack.segmentsReady}
                onClick={() => void approvePack(pack.gender)}
                className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                אישור Voice Pack
              </button>
              <button
                type="button"
                disabled={Boolean(busy) || !draftIds[pack.gender]}
                onClick={() => void generatePack(pack.gender, true)}
                className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-black text-amber-900 disabled:opacity-50"
              >
                יצירה מחדש של כל ה-Pack
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {pack.segments.map((segment) => (
                <div
                  key={segment.key}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-black text-slate-800">
                      {segment.label}
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        void regenerateSegment(pack.gender, segment.key)
                      }
                      className="text-[11px] font-black text-indigo-700 disabled:opacity-50"
                    >
                      יצירה מחדש של הקטע
                    </button>
                  </div>
                  <pre className="mb-2 whitespace-pre-wrap text-[11px] font-bold text-slate-600">
                    {segment.text}
                  </pre>
                  {segment.audioUrl ? (
                    <audio controls src={segment.audioUrl} className="w-full" />
                  ) : (
                    <p className="text-[11px] font-bold text-rose-600">
                      עדיין לא נוצר
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
