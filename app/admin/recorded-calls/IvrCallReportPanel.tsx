"use client";

import { useCallback, useEffect, useState } from "react";
import { IVR_REPORT_STATUSES, IVR_REPORT_STATUS_LABELS } from "@/lib/calls/ivrCallReport";

type Stats = {
  attempts: number;
  uniqueGuests: number;
  answered: number;
  uniqueAnswered: number;
  noAnswer: number;
  busy: number;
  failed: number;
  answeredNoResponse: number;
  partial: number;
  yes: number;
  no: number;
  maybe: number;
  uniqueYes: number;
  uniqueNo: number;
  uniqueMaybe: number;
  queued: number;
  answerRate: number | null;
  completionRate: number | null;
  avgCallMs: number | null;
  avgAnswerToPlaybackMs: number | null;
  avgDigitToFollowupMs: number | null;
};

type Row = {
  id: string;
  atLabel: string;
  eventName: string;
  clientName: string;
  guestName: string;
  phone: string;
  directionLabel: string;
  round: number | null;
  audioModeLabel: string;
  callStatusLabel: string;
  rsvpLabel: string;
  invitedCount: number | null;
  attendingCount: number | null;
  callDurationLabel: string;
  ringLabel: string;
  answerToPlaybackLabel: string;
  digitToFollowupLabel: string;
  attempts: number;
  error: string;
  telnyxCallControlId: string;
  problem: boolean;
};

type TimelineEntry = {
  atLabel: string;
  source: string;
  label: string;
  detail: string;
  digit: string;
};

type Detail = Row & {
  timeline: TimelineEntry[];
  timelineAvailable: boolean;
  hangupCause: string;
  hangupSource: string;
  telnyxCallLegId: string;
  telnyxCallSessionId: string;
  digits: string;
  digitToRsvpLabel: string;
  dialToRingLabel: string;
};

type RoundSummary = {
  round: number;
  eligibleCount: number | null;
  queued: number;
  sent: number;
  answered: number;
  noAnswer: number;
  responses: number;
  failed: number;
  reasons: string[];
  failureReason: string;
  startedAtLabel: string;
  endedAtLabel: string;
  durationLabel: string;
};

type Filters = {
  invitationId: string;
  userId: string;
  from: string;
  to: string;
  round: string;
  direction: string;
  callStatus: string;
  rsvp: string;
  audioMode: string;
  outcome: string;
  q: string;
};

const EMPTY_FILTERS: Filters = {
  invitationId: "",
  userId: "",
  from: "",
  to: "",
  round: "",
  direction: "",
  callStatus: "",
  rsvp: "",
  audioMode: "",
  outcome: "",
  q: "",
};

function percent(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "לא זמין";
  return `${Math.round(value * 1000) / 10}%`;
}

function msLabel(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "לא זמין";
  const abs = Math.abs(Math.round(value));
  if (abs < 1000) return `${abs} ms`;
  return `${(abs / 1000).toFixed(1)} שניות`;
}

function countText(value: number | null) {
  return value == null ? "לא זמין" : String(value);
}

