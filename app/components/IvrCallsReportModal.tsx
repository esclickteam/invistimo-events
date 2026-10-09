"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
import {
  IVR_ANSWER_RATE_DEFINITION,
  IVR_REPORT_STATUSES,
  IVR_REPORT_STATUS_LABELS,
  type IvrReportCallStatus,
} from "@/lib/calls/ivrCallReport";

type Stats = {
  dialAttempts: number;
  uniqueGuests: number;
  answered: number;
  unanswered: number;
  failed: number;
  hungUpWithoutChoice: number;
  yes: number;
  no: number;
  maybe: number;
  noFinalAnswer: number;
  answerRateLabel: string;
  avgCallLabel: string;
};

type AllRounds = {
  uniqueGuests: number;
  dialAttempts: number;
  answered: number;
  yes: number;
  no: number;
  maybe: number;
  noFinalAnswer: number;
};

type RoundCard = {
  key: "1" | "2" | "3" | "unassigned";
  title: string;
  statusLabel: string;
  intended: number;
  dialAttempts: number;
  answered: number;
  unanswered: number;
  yes: number;
  no: number;
  maybe: number;
  hungUpWithoutChoice: number;
  failed: number;
};

type Row = {
  id: string;
  atLabel: string;
  eventName: string;
  guestName: string;
  phone: string;
  round: number | null;
  attemptNumber: number;
  callStatus: IvrReportCallStatus;
  callStatusLabel: string;
  answeredLabel: string;
  choiceDigit: string;
  rsvpLabel: string;
  callDurationLabel: string;
  answerToPlaybackLabel: string;
  digitToFollowupLabel: string;
  failureReason: string;
  hangupCause: string;
  telnyxCallControlId: string;
};

type Filters = {
  invitationId: string;
  from: string;
  to: string;
  round: string;
  callStatus: string;
  rsvp: string;
  q: string;
};

const EMPTY_FILTERS: Filters = {
  invitationId: "",
  from: "",
  to: "",
  round: "",
  callStatus: "",
  rsvp: "",
  q: "",
};

const EMPTY_ALL: AllRounds = {
  uniqueGuests: 0,
  dialAttempts: 0,
  answered: 0,
  yes: 0,
  no: 0,
  maybe: 0,
  noFinalAnswer: 0,
};

const COLUMNS = [
  "תאריך ושעה",
  "אירוע",
  "אורח",
  "טלפון",
  "סבב",
  "ניסיון",
  "סטטוס",
  "נענתה",
  "הקשה",
  "תשובת הגעה",
  "משך",
  "מענה עד קריינות",
  "הקשה עד המשך",
  "סיבת כישלון",
] as const;

function statusClass(status: string) {
  if (status === "yes") return "bg-emerald-50 text-emerald-800";
  if (status === "no" || status === "failed") return "bg-rose-50 text-rose-800";
  if (status === "maybe" || status === "partial") return "bg-amber-50 text-amber-900";
  if (status === "answered_no_digit" || status === "answered_hangup") {
    return "bg-orange-50 text-orange-900";
  }
  if (status === "in_call" || status === "dialing" || status === "ringing") {
    return "bg-sky-50 text-sky-800";
  }
  return "bg-[#F6F1EA] text-[#6B5138]";
}

function roundLabel(round: number | null) {
  if (round == null) return "ללא שיוך";
  return String(round);
}

function StatBox({
  label,
  value,
  danger = false,
  hint,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
  hint?: string;
}) {
  const text =
    typeof value === "number" ? value.toLocaleString("he-IL") : value;
  return (
    <div
      className={`rounded-[22px] border p-4 text-right ${
        danger ? "border-red-200 bg-red-50" : "border-[#EFE2D1] bg-[#FFFDF8]"
      }`}
    >
      <div className={`text-xs font-black ${danger ? "text-red-500" : "text-[#7B6754]"}`}>
        {label}
      </div>
      <div className={`mt-1 text-2xl font-black ${danger ? "text-red-600" : "text-[#24190F]"}`}>
        {text}
      </div>
      {hint ? (
        <div className="mt-1 text-[10px] font-bold leading-4 text-[#A08B74]">{hint}</div>
      ) : null}
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 min-w-[220px] rounded-[22px] bg-[#F3EADF]" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-20 rounded-[22px] bg-[#F3EADF]" />
        ))}
      </div>
      <div className="h-64 rounded-[22px] bg-[#F3EADF]" />
    </div>
  );
}

