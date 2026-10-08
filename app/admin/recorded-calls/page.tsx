"use client";

import { useCallback, useEffect, useState } from "react";

type PackSegment = {
  key: string;
  label: string;
  text: string;
  audioUrl: string;
  ready: boolean;
  status?: "ready" | "missing" | "unplayable" | string;
  reason?: string;
  sizeBytes?: number;
  contentType?: string;
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

type MaleAudition = {
  voiceId: string;
  name: string;
  category: string | null;
  audioUrl: string;
  sampleText: string;
};

/** Must hear these before manual approve (full intro = before+after). */
const REQUIRED_LISTEN_KEYS = [
  "introBeforeEventName",
  "introAfterEventName",
  "afterPress1",
  "afterPress2Or3",
] as const;

type RequiredListenKey = (typeof REQUIRED_LISTEN_KEYS)[number];

const REQUIRED_LISTEN_LABELS: Record<RequiredListenKey, string> = {
  introBeforeEventName: "פתיח מלא · לפני שם האירוע",
  introAfterEventName: "פתיח מלא · אחרי שם האירוע",
  afterPress1: "תגובה אחרי 1",
  afterPress2Or3: "תגובה אחרי 2/3",
};

export default function AdminIvrNarrationPage() {
  const [packs, setPacks] = useState<VoicePack[]>([]);
  const [bothApproved, setBothApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [danaInfo, setDanaInfo] = useState<{
    voiceId: string;
    name: string;
  } | null>(null);
  const [auditions, setAuditions] = useState<MaleAudition[]>([]);
  const [auditionText, setAuditionText] = useState(
    "שלום, אנחנו מתקשרים בנוגע לחתונה של יונתן ואלמוג. נשמח לדעת האם תוכלו להגיע ולחגוג איתנו."
  );
  const [maleLocked, setMaleLocked] = useState(false);
  /** gender → segment keys the admin has played */
  const [heard, setHeard] = useState<Record<string, Record<string, boolean>>>(
    {}
  );

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
      if (data.maleAuditionText) setAuditionText(data.maleAuditionText);
      const male = next.find((p: VoicePack) => p.gender === "male");
      setMaleLocked(
        Boolean(male?.voiceId && male?.adminNote === "admin_audition_locked")
      );
      const female = next.find((p: VoicePack) => p.gender === "female");
      if (female?.voiceId && female?.adminNote === "Dana") {
        setDanaInfo({ voiceId: female.voiceId, name: "Dana" });
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

  async function invalidateWrongPacks() {
    setBusy("invalidate");
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/ivr/voice-packs", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invalidate_wrong_packs" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || "ביטול נכשל");
      }
      setPacks(data.packs || []);
      setBothApproved(false);
      setAuditions([]);
      setMaleLocked(false);
      setDanaInfo(null);
      setHeard({});
      setMessage(
        data.message ||
          "ה-Packs השגויים בוטלו. נעלו Dana + קול גברי ואז צרו מחדש פעם אחת."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "ביטול נכשל");
    } finally {
      setBusy("");
    }
  }

  async function lockDana() {
    setBusy("lock-dana");
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/ivr/voice-packs", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock_female_dana" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || "נעילת Dana נכשלה");
      }
      setPacks(data.packs || []);
      setBothApproved(Boolean(data.bothApproved));
      if (data.dana) {
        setDanaInfo({ voiceId: data.dana.voiceId, name: data.dana.name });
      }
      setMessage(
        `Dana ננעלה: ${data.dana?.voiceId || ""}. כעת יש ליצור מחדש את הקטעים הנשיים.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "נעילת Dana נכשלה");
    } finally {
      setBusy("");
    }
  }

  async function runMaleAudition() {
    setBusy("audition");
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/ivr/voice-packs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "male_audition" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.message || data?.error || "יצירת דגימות שמיעה נכשלה"
        );
      }
      setAuditions(Array.isArray(data.auditions) ? data.auditions : []);
      if (data.sampleText) setAuditionText(data.sampleText);
      setMessage("האזינו ל־2–3 הקולות הגבריים ובחרו אחד — בלי בחירה אוטומטית.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "דגימות שמיעה נכשלו");
    } finally {
      setBusy("");
    }
  }

  async function lockMale(voiceId: string) {
    setBusy(`lock-male-${voiceId}`);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/ivr/voice-packs", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lock_male_from_audition",
          voiceId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || "נעילת קול גברי נכשלה");
      }
      setPacks(data.packs || []);
      setBothApproved(Boolean(data.bothApproved));
      setMaleLocked(true);
      setAuditions([]);
      setMessage(
        "הקול הגברי ננעל. כעת צרו מחדש את כל הקטעים הגבריים פעם אחת."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "נעילה נכשלה");
    } finally {
      setBusy("");
    }
  }

  async function generatePack(gender: "female" | "male", force = true) {
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
      setHeard((prev) => ({ ...prev, [gender]: {} }));
      setMessage(
        force
          ? "ה-Pack נוצר מחדש בקול הנעול. האזינו לקטעים החובה ואשרו ידנית."
          : "הקטעים נוצרו. האזינו ואשרו ידנית — אין אישור אוטומטי."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "יצירה נכשלה");
    } finally {
      setBusy("");
    }
  }

  function markHeard(gender: string, key: string) {
    setHeard((prev) => ({
      ...prev,
      [gender]: { ...(prev[gender] || {}), [key]: true },
    }));
  }

  function hasHeardRequired(gender: string) {
    const g = heard[gender] || {};
    return REQUIRED_LISTEN_KEYS.every((k) => g[k]);
  }

  async function playFullIntro(gender: "female" | "male") {
    const pack = packs.find((p) => p.gender === gender);
    if (!pack) return;
    const before = pack.segments.find((s) => s.key === "introBeforeEventName");
    const after = pack.segments.find((s) => s.key === "introAfterEventName");
    if (!before?.audioUrl || !after?.audioUrl) {
      setError("חסרים קטעי פתיח להשמעה מלאה");
      return;
    }
    setBusy(`intro-${gender}`);
    setError("");
    try {
      const playUrl = (url: string) =>
        new Promise<void>((resolve, reject) => {
          const audio = new Audio(url);
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("AUDIO_PLAY_FAILED"));
          void audio.play().catch(reject);
        });
      await playUrl(before.audioUrl);
      markHeard(gender, "introBeforeEventName");
      await playUrl(after.audioUrl);
      markHeard(gender, "introAfterEventName");
      setMessage(
        `הושמע פתיח מלא (${gender === "female" ? "Dana" : "גברי"}). האזינו גם לתגובות אחרי 1 ואחרי 2/3.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמעת פתיח נכשלה");
    } finally {
      setBusy("");
    }
  }

  async function approvePack(gender: "female" | "male") {
    if (!hasHeardRequired(gender)) {
      setError(
        "חובה להשמיע לפני אישור: פתיח מלא (לפני+אחרי), תגובה אחרי 1, ותגובה אחרי 2/3."
      );
      return;
    }
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
        throw new Error(data?.message || data?.error || "אישור נכשל");
      }
      setPacks(data.packs || []);
      setBothApproved(Boolean(data.bothApproved));
      setMessage(
        data.bothApproved
          ? "שני ה-Voice Packs מאושרים — לקוחות יכולים ליצור שם אירוע."
          : "ה-Pack אושר ידנית."
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

  const female = packs.find((p) => p.gender === "female");
  const male = packs.find((p) => p.gender === "male");
  const anyApprovedWrong =
    packs.some((p) => p.approved) ||
    packs.some((p) => p.readyCount > 0 && !p.approved);

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-3 shadow-[var(--admin-shadow)]">
        <p className="max-w-3xl text-xs font-medium leading-6 text-[var(--admin-muted)]">
          קול נשי = Dana בלבד. קול גברי = בחירה חד־פעמית אחרי בדיקת שמיעה בעברית.
          אין קטלוג ללקוחות.
        </p>
        <div
          className={`mt-2 inline-flex rounded-md px-2.5 py-1 text-[11px] font-bold ${
            bothApproved
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {bothApproved
            ? "שני ה-Packs מאושרים — לקוחות יכולים ליצור שם אירוע"
            : "ממתינים לנעילת קולות + יצירה מחדש + אישור ידני"}
        </div>
      </div>

      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <h2 className="text-base font-black text-rose-900">
          ביטול Voice Packs שגויים
        </h2>
        <p className="mt-2 text-sm font-bold text-rose-800">
          אם נוצרו packs עם קולות לא נכונים (לא Dana / קריינות לא עברית) — יש לבטל
          אותם. הם לא יישארו ready רק כי יש קבצים ב-Mongo.
        </p>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void invalidateWrongPacks()}
          className="mt-3 rounded-xl bg-rose-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          {busy === "invalidate"
            ? "מבטל..."
            : "בטל שימוש ב-Packs השגויים ומחק קבצים"}
        </button>
        {anyApprovedWrong ? (
          <p className="mt-2 text-xs font-bold text-rose-700">
            זוהו packs קיימים — מומלץ לבטל לפני נעילת הקולות החדשים.
          </p>
        ) : null}
      </section>

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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">
          1. קול נשי — Dana בלבד
        </h2>
        <p className="mt-1 text-sm font-bold text-slate-500">
          המערכת תמצא את ה־voice_id המדויק בשם Dana בחשבון ElevenLabs ותנעל אותו.
          אין בחירה לפי metadata.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void lockDana()}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            {busy === "lock-dana" ? "נועלת Dana..." : "מצא ונעל את Dana"}
          </button>
          {danaInfo || female?.voiceId ? (
            <code className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
              Dana · {danaInfo?.voiceId || female?.voiceId}
            </code>
          ) : (
            <span className="text-xs font-bold text-amber-700">
              Dana עדיין לא ננעלה
            </span>
          )}
        </div>
        {female ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy) || !female.voiceId}
              onClick={() => void generatePack("female", true)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {busy === "gen-female"
                ? "יוצר מחדש..."
                : "צור מחדש את כל הקטעים הנשיים"}
            </button>
            <span className="self-center text-xs font-bold text-slate-500">
              {female.readyCount}/{female.totalCount} קטעים מוכנים
              {female.approved ? " · מאושר" : " · לא מאושר"}
            </span>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">
          2. קול גברי — בדיקת שמיעה ואז נעילה
        </h2>
        <p className="mt-1 text-sm font-bold text-slate-500">
          אין בחירה אוטומטית של George או קול multilingual. האזינו לאותו משפט
          בעברית ב־2–3 קולות ובחרו אחד לצמיתות.
        </p>
        <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700">
          {auditionText}
        </pre>
        <button
          type="button"
          disabled={Boolean(busy) || maleLocked}
          onClick={() => void runMaleAudition()}
          className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          {busy === "audition"
            ? "יוצר דגימות..."
            : maleLocked
              ? "קול גברי כבר ננעל"
              : "השמע 2–3 קולות גבריים לבדיקה"}
        </button>

        {auditions.length ? (
          <div className="mt-4 space-y-3">
            {auditions.map((a) => (
              <div
                key={a.voiceId}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-black text-slate-800">
                    {a.name}
                    <span className="mr-2 font-mono text-[11px] text-slate-500">
                      {a.voiceId}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void lockMale(a.voiceId)}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                  >
                    בחר ונעל קול זה
                  </button>
                </div>
                <audio controls preload="metadata" src={a.audioUrl} className="w-full" />
              </div>
            ))}
          </div>
        ) : null}

        {male?.voiceId ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <code className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
              גברי נעול · {male.voiceId}
            </code>
            <button
              type="button"
              disabled={Boolean(busy) || !male.voiceId}
              onClick={() => void generatePack("male", true)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {busy === "gen-male"
                ? "יוצר מחדש..."
                : "צור מחדש את כל הקטעים הגבריים"}
            </button>
            <span className="self-center text-xs font-bold text-slate-500">
              {male.readyCount}/{male.totalCount} קטעים מוכנים
              {male.approved ? " · מאושר" : " · לא מאושר"}
            </span>
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {packs.map((pack) => {
          const previewSegs = REQUIRED_LISTEN_KEYS.map((key) =>
            pack.segments.find((s) => s.key === key)
          ).filter(Boolean) as PackSegment[];
          const heardAll = hasHeardRequired(pack.gender);
          const trustedLock =
            pack.gender === "female"
              ? pack.adminNote === "Dana"
              : pack.adminNote === "admin_audition_locked";
          const canApprove =
            pack.segmentsReady &&
            pack.readyCount === pack.totalCount &&
            pack.segments.every((s) => s.ready && s.audioUrl) &&
            Boolean(pack.voiceId) &&
            trustedLock &&
            heardAll;

          return (
            <section
              key={pack.gender}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              data-testid={`admin-ivr-pack-${pack.gender}`}
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {pack.label}
                    {pack.gender === "female" ? " · Dana" : ""}
                  </h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {pack.readyCount}/{pack.totalCount} קטעים מוכנים
                    {pack.approved ? " · מאושר" : " · לא מאושר"}
                  </p>
                  <code className="mt-1 block text-[11px] font-bold text-slate-600">
                    {pack.voiceId || "voiceId חסר"}
                  </code>
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

              <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-black text-amber-900">
                    האזנה חובה לפני אישור — אין אישור אוטומטי
                  </div>
                  <button
                    type="button"
                    disabled={
                      Boolean(busy) ||
                      !pack.segments.find(
                        (s) => s.key === "introBeforeEventName"
                      )?.audioUrl
                    }
                    onClick={() => void playFullIntro(pack.gender)}
                    className="rounded-lg bg-amber-800 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50"
                  >
                    {busy === `intro-${pack.gender}`
                      ? "משמיע פתיח..."
                      : "השמע פתיח מלא"}
                  </button>
                </div>
                <ul className="mb-3 flex flex-wrap gap-2 text-[10px] font-black">
                  {REQUIRED_LISTEN_KEYS.map((key) => (
                    <li
                      key={key}
                      className={`rounded-full px-2 py-0.5 ${
                        heard[pack.gender]?.[key]
                          ? "bg-emerald-200 text-emerald-900"
                          : "bg-white text-amber-800"
                      }`}
                    >
                      {heard[pack.gender]?.[key] ? "✓ " : "○ "}
                      {REQUIRED_LISTEN_LABELS[key]}
                    </li>
                  ))}
                </ul>
                <div className="space-y-3">
                  {previewSegs.map((segment) => (
                    <div key={segment.key}>
                      <div className="mb-1 text-[11px] font-black text-slate-700">
                        {REQUIRED_LISTEN_LABELS[
                          segment.key as RequiredListenKey
                        ] || segment.label}
                      </div>
                      {segment.ready && segment.audioUrl ? (
                        <audio
                          controls
                          preload="metadata"
                          src={segment.audioUrl}
                          className="w-full"
                          onPlay={() => markHeard(pack.gender, segment.key)}
                        />
                      ) : (
                        <p className="text-[11px] font-bold text-rose-600">
                          חסר / לא נגיש
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={Boolean(busy) || !canApprove || pack.approved}
                onClick={() => void approvePack(pack.gender)}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                title={
                  canApprove
                    ? "אישור ידני אחרי האזנה"
                    : "חובה להאזין לפתיח המלא + אחרי 1 + אחרי 2/3"
                }
              >
                {pack.approved ? "מאושר" : "אישור Voice Pack (ידני)"}
              </button>

              <div className="mt-5 max-h-80 space-y-3 overflow-y-auto">
                {pack.segments.map((segment) => (
                  <div
                    key={segment.key}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="text-sm font-black text-slate-800">
                        {segment.label}
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          segment.ready
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {segment.ready ? "נשמע" : "חסר"}
                      </span>
                    </div>
                    <pre className="mb-2 whitespace-pre-wrap text-[11px] font-bold text-slate-600">
                      {segment.text}
                    </pre>
                    {segment.ready && segment.audioUrl ? (
                      <audio
                        controls
                        preload="metadata"
                        src={segment.audioUrl}
                        className="w-full"
                      />
                    ) : (
                      <p className="text-[11px] font-bold text-rose-600">
                        {segment.reason || "עדיין לא נוצר"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
