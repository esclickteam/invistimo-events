"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
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
  failureReason: string;
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

function dash(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

export default function IvrCallsReportModal({
  userId,
  clientName,
  onClose,
}: {
  userId: string;
  clientName: string;
  onClose: () => void;
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draftQ, setDraftQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
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
        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "טעינת הדוח נכשלה");
      } finally {
        setLoading(false);
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
  const cards: Array<{ label: string; value: string }> = stats
    ? [
        { label: "סך ניסיונות חיוג", value: String(stats.dialAttempts) },
        { label: "אורחים ייחודיים שחויגו", value: String(stats.uniqueGuests) },
        { label: "שיחות שנענו", value: String(stats.answered) },
        { label: "שיחות שלא נענו", value: String(stats.unanswered) },
        { label: "שיחות שנכשלו", value: String(stats.failed) },
        { label: "ניתק בלי לבחור", value: String(stats.hungUpWithoutChoice) },
        { label: "אישרו הגעה", value: String(stats.yes) },
        { label: "לא מגיעים", value: String(stats.no) },
        { label: "מתלבטים", value: String(stats.maybe) },
        { label: "ללא תשובה סופית", value: String(stats.noFinalAnswer) },
        { label: "שיעור מענה", value: stats.answerRateLabel },
        { label: "משך שיחה ממוצע", value: stats.avgCallLabel },
      ]
    : [];

  const fieldClass =
    "h-11 w-full rounded-2xl border border-[#E7D8C6] bg-white px-3 text-sm font-bold text-[#3A2A1C]";

  function cells(row: Row) {
    return [
      row.atLabel,
      row.eventName,
      row.guestName,
      row.phone,
      dash(row.round),
      String(row.attemptNumber),
      row.callStatusLabel,
      row.answeredLabel,
      dash(row.choiceDigit),
      row.rsvpLabel,
      row.callDurationLabel,
      dash(row.failureReason),
    ];
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-[#EFE2D1] bg-[#FFFDF8] px-3 py-3"
              >
                <div className="text-[11px] font-bold leading-5 text-[#8A7867]">
                  {card.label}
                </div>
                <div className="mt-1 text-lg font-black text-[#3A2A1C]">
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 rounded-[24px] border border-[#E7D8C6] bg-[#FFFDF8] p-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <select
              value={filters.round}
              onChange={(event) => updateFilter({ round: event.target.value })}
              className={fieldClass}
              aria-label="סבב"
            >
              <option value="">כל הסבבים</option>
              <option value="1">סבב 1</option>
              <option value="2">סבב 2</option>
              <option value="3">סבב 3</option>
            </select>
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
            <label className="text-xs font-bold text-[#8A7867]">
              מתאריך
              <input
                type="date"
                value={filters.from}
                onChange={(event) => updateFilter({ from: event.target.value })}
                className={`${fieldClass} mt-1`}
              />
            </label>
            <label className="text-xs font-bold text-[#8A7867]">
              עד תאריך
              <input
                type="date"
                value={filters.to}
                onChange={(event) => updateFilter({ to: event.target.value })}
                className={`${fieldClass} mt-1`}
              />
            </label>
            <form
              className="flex gap-2 sm:col-span-2"
              onSubmit={(event) => {
                event.preventDefault();
                updateFilter({ q: draftQ.trim() });
              }}
            >
              <input
                value={draftQ}
                onChange={(event) => setDraftQ(event.target.value)}
                placeholder="חיפוש לפי שם אורח או טלפון"
                className={fieldClass}
                aria-label="חיפוש לפי שם אורח או טלפון"
              />
              <button
                type="submit"
                className="h-11 shrink-0 rounded-2xl bg-[#241A14] px-4 text-sm font-black text-white"
              >
                חיפוש
              </button>
            </form>
            <button
              type="button"
              onClick={() => void exportExcel()}
              disabled={exporting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#D9B46F]/60 bg-[#FFFDF8] px-5 text-sm font-black text-[#6B451E] shadow-sm transition hover:bg-[#FFF8E6] disabled:opacity-60"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : null}
              {exporting ? "מייצא..." : "ייצוא לאקסל"}
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="mt-4 md:hidden">
            {loading ? (
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
                      <div>סבב: {dash(row.round)}</div>
                      <div>ניסיון: {row.attemptNumber}</div>
                      <div>נענתה: {row.answeredLabel}</div>
                      <div>הקשה: {dash(row.choiceDigit)}</div>
                      <div>תשובה: {row.rsvpLabel}</div>
                      <div>משך: {row.callDurationLabel}</div>
                      {row.failureReason ? (
                        <div className="col-span-2">סיבה: {row.failureReason}</div>
                      ) : null}
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 hidden min-w-0 md:block">
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
                  {loading ? (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-3 py-8 text-center font-bold text-[#8A7867]">
                        טוען דוח שיחות...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-3 py-8 text-center font-bold text-[#8A7867]">
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-[#6B5138]">
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
        </main>
      </div>
    </div>
  );
}