export default function IvrCallsReportModal({
  userId,
  clientName,
  onClose,
  initialRound,
}: {
  userId: string;
  clientName: string;
  onClose: () => void;
  /** Optional round filter ("1" | "2" | "3") when opened from a specific IVR round. */
  initialRound?: string;
}) {
  const [filters, setFilters] = useState<Filters>(() =>
    initialRound && ["1", "2", "3"].includes(String(initialRound))
      ? { ...EMPTY_FILTERS, round: String(initialRound) }
      : EMPTY_FILTERS
  );
  const [draftQ, setDraftQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [stats, setStats] = useState<Stats | null>(null);
  const [allRounds, setAllRounds] = useState<AllRounds>(EMPTY_ALL);
  const [rounds, setRounds] = useState<RoundCard[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(
    async (nextPage = page) => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, value);
      }
      params.set("page", String(nextPage));
      params.set("pageSize", "25");
      try {
        const res = await fetch(
          `/api/admin/users/${encodeURIComponent(userId)}/ivr-call-report?${params.toString()}`,
          { credentials: "include", cache: "no-store" }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "טעינת הדוח נכשלה");
        }
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setTotal(Number(data.total || 0));
        setPage(Number(data.page || nextPage));
        setPageSize(Number(data.pageSize || 25));
        setStats(data.stats || null);
        setAllRounds(data.allRounds || EMPTY_ALL);
        setRounds(Array.isArray(data.rounds) ? data.rounds : []);
        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "טעינת הדוח נכשלה");
      } finally {
        setLoading(false);
        setLoadedOnce(true);
      }
    },
    [filters, page, userId]
  );

  useEffect(() => {
    void load(page);
  }, [load, page]);

  function updateFilter(patch: Partial<Filters>) {
    setPage(1);
    setFilters((current) => ({ ...current, ...patch }));
  }

  async function exportExcel() {
    setExporting(true);
    setError("");
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    params.set("format", "xlsx");
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}/ivr-call-report?${params.toString()}`,
        { credentials: "include", cache: "no-store" }
      );
      if (!res.ok) throw new Error("ייצוא נכשל");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "דוח_שיחות_IVR.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ייצוא נכשל");
    } finally {
      setExporting(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const selectedKey = filters.round || "all";
  const selectedRound = rounds.find((round) => round.key === selectedKey) || null;
  const viewTitle =
    selectedKey === "all"
      ? "כל הסבבים"
      : selectedRound?.title || "ללא שיוך";
  const fieldClass =
    "h-11 w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-3 text-sm font-bold text-[#3A2A1C] outline-none";

  function cells(row: Row) {
    return [
      row.atLabel,
      row.eventName,
      row.guestName,
      row.phone,
      roundLabel(row.round),
      String(row.attemptNumber),
      row.callStatusLabel,
      row.answeredLabel,
      row.choiceDigit || "—",
      row.rsvpLabel,
      row.callDurationLabel,
      row.answerToPlaybackLabel || "—",
      row.digitToFollowupLabel || "—",
      row.failureReason || "—",
    ];
  }

  function cardClass(active: boolean) {
    return `min-w-[240px] shrink-0 rounded-[22px] border px-4 py-3 text-right transition ${
      active
        ? "border-[#D7A34D] bg-white shadow-sm"
        : "border-[#EFE2D1] bg-white/60 hover:bg-white"
    }`;
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[10050] flex items-start justify-center overflow-y-auto bg-black/45 px-2 py-3 backdrop-blur-sm sm:px-4 sm:py-6"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[calc(100dvh-24px)] w-[calc(100vw-1rem)] max-w-[1400px] min-w-0 flex-col overflow-hidden rounded-[26px] border border-[#E7D8C6] bg-white shadow-[0_28px_90px_rgba(0,0,0,0.25)] sm:max-h-[calc(100dvh-48px)] sm:w-[calc(100vw-2rem)] sm:rounded-[34px]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-[#EFE2D1] bg-gradient-to-br from-[#FFFDF8] to-[#F8EFE3] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#6B5138] shadow-sm transition hover:bg-[#F1E5D6]"
              aria-label="סגירה"
            >
              <X size={20} />
            </button>
            <div className="min-w-0 flex-1 text-right">
              <h2 className="break-words text-2xl font-black text-[#3A2A1C] sm:text-3xl">
                דוח שיחות IVR
              </h2>
              <p className="mt-1 text-sm font-bold leading-6 text-[#8A7867]">
                {clientName || "לקוח"} · כל ניסיון חיוג בנפרד, לפי שעון ישראל
              </p>
            </div>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {!loadedOnce && loading ? (
            <SkeletonBlock />
          ) : error && !stats ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-sm font-bold leading-7 text-red-700">
              {error}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void load(page)}
                  className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-700"
                >
                  נסו שוב
                </button>
              </div>
            </div>
          ) : (
            <div className="min-w-0 space-y-5">
              {error ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  הרענון נכשל: {error}. מוצגים הנתונים האחרונים שנשמרו במסך.
                </div>
              ) : null}

              <section className="rounded-[24px] border border-[#E7D8C6] bg-[#FFFDF8] p-4">
                <div className="mb-3 text-sm font-black text-[#7B6754]">סבבים</div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  <button
                    type="button"
                    onClick={() => updateFilter({ round: "" })}
                    className={`min-w-[220px] shrink-0 rounded-[22px] border px-4 py-3 text-right transition ${
                      selectedKey === "all"
                        ? "border-[#D7A34D] bg-white shadow-sm"
                        : "border-[#EFE2D1] bg-white/60 hover:bg-white"
                    }`}
                    aria-pressed={selectedKey === "all"}
                  >
                    <div className="text-base font-black text-[#3A2A1C]">כל הסבבים</div>
                    <div className="mt-2 space-y-0.5 text-xs font-black leading-5 text-[#8A7867]">
                      <div>{allRounds.uniqueGuests.toLocaleString("he-IL")} אורחים ייחודיים</div>
                      <div>
                        {allRounds.dialAttempts.toLocaleString("he-IL")} ניסיונות חיוג ·{" "}
                        {allRounds.answered.toLocaleString("he-IL")} נענו
                      </div>
                      <div>
                        {allRounds.yes.toLocaleString("he-IL")} אישרו הגעה ·{" "}
                        {allRounds.no.toLocaleString("he-IL")} לא מגיעים ·{" "}
                        {allRounds.maybe.toLocaleString("he-IL")} מתלבטים
                      </div>
                      <div>
                        {allRounds.noFinalAnswer.toLocaleString("he-IL")} ללא תשובה סופית
                      </div>
                    </div>
                  </button>

                  {rounds.map((round) => (
                    <button
                      key={round.key}
                      type="button"
                      onClick={() => updateFilter({ round: round.key })}
                      className={cardClass(selectedKey === round.key)}
                      aria-pressed={selectedKey === round.key}
                    >
                      <div className="text-base font-black text-[#3A2A1C]">{round.title}</div>
                      <div className="mt-0.5 text-[11px] font-bold text-[#A08B74]">
                        {round.statusLabel}
                      </div>
                      <div className="mt-2 space-y-0.5 text-xs font-black leading-5 text-[#8A7867]">
                        <div>{round.intended.toLocaleString("he-IL")} מיועדים לחיוג</div>
                        <div>
                          {round.dialAttempts.toLocaleString("he-IL")} ניסיונות ·{" "}
                          {round.answered.toLocaleString("he-IL")} נענו ·{" "}
                          {round.unanswered.toLocaleString("he-IL")} לא נענו
                        </div>
                        <div>
                          {round.yes.toLocaleString("he-IL")} אישרו הגעה ·{" "}
                          {round.no.toLocaleString("he-IL")} לא מגיעים ·{" "}
                          {round.maybe.toLocaleString("he-IL")} מתלבטים
                        </div>
                        <div>
                          {round.hungUpWithoutChoice.toLocaleString("he-IL")} ניתקו ללא הקשה ·{" "}
                          {round.failed.toLocaleString("he-IL")} נכשלו
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-[#E7D8C6] bg-white p-4">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-[#3A2A1C]">{viewTitle}</h3>
                    <p className="mt-1 text-xs font-bold text-[#8A7867]">
                      מוצגות {total.toLocaleString("he-IL")} שיחות ·{" "}
                      {(stats?.uniqueGuests || 0).toLocaleString("he-IL")} אורחים ייחודיים ·{" "}
                      {(stats?.dialAttempts || 0).toLocaleString("he-IL")} ניסיונות חיוג
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void load(page)}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#E7D8C6] bg-white px-5 text-sm font-black text-[#6B451E] shadow-sm transition hover:bg-[#FFF8E6] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                    >
                      {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                      רענון מהשרת
                    </button>
                    <button
                      type="button"
                      disabled={exporting || total === 0}
                      onClick={() => void exportExcel()}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#1F7A4D] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#17663F] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                    >
                      {exporting ? <Loader2 size={16} className="animate-spin" /> : null}
                      ייצוא דוח לאקסל
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                  <StatBox label="סך ניסיונות חיוג" value={stats?.dialAttempts || 0} />
                  <StatBox label="אורחים ייחודיים" value={stats?.uniqueGuests || 0} />
                  <StatBox label="שיחות שנענו" value={stats?.answered || 0} />
                  <StatBox label="שיחות שלא נענו" value={stats?.unanswered || 0} />
                  <StatBox
                    label="שיחות שנכשלו"
                    value={stats?.failed || 0}
                    danger={(stats?.failed || 0) > 0}
                  />
                  <StatBox label="ניתקו ללא הקשה" value={stats?.hungUpWithoutChoice || 0} />
                  <StatBox label="אישרו הגעה" value={stats?.yes || 0} />
                  <StatBox label="לא מגיעים" value={stats?.no || 0} />
                  <StatBox label="מתלבטים" value={stats?.maybe || 0} />
                  <StatBox label="ללא תשובה סופית" value={stats?.noFinalAnswer || 0} />
                  <StatBox
                    label="שיעור מענה"
                    value={stats?.answerRateLabel || "לא זמין"}
                    hint={IVR_ANSWER_RATE_DEFINITION}
                  />
                  <StatBox label="משך שיחה ממוצע" value={stats?.avgCallLabel || "לא זמין"} />
                </div>
              </section>

              <section className="min-w-0 rounded-[24px] border border-[#E7D8C6] bg-white p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black text-[#6B5A48]">אירוע</span>
                    <select
                      value={filters.invitationId}
                      onChange={(event) => updateFilter({ invitationId: event.target.value })}
                      className={fieldClass}
                      aria-label="אירוע"
                    >
                      <option value="">כל האירועים</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black text-[#6B5A48]">סבב</span>
                    <select
                      value={filters.round}
                      onChange={(event) => updateFilter({ round: event.target.value })}
                      className={fieldClass}
                      aria-label="סבב"
                    >
                      <option value="">כל הסבבים</option>
                      {rounds.map((round) => (
                        <option key={round.key} value={round.key}>
                          {round.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black text-[#6B5A48]">
                      סטטוס שיחה
                    </span>
                    <select
                      value={filters.callStatus}
                      onChange={(event) => updateFilter({ callStatus: event.target.value })}
                      className={fieldClass}
                      aria-label="סטטוס שיחה"
                    >
                      <option value="">כל סטטוסי השיחה</option>
                      {IVR_REPORT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {IVR_REPORT_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black text-[#6B5A48]">
                      תשובת הגעה
                    </span>
                    <select
                      value={filters.rsvp}
                      onChange={(event) => updateFilter({ rsvp: event.target.value })}
                      className={fieldClass}
                      aria-label="תשובת הגעה"
                    >
                      <option value="">כל תשובות ההגעה</option>
                      <option value="yes">אישר הגעה</option>
                      <option value="no">לא מגיע</option>
                      <option value="maybe">מתלבט</option>
                      <option value="none">אין תשובה / ללא תשובה סופית</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black text-[#6B5A48]">מתאריך</span>
                    <input
                      type="date"
                      value={filters.from}
                      onChange={(event) => updateFilter({ from: event.target.value })}
                      className={fieldClass}
                      aria-label="מתאריך"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black text-[#6B5A48]">עד תאריך</span>
                    <input
                      type="date"
                      value={filters.to}
                      onChange={(event) => updateFilter({ to: event.target.value })}
                      className={fieldClass}
                      aria-label="עד תאריך"
                    />
                  </label>
                  <form
                    className="flex items-end gap-2 md:col-span-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      updateFilter({ q: draftQ.trim() });
                    }}
                  >
                    <label className="block min-w-0 flex-1">
                      <span className="mb-2 block text-xs font-black text-[#6B5A48]">
                        חיפוש אורח או טלפון
                      </span>
                      <input
                        value={draftQ}
                        onChange={(event) => setDraftQ(event.target.value)}
                        placeholder="שם אורח או מספר טלפון"
                        className={fieldClass}
                        aria-label="חיפוש לפי שם אורח או טלפון"
                      />
                    </label>
                    <button
                      type="submit"
                      className="h-11 shrink-0 rounded-2xl bg-[#241A14] px-4 text-sm font-black text-white"
                    >
                      חיפוש
                    </button>
                  </form>
                </div>
              </section>

              <div className="md:hidden">
                {loading && rows.length === 0 ? (
                  <div className="rounded-2xl border border-[#EFE2D1] bg-white px-4 py-6 text-center text-sm font-bold text-[#8A7867]">
                    טוען דוח שיחות...
                  </div>
                ) : rows.length === 0 ? (
                  <div className="rounded-2xl border border-[#EFE2D1] bg-white px-4 py-6 text-center text-sm font-bold text-[#8A7867]">
                    אין שיחות תואמות לסינון.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rows.map((row) => (
                      <article
                        key={row.id}
                        className="rounded-2xl border border-[#EFE2D1] bg-white p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-black ${statusClass(row.callStatus)}`}
                          >
                            {row.callStatusLabel}
                          </span>
                          <div className="text-right">
                            <div className="font-black text-[#3A2A1C]">{row.guestName}</div>
                            <div className="text-xs font-bold text-[#8A7867]" dir="ltr">
                              {row.phone || "—"}
                            </div>
                          </div>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs font-bold text-[#6B5138]">
                          <div>תאריך: {row.atLabel}</div>
                          <div>אירוע: {row.eventName}</div>
                          <div>סבב: {roundLabel(row.round)}</div>
                          <div>ניסיון: {row.attemptNumber}</div>
                          <div>נענתה: {row.answeredLabel}</div>
                          <div>הקשה: {row.choiceDigit || "—"}</div>
                          <div>תשובה: {row.rsvpLabel}</div>
                          <div>משך: {row.callDurationLabel}</div>
                          <div>מענה עד קריינות: {row.answerToPlaybackLabel || "—"}</div>
                          <div>הקשה עד המשך: {row.digitToFollowupLabel || "—"}</div>
                          {row.failureReason ? (
                            <div className="col-span-2">סיבה: {row.failureReason}</div>
                          ) : null}
                          {row.hangupCause || row.telnyxCallControlId ? (
                            <div className="col-span-2 break-all text-[11px] text-[#8A7867]">
                              {row.hangupCause ? `ניתוק: ${row.hangupCause}` : ""}
                              {row.telnyxCallControlId
                                ? ` · Telnyx: ${row.telnyxCallControlId}`
                                : ""}
                            </div>
                          ) : null}
                        </dl>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden min-w-0 md:block">
                <div className="w-full min-w-0 overflow-x-auto rounded-[24px] border border-[#E7D8C6] bg-white">
                  <table className="w-full min-w-[1100px] border-collapse text-right text-sm">
                    <thead>
                      <tr className="bg-[#FFFDF8]">
                        {COLUMNS.map((heading) => (
                          <th
                            key={heading}
                            className="whitespace-nowrap border-b border-[#EFE2D1] px-3 py-3 text-xs font-black text-[#7B6754]"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading && rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={COLUMNS.length}
                            className="px-3 py-8 text-center font-bold text-[#8A7867]"
                          >
                            טוען דוח שיחות...
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={COLUMNS.length}
                            className="px-3 py-8 text-center font-bold text-[#8A7867]"
                          >
                            אין שיחות תואמות לסינון.
                          </td>
                        </tr>
                      ) : (
                        rows.map((row) => (
                          <tr key={row.id} className="border-b border-[#F3ECE4] last:border-0">
                            {cells(row).map((value, index) => (
                              <td
                                key={`${row.id}-${index}`}
                                className="max-w-[220px] truncate px-3 py-3 font-bold text-[#3A2A1C]"
                                dir={index === 3 ? "ltr" : undefined}
                                title={
                                  index === COLUMNS.length - 1
                                    ? [row.hangupCause, row.telnyxCallControlId]
                                        .filter(Boolean)
                                        .join(" · ")
                                    : undefined
                                }
                              >
                                {index === 6 ? (
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${statusClass(row.callStatus)}`}
                                  >
                                    {value}
                                  </span>
                                ) : (
                                  value
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-[#6B5138]">
                <div>
                  {total.toLocaleString("he-IL")} שיחות · עמוד {page.toLocaleString("he-IL")} מתוך{" "}
                  {pages.toLocaleString("he-IL")}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="h-10 rounded-full border border-[#E7D8C6] bg-white px-4 disabled:opacity-40"
                  >
                    הקודם
                  </button>
                  <button
                    type="button"
                    disabled={page >= pages || loading}
                    onClick={() => setPage((current) => current + 1)}
                    className="h-10 rounded-full border border-[#E7D8C6] bg-white px-4 disabled:opacity-40"
                  >
                    הבא
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