export default function IvrCallReportPanel() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draftQ, setDraftQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState("");

  const load = useCallback(async (nextPage = page, silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(nextPage));
    params.set("pageSize", "50");
    try {
      const res = await fetch(`/api/admin/ivr/call-report?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "טעינת הדוח נכשלה");
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(Number(data.total || 0));
      setPage(Number(data.page || nextPage));
      setPageSize(Number(data.pageSize || 50));
      setStats(data.stats || null);
      setRounds(Array.isArray(data.rounds) ? data.rounds : []);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "טעינת הדוח נכשלה");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void fetch("/api/admin/ivr/call-report?meta=1", {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.ok) return;
        setEvents(Array.isArray(data.events) ? data.events : []);
        setClients(Array.isArray(data.clients) ? data.clients : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(page, true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [load, page]);

  function updateFilter(patch: Partial<Filters>) {
    setPage(1);
    setFilters((current) => ({ ...current, ...patch }));
  }

  async function openDetail(id: string) {
    setDetailError("");
    setDetail(null);
    try {
      const res = await fetch(
        `/api/admin/ivr/call-report?attemptId=${encodeURIComponent(id)}`,
        { credentials: "include", cache: "no-store" }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "השיחה לא נמצאה");
      setDetail(data.attempt);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "השיחה לא נמצאה");
    }
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
      const res = await fetch(`/api/admin/ivr/call-report?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("ייצוא נכשל");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "דוח_שיחות_IVR.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ייצוא נכשל");
    } finally {
      setExporting(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cards: Array<{ label: string; value: string; hint?: string }> = stats
    ? [
        { label: "סך ניסיונות", value: String(stats.attempts), hint: `${stats.uniqueGuests} אורחים` },
        { label: "נענו", value: String(stats.answered), hint: `${stats.uniqueAnswered} אורחים` },
        { label: "לא נענו", value: String(stats.noAnswer) },
        { label: "תפוסות", value: String(stats.busy) },
        { label: "נכשלו", value: String(stats.failed) },
        { label: "נענו ללא תשובה", value: String(stats.answeredNoResponse) },
        { label: "תשובה חלקית", value: String(stats.partial) },
        { label: "אישרו הגעה", value: String(stats.yes), hint: `${stats.uniqueYes} אורחים` },
        { label: "לא מגיעים", value: String(stats.no), hint: `${stats.uniqueNo} אורחים` },
        { label: "מתלבטים", value: String(stats.maybe), hint: `${stats.uniqueMaybe} אורחים` },
        { label: "בתור", value: String(stats.queued) },
        { label: "אחוז מענה", value: percent(stats.answerRate) },
        { label: "השלמה מתוך שנענו", value: percent(stats.completionRate) },
        { label: "משך שיחה ממוצע", value: msLabel(stats.avgCallMs) },
        { label: "מענה עד השמעה", value: msLabel(stats.avgAnswerToPlaybackMs) },
        { label: "תגובה להקשה", value: msLabel(stats.avgDigitToFollowupMs) },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-3 text-xs font-medium leading-6 text-[var(--admin-muted)]">
        הדוח מציג ניסיונות IVR שנשמרו במערכת. ציר זמן וזמני השמעה מופיעים רק כשיש
        אירוע שנרשם. כשאין חותמת זמן מוצג "לא זמין". שיחה שלא נענתה לא מסומנת
        כאילו האורח ענה וניתק.
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2"
          >
            <div className="text-[11px] font-bold text-[var(--admin-muted)]">
              {card.label}
            </div>
            <div className="mt-1 text-lg font-black text-[#241A14]">{card.value}</div>
            {card.hint ? (
              <div className="text-[10px] font-bold text-[var(--admin-muted)]">
                {card.hint}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-[var(--admin-border)] bg-white p-3 md:grid-cols-4 xl:grid-cols-6">
        <select
          value={filters.invitationId}
          onChange={(event) => updateFilter({ invitationId: event.target.value })}
          className="rounded-lg border border-[var(--admin-border)] px-2 py-2 text-xs font-bold"
        >
          <option value="">כל האירועים</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
        <select
          value={filters.userId}
          onChange={(event) => updateFilter({ userId: event.target.value })}
          className="rounded-lg border border-[var(--admin-border)] px-2 py-2 text-xs font-bold"
        >
          <option value="">כל הלקוחות</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.from}
          onChange={(event) => updateFilter({ from: event.target.value })}
          className="rounded-lg border border-[var(--admin-border)] px-2 py-2 text-xs font-bold"
          aria-label="מתאריך"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(event) => updateFilter({ to: event.target.value })}
          className="rounded-lg border border-[var(--admin-border)] px-2 py-2 text-xs font-bold"
          aria-label="עד תאריך"
        />
        <select
          value={filters.round}
          onChange={(event) => updateFilter({ round: event.target.value })}
          className="rounded-lg border border-[var(--admin-border)] px-2 py-2 text-xs font-bold"
        >
          <option value="">כל הסבבים</option>
          <option value="1">סבב 1</option>
          <option value="2">סבב 2</option>
          <option value="3">סבב 3</option>
        </select>
        <select
          value={filters.direction}
          onChange={(event) => updateFilter({ direction: event.target.value })}
          className="rounded-lg border border-[var(--admin-border)] px-2 py-2 text-xs font-bold"
        >
          <option value="">נכנסות ויוצאות</option>
          <option value="outbound">יוצאת</option>
          <option value="inbound">נכנסת</option>
        </select>
        <select
          value={filters.callStatus}
          onChange={(event) => updateFilter({ callStatus: event.target.value })}
          className="rounded-lg border border-[var(--admin-border)] px-2 py-2 text-xs font-bold"
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
          className="rounded-lg border border-[var(--admin-border)] px-2 py-2 text-xs font-bold"
        >
          <option value="">כל אישורי ההגעה</option>
          <option value="yes">אישר הגעה</option>
          <option value="no">לא מגיע</option>
          <option value="maybe">מתלבט</option>
          <option value="none">אין תשובה</option>
        </select>
        <select
          value={filters.audioMode}
          onChange={(event) => updateFilter({ audioMode: event.target.value })}
          className="rounded-lg border border-[var(--admin-border)] px-2 py-2 text-xs font-bold"
        >
          <option value="">כל סוגי ההקלטה</option>
          <option value="ai">קריינות AI</option>
          <option value="self_recorded">הקלטה אישית</option>
        </select>
        <select
          value={filters.outcome}
          onChange={(event) => updateFilter({ outcome: event.target.value })}
          className="rounded-lg border border-[var(--admin-border)] px-2 py-2 text-xs font-bold"
        >
          <option value="">הושלמו ועם בעיה</option>
          <option value="completed">שיחות שהושלמו</option>
          <option value="problem">שיחות עם בעיה</option>
        </select>
        <form
          className="flex gap-2 md:col-span-2"
          onSubmit={(event) => {
            event.preventDefault();
            updateFilter({ q: draftQ.trim() });
          }}
        >
          <input
            value={draftQ}
            onChange={(event) => setDraftQ(event.target.value)}
            placeholder="שם אורח או טלפון"
            className="w-full rounded-lg border border-[var(--admin-border)] px-2 py-2 text-xs font-bold"
          />
          <button
            type="submit"
            className="rounded-lg bg-[#241A14] px-3 text-xs font-black text-white"
          >
            חיפוש
          </button>
        </form>
        <button
          type="button"
          onClick={() => void exportExcel()}
          disabled={exporting}
          className="rounded-lg bg-[#B97821] px-3 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          {exporting ? "מייצא..." : "ייצוא לאקסל"}
        </button>
      </div>

      {filters.invitationId && rounds.length ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {rounds.map((round) => (
            <div
              key={round.round}
              className="rounded-2xl border border-[var(--admin-border)] bg-white p-3 text-xs font-bold leading-6 text-[#3A2A1C]"
            >
              <div className="text-sm font-black">סבב {round.round}</div>
              <div>זכאים בביצוע: {countText(round.eligibleCount)}</div>
              <div>בתור: {round.queued}</div>
              <div>נשלחו ל-Telnyx: {round.sent}</div>
              <div>נענו: {round.answered}</div>
              <div>לא נענו: {round.noAnswer}</div>
              <div>תשובות: {round.responses}</div>
              <div>נכשלו: {round.failed}</div>
              <div>התחלה: {round.startedAtLabel || "לא זמין"}</div>
              <div>סיום: {round.endedAtLabel || "לא זמין"}</div>
              <div>משך ביצוע: {round.durationLabel}</div>
              <div>
                סיבות:{" "}
                {round.failureReason ||
                  round.reasons.slice(0, 3).join(" · ") ||
                  "אין"}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="admin-table-region w-full min-w-0">
        <div className="admin-table-scroll">
          <table className="admin-table" style={{ minWidth: 2200 }}>
            <thead>
              <tr>
                {[
                  "תאריך ושעה",
                  "אירוע",
                  "לקוח",
                  "אורח",
                  "טלפון",
                  "כיוון",
                  "סבב",
                  "הקלטה",
                  "סטטוס שיחה",
                  "אישור הגעה",
                  "מוזמנים",
                  "מגיעים",
                  "משך שיחה",
                  "צלצול",
                  "מענה עד השמעה",
                  "תגובה להקשה",
                  "ניסיונות",
                  "סיבת כישלון",
                  "Telnyx",
                  "",
                ].map((heading) => (
                  <th key={heading || "actions"}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={20}>טוען דוח שיחות...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={20}>אין שיחות תואמות למסננים.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.atLabel || "לא זמין"}</td>
                    <td>{row.eventName}</td>
                    <td>{row.clientName}</td>
                    <td>{row.guestName}</td>
                    <td dir="ltr">{row.phone}</td>
                    <td>{row.directionLabel}</td>
                    <td>{row.round ?? "—"}</td>
                    <td>{row.audioModeLabel}</td>
                    <td>{row.callStatusLabel}</td>
                    <td>{row.rsvpLabel}</td>
                    <td>{countText(row.invitedCount)}</td>
                    <td>{countText(row.attendingCount)}</td>
                    <td>{row.callDurationLabel}</td>
                    <td>{row.ringLabel}</td>
                    <td>{row.answerToPlaybackLabel}</td>
                    <td>{row.digitToFollowupLabel}</td>
                    <td>{row.attempts}</td>
                    <td>{row.error || "—"}</td>
                    <td dir="ltr" className="cell-clip">
                      {row.telnyxCallControlId || "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void openDetail(row.id)}
                        className="rounded-lg border border-[var(--admin-border)] px-2 py-1 text-[11px] font-black"
                      >
                        פרטי שיחה
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-table-footer flex items-center justify-between gap-3">
          <span>
            {total} שיחות · עמוד {page} מתוך {pages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border px-3 py-1 text-xs font-black disabled:opacity-40"
            >
              הקודם
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border px-3 py-1 text-xs font-black disabled:opacity-40"
            >
              הבא
            </button>
          </div>
        </div>
      </div>

      {detail || detailError ? (
        <div className="fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-r border-[var(--admin-border)] bg-[#FFFDF8] p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black text-[#241A14]">פרטי שיחה</h2>
            <button
              type="button"
              onClick={() => {
                setDetail(null);
                setDetailError("");
              }}
              className="rounded-full border px-3 py-1 text-sm font-black"
            >
              סגירה
            </button>
          </div>
          {detailError ? (
            <div className="text-sm font-bold text-rose-700">{detailError}</div>
          ) : detail ? (
            <div className="space-y-3 text-sm font-bold text-[#3A2A1C]">
              <div>{detail.guestName} · {detail.phone}</div>
              <div>{detail.eventName} · {detail.clientName}</div>
              <div>
                {detail.directionLabel}
                {detail.round ? ` · סבב ${detail.round}` : ""} · {detail.audioModeLabel}
              </div>
              <div>סטטוס שיחה: {detail.callStatusLabel}</div>
              <div>אישור הגעה: {detail.rsvpLabel}</div>
              <div>מוזמנים: {countText(detail.invitedCount)} · מגיעים: {countText(detail.attendingCount)}</div>
              <div>חיוג עד צלצול: {detail.dialToRingLabel}</div>
              <div>משך צלצול: {detail.ringLabel}</div>
              <div>מענה עד השמעה: {detail.answerToPlaybackLabel}</div>
              <div>הקשה עד המשך: {detail.digitToFollowupLabel}</div>
              <div>הקשה עד שמירה: {detail.digitToRsvpLabel}</div>
              <div>משך שיחה: {detail.callDurationLabel}</div>
              <div>הקשות: {detail.digits || "אין"}</div>
              <div>סיבה: {detail.error || detail.hangupCause || "אין"}</div>
              <div>מקור ניתוק: {detail.hangupSource || "לא זמין"}</div>
              <div dir="ltr" className="text-xs">
                {detail.telnyxCallControlId || "אין מזהה Telnyx"}
              </div>
              <div className="border-t border-[#E7D8C6] pt-3">
                <div className="mb-2 font-black">ציר זמן</div>
                {detail.timelineAvailable ? (
                  <ol className="space-y-2">
                    {detail.timeline.map((entry, index) => (
                      <li key={`${entry.atLabel}-${index}`}>
                        <span dir="ltr">{entry.atLabel}</span>
                        {" — "}
                        {entry.label}
                        {entry.detail ? ` (${entry.detail})` : ""}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs leading-6 text-[var(--admin-muted)]">
                    ציר הזמן אינו זמין לשיחה זו. תיעוד האירועים מתחיל מרגע הפריסה
                    הזו, ורק אירועים שהתקבלו או נשמרו בפועל מוצגים.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>טוען פרטים...</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
