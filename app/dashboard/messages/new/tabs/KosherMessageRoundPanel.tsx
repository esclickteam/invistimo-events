"use client";

import { useEffect, useMemo, useState } from "react";
import {
  isKosherPhone,
  splitEligibleAudience,
  type KosherPrefixRule,
  type KosherRoundNumber,
} from "@/lib/kosherPhones/match";

type Guest = {
  _id?: string;
  phone?: string;
  rsvp?: string;
  isKosherPhone?: boolean;
};

type RoundStats = {
  total: number;
  queued: number;
  dialed: number;
  answered: number;
  noAnswer: number;
  failed: number;
  rsvpYes: number;
  rsvpNo: number;
  rsvpMaybe: number;
};

type StatusResponse = {
  enabled?: boolean;
  customName?: string;
  spokenName?: string;
  script?: string;
  audioUrl?: string;
  audioReady?: boolean;
  audioError?: string;
  prefixes?: string[];
  rounds?: Record<string, RoundStats>;
};

const EMPTY_STATS: RoundStats = {
  total: 0,
  queued: 0,
  dialed: 0,
  answered: 0,
  noAnswer: 0,
  failed: 0,
  rsvpYes: 0,
  rsvpNo: 0,
  rsvpMaybe: 0,
};

export default function KosherMessageRoundPanel({
  invitationId,
  invitationTitle,
  guests,
  round,
}: {
  invitationId: string;
  invitationTitle: string;
  guests: Guest[];
  round: KosherRoundNumber;
}) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [customName, setCustomName] = useState("");
  const [script, setScript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/kosher-calls?invitationId=${encodeURIComponent(invitationId)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json()) as StatusResponse;
    if (!data?.enabled) {
      setStatus({ enabled: false });
      return;
    }
    setStatus(data);
    setCustomName(data.customName || "");
    setScript(data.script || "");
    setAudioUrl(data.audioUrl || "");
  }

  useEffect(() => {
    let cancelled = false;
    load().catch(() => {
      if (!cancelled) setStatus({ enabled: false });
    });
    return () => {
      cancelled = true;
    };
    // invitation changes should reload; round stats are already in the payload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitationId]);

  const prefixes = useMemo<KosherPrefixRule[]>(
    () => (status?.prefixes || []).map((prefix) => ({ prefix, active: true })),
    [status?.prefixes]
  );

  const audience = useMemo(
    () => splitEligibleAudience({ guests, round, prefixes }),
    [guests, round, prefixes]
  );

  if (!status?.enabled) return null;

  const stats = status.rounds?.[String(round)] || EMPTY_STATS;

  async function saveName() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/kosher-calls", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId,
          kosherCallEventName: customName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setMessage("שמירת השם נכשלה");
        return;
      }
      setScript(data.script || "");
      setAudioUrl(data.audioUrl || "");
      setMessage(
        data.invitationTitle && data.invitationTitle !== invitationTitle
          ? "השם לקריינות נשמר"
          : "השם לקריינות נשמר. שם האירוע במערכת לא השתנה."
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function prepareAudio() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/kosher-calls", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action: "preview" }),
      });
      const data = await res.json();
      setScript(data.script || script);
      if (data.audioReady && data.audioUrl) {
        setAudioUrl(data.audioUrl);
        setMessage("ההקלטה מוכנה להאזנה");
      } else {
        setMessage(data.audioError || "הקריינות לא זמינה כרגע. השיחות לא יסומנו כהצלחה עד שתהיה הקלטה.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/kosher-calls", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action: "retry", round }),
      });
      const data = await res.json();
      if (!data?.ok && !data?.success) {
        setMessage(data?.error || "ההפעלה החוזרת נכשלה");
        return;
      }
      setMessage(`הוחזרו לתור ${data.requeued || 0} שיחות`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-[#E6D6BC] bg-white/80 p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#3A2417]">סבב {round} – אישורי הגעה</h3>
          <p className="mt-1 text-sm leading-6 text-[#7A5A3A]">
            הודעות רגילות: {audience.regularCount} רשומות
            <br />
            שיחות מוקלטות למספרים כשרים: {audience.kosherCount} רשומות
          </p>
          <p className="mt-1 text-xs text-[#8A735C]">
            הכמויות הן קהל היעד הזכאי עכשיו. החלוקה הסופית מחושבת שוב בזמן ביצוע הסבב.
          </p>
        </div>
        <div className="text-xs font-bold text-emerald-800">
          {audience.kosherCount > 0
            ? `${guests.filter((guest) => isKosherPhone(guest.phone, prefixes)).length} מספרים כשרים זוהו בספר`
            : "אין מספרים כשרים בקהל הסבב"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-bold text-[#3A2417]">
          שם אירוע לקריינות מוקלטת
          <input
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            placeholder={invitationTitle || "שם האירוע"}
            className="mt-2 w-full rounded-2xl border border-[#E6D6BC] px-3 py-2 font-medium"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={saveName}
            className="rounded-full bg-[#3A2417] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            שמירת שם לקריינות
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={prepareAudio}
            className="rounded-full border border-[#E6D6BC] px-4 py-2 text-sm font-black disabled:opacity-50"
          >
            הכנת הקלטה
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-[#FBF7F1] p-4 text-sm leading-7 text-[#3A2417]">
        <div className="mb-2 font-black">תצוגה מקדימה של ההודעה</div>
        <p className="whitespace-pre-line">{script}</p>
        {audioUrl ? (
          <audio className="mt-3 w-full" controls src={audioUrl} />
        ) : (
          <p className="mt-2 text-xs text-[#8A735C]">
            עדיין אין קובץ שמע מוכן. אפשר להאזין אחרי הכנת ההקלטה, לפני הפעלת הסבב.
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-bold md:grid-cols-4">
        <Stat label="שיחות שבוצעו" value={stats.dialed} />
        <Stat label="נענו" value={stats.answered} />
        <Stat label="לא נענו" value={stats.noAnswer} />
        <Stat label="נכשלו" value={stats.failed} />
        <Stat label="אישרו הגעה" value={stats.rsvpYes} />
        <Stat label="לא מגיעים" value={stats.rsvpNo} />
        <Stat label="עדיין לא יודעים" value={stats.rsvpMaybe} />
        <Stat label="ממתינות בתור" value={stats.queued} />
      </div>

      {stats.failed > 0 ? (
        <button
          type="button"
          disabled={busy}
          onClick={retry}
          className="mt-4 rounded-full border border-[#E6D6BC] px-4 py-2 text-sm font-black"
        >
          הפעלה חוזרת לשיחות שנכשלו
        </button>
      ) : null}
      {message ? <p className="mt-3 text-sm font-bold text-[#3A2417]">{message}</p> : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#E6D6BC] bg-white px-2 py-3">
      <div className="text-lg font-black text-[#3A2417]">{value}</div>
      <div className="text-[#7A5A3A]">{label}</div>
    </div>
  );
}
