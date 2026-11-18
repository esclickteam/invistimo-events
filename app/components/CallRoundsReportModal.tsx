"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { formatDurationMs, hangupInitiatorLabel } from "@/lib/calls/callAttemptPolicy";

type Attempt = {
  id: string;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  preciseDuration: boolean;
  telnyxAnswered: boolean;
  answerType: string;
  telnyxResult: string;
  agentResult: string;
  sipCode: string;
  hangupCause: string;
  hangupSource: string;
  agentHangupRequestedAt: string | null;
  outcome: string;
  note: string;
  mismatch: string;
};

type GuestRow = {
  id: string;
  name: string;
  phone: string;
  rsvp: string;
  round: number;
  taskStatus: string;
  employeeName: string;
  attemptCount: number;
  lastAttemptAt: string;
  lastTelnyxResult: string;
  finalResult: string;
  enforced: string;
  exception: string;
  notDialedReason: string;
  noTask: boolean;
  noVerifiedCall: boolean;
  mismatch: string;
  addedAt: string;
  roundOpenedAt: string;
  eligible: string;
  whyNoTask: string;
  savedAt: string;
  rsvpChanged: string;
  attempts: Attempt[];
};

type ReportPayload = {
  success: boolean;
  error?: string;
  metrics?: Record<string, number>;
  rows?: GuestRow[];
  agents?: string[];
  updatedAt?: string;
};

const METRIC_LABELS: Array<[string, string]> = [
  ["eligibleGuests", "זכאים"],
  ["tasksCreated", "משימות"],
  ["dialedGuests", "חויגו"],
  ["neverDialed", "לא חויגו"],
  ["attempts", "ניסיונות"],
  ["providerAnswered", "נענו אצל הספק"],
  ["providerUnanswered", "לא נענו"],
  ["busy", "תפוס"],
  ["under20", "לפני 20 שניות"],
  ["atLeast20", "20 שניות ומעלה"],
  ["openTasks", "משימות פתוחות"],
  ["exceptions", "חריגות"],
  ["properlyCompleted", "הושלמו לפי האכיפה"],
];

function formatWhen(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

export default function CallRoundsReportModal({
  invitationId,
  clientName,
  onClose,
  seed = null,
}: {
  invitationId: string;
  clientName?: string;
  onClose: () => void;
  seed?: ReportPayload | null;
}) {
  const [round, setRound] = useState(0);
  const [query, setQuery] = useState("");
  const [agent, setAgent] = useState("");
  const [view, setView] = useState("all");
  const [sort, setSort] = useState("name");
  const [data, setData] = useState<ReportPayload | null>(seed);
  const [openId, setOpenId] = useState("");
  const [loading, setLoading] = useState(!seed);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ round: String(round), view, q: query });
    if (agent) params.set("agent", agent);
    const response = await fetch(
      `/api/admin/call-rounds/${encodeURIComponent(invitationId)}/report?${params}`,
      { credentials: "include", cache: "no-store" }
    );
    const payload = (await response.json().catch(() => ({}))) as ReportPayload;
    if (!response.ok || payload.success === false) {
      setError(payload.error || "לא הצלחנו לטעון את דוח השיחות");
      setLoading(false);
      return;
    }
    setData(payload);
    setLoading(false);
  }

  useEffect(() => {
    if (seed) {
      setData(seed);
      setLoading(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitationId, round, query, agent, view, seed]);

  const rows = data?.rows || [];
  const noCall = useMemo(() => rows.filter((row) => row.noVerifiedCall), [rows]);
  const noTask = useMemo(() => rows.filter((row) => row.noTask), [rows]);
  const shown = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sort === "attempts") return b.attemptCount - a.attemptCount;
      if (sort === "duration") {
        const longest = (row: GuestRow) => Math.max(0, ...row.attempts.map((attempt) => attempt.durationMs || 0));
        return longest(b) - longest(a);
      }
      if (sort === "date") return (b.lastAttemptAt || "").localeCompare(a.lastAttemptAt || "");
      return a.name.localeCompare(b.name, "he");
    });
    return copy;
  }, [rows, sort]);
  const agentPerformance = useMemo(() => {
    const grouped = new Map<string, GuestRow[]>();
    for (const row of rows) {
      if (!row.employeeName || row.employeeName === "—") continue;
      grouped.set(row.employeeName, [...(grouped.get(row.employeeName) || []), row]);
    }
    return Array.from(grouped.entries()).map(([name, guests]) => {
      const attempts = guests.flatMap((guest) => guest.attempts);
      return {
        name,
        assigned: guests.length,
        dialed: guests.filter((guest) => guest.attemptCount > 0).length,
        attempts: attempts.length,
        answered: attempts.filter((attempt) => attempt.telnyxAnswered).length,
        early: attempts.filter((attempt) => attempt.outcome === "early_hangup").length,
        done: guests.filter((guest) => guest.enforced === "כן").length,
        open: guests.filter((guest) => ["פתוחה", "בטיפול"].includes(guest.taskStatus)).length,
      };
    });
  }, [rows]);

  async function exportExcel() {
    const params = new URLSearchParams({ round: String(round), view, q: query });
    if (agent) params.set("agent", agent);
    const response = await fetch(
      `/api/admin/call-rounds/${encodeURIComponent(invitationId)}/export?${params.toString()}`,
      { credentials: "include" }
    );
    if (!response.ok) {
      setError("הייצוא נכשל");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = round ? `call-round-${round}.xlsx` : "call-rounds-all.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[10050] flex items-start justify-center overflow-y-auto bg-black/45 px-2 py-3 sm:px-4 sm:py-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-24px)] w-full max-w-[1400px] flex-col overflow-hidden rounded-[28px] border border-[#E7D8C6] bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-[#EFE2D1] bg-[#FFFDF8] px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={onClose} className="h-11 rounded-full bg-white px-4 font-black text-[#6B5138]">
              סגירה
            </button>
            <div className="text-right">
              <h2 className="text-2xl font-black text-[#3A2A1C]">דוח שיחות מפורט</h2>
              <p className="text-sm font-bold text-[#8A7867]">{clientName || "אירוע"} · אורחים וניסיונות נספרים בנפרד</p>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto">
            {[
              [0, "דוח שיחות כולל"],
              [1, "סבב שיחות 1"],
              [2, "סבב שיחות 2"],
              [3, "סבב שיחות 3"],
            ].map(([value, label]) => (
              <button
                key={String(value)}
                type="button"
                onClick={() => setRound(Number(value))}
                className={`min-w-[160px] rounded-[18px] border px-4 py-3 text-right font-black ${
                  round === value ? "border-[#D7A34D] bg-white" : "border-[#EFE2D1] bg-[#FFFDF8]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="rounded-2xl bg-[#F8EFE3] px-3 py-2 text-sm font-bold text-[#6B451E]">
            20 שניות הן מינימום לניסיון שלא נענה. אין ניתוק אוטומטי, והמונה נעצר רק כשהשיחה מסתיימת.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="שם או טלפון"
              className="h-11 rounded-2xl border border-[#E7D8C6] px-3"
            />
            <select value={agent} onChange={(event) => setAgent(event.target.value)} className="h-11 rounded-2xl border border-[#E7D8C6] px-3">
              <option value="">כל הנציגות</option>
              {(data?.agents || []).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <select value={view} onChange={(event) => setView(event.target.value)} className="h-11 rounded-2xl border border-[#E7D8C6] px-3">
              <option value="all">כל האורחים</option>
              <option value="exception">חריגות</option>
              <option value="nocall">משימות ללא שיחה מאומתת</option>
              <option value="notask">מוזמנים ללא משימה</option>
              <option value="mismatch">פער ספק מול נציגה</option>
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 rounded-2xl border border-[#E7D8C6] px-3">
              <option value="name">מיון לפי שם</option>
              <option value="date">מיון לפי תאריך</option>
              <option value="duration">מיון לפי משך</option>
              <option value="attempts">מיון לפי מספר ניסיונות</option>
            </select>
            <button type="button" onClick={() => void load()} className="h-11 rounded-2xl border border-[#E7D8C6] px-4 font-black">
              רענון
            </button>
            <button type="button" onClick={() => void exportExcel()} className="h-11 rounded-2xl bg-[#1F7A4D] px-4 font-black text-white">
              ייצוא לאקסל
            </button>
          </div>
          {error ? <p className="rounded-2xl bg-red-50 px-3 py-2 font-bold text-red-700">{error}</p> : null}
          {loading ? <p className="font-bold text-[#8A7867]">טוען דוח...</p> : null}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            {METRIC_LABELS.map(([key, label]) => (
              <div key={key} className="rounded-2xl border border-[#EFE2D1] bg-[#FFFDF8] p-3">
                <div className="text-xs font-black text-[#7B6754]">{label}</div>
                <div className="text-xl font-black">{data?.metrics?.[key] ?? 0}</div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-right text-sm">
              <thead>
                <tr className="border-b border-[#EFE2D1] text-xs font-black text-[#7B6754]">
                  {["שם", "טלפון", "RSVP", "סבב", "משימה", "נציגה", "ניסיונות", "אחרון", "ספק", "תוצאה", "אכיפה", "חריגה", "אי ביצוע"].map((heading) => (
                    <th key={heading} className="px-2 py-2">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <Fragment key={row.id}>
                    <tr
                      className="cursor-pointer border-b border-[#F3EADF]"
                      onClick={() => setOpenId(openId === row.id ? "" : row.id)}
                    >
                      <td className="px-2 py-2 font-black">{row.name}</td>
                      <td className="px-2 py-2">{row.phone}</td>
                      <td className="px-2 py-2">{row.rsvp}</td>
                      <td className="px-2 py-2">{row.round}</td>
                      <td className="px-2 py-2">{row.taskStatus}</td>
                      <td className="px-2 py-2">{row.employeeName}</td>
                      <td className="px-2 py-2">{row.attemptCount}</td>
                      <td className="px-2 py-2">{formatWhen(row.lastAttemptAt)}</td>
                      <td className="px-2 py-2">{row.lastTelnyxResult}</td>
                      <td className="px-2 py-2">{row.finalResult}</td>
                      <td className="px-2 py-2">{row.enforced}</td>
                      <td className="px-2 py-2">{row.exception}</td>
                      <td className="px-2 py-2">{row.notDialedReason}</td>
                    </tr>
                    {openId === row.id ? (
                      <tr key={`${row.id}-detail`}>
                        <td colSpan={13} className="bg-[#FFFDF8] px-3 py-3">
                          {row.mismatch ? <p className="mb-2 rounded-xl bg-red-50 p-2 font-bold text-red-700">{row.mismatch}</p> : null}
                          {row.attempts.length === 0 ? <p>אין ניסיון חיוג שמור.</p> : null}
                          {row.attempts.map((attempt, index) => (
                            <div key={attempt.id || index} className="mb-2 grid gap-2 rounded-xl border border-[#EFE2D1] p-2 md:grid-cols-4">
                              <span>ניסיון {index + 1}</span>
                              <span>התחלה {formatWhen(attempt.startedAt)}</span>
                              <span>מענה {formatWhen(attempt.answeredAt)}</span>
                              <span>ניתוק {formatWhen(attempt.endedAt)}</span>
                              <span>משך {formatDurationMs(attempt.durationMs, attempt.preciseDuration)}</span>
                              <span>Telnyx {attempt.endedAt ? attempt.telnyxResult : "ממתין לאימות ספק"}</span>
                              <span>נציגה {attempt.agentResult}</span>
                              <span>SIP {attempt.sipCode || "—"}</span>
                              <span>סיבה {attempt.hangupCause || "—"}</span>
                              <span>מי ניתק {hangupInitiatorLabel(attempt as any)}</span>
                              <span>מזהה {attempt.id}</span>
                              <span>{attempt.answerType === "human" ? "אדם" : attempt.telnyxAnswered ? "לא זוהה אם אדם" : "—"}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <section className="rounded-2xl border border-[#E7D8C6] p-3">
            <h3 className="font-black">ביצועי נציגות</h3>
            {agentPerformance.length === 0 ? <p className="text-sm text-[#8A7867]">אין נציגות במסנן.</p> : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[720px] text-right text-sm">
                  <thead>
                    <tr className="text-xs font-black text-[#7B6754]">
                      {["נציגה", "הוקצו", "חייגה", "ניסיונות", "נענו", "לפני 20 שניות", "הושלמו", "פתוחות"].map((heading) => (
                        <th key={heading} className="px-2 py-1">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agentPerformance.map((row) => (
                      <tr key={row.name} className="border-t border-[#F3EADF]">
                        <td className="px-2 py-1 font-black">{row.name}</td>
                        <td className="px-2 py-1">{row.assigned}</td>
                        <td className="px-2 py-1">{row.dialed}</td>
                        <td className="px-2 py-1">{row.attempts}</td>
                        <td className="px-2 py-1">{row.answered}</td>
                        <td className="px-2 py-1">{row.early}</td>
                        <td className="px-2 py-1">{row.done}</td>
                        <td className="px-2 py-1">{row.open}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="rounded-2xl border border-[#E7D8C6] p-3">
            <h3 className="font-black">משימות ללא שיחה מאומתת</h3>
            {noCall.length === 0 ? <p className="text-sm text-[#8A7867]">אין במסנן.</p> : noCall.map((row) => (
              <p key={row.id} className="text-sm">{row.name} · {row.phone} · סבב {row.round} · {row.employeeName} · {row.finalResult} · נשמר {formatWhen(row.savedAt)} · חיוג מאומת: לא · שינוי RSVP: {row.rsvpChanged}</p>
            ))}
          </section>
          <section className="rounded-2xl border border-[#E7D8C6] p-3">
            <h3 className="font-black">מוזמנים שלא נפתחו להם משימות</h3>
            {noTask.length === 0 ? <p className="text-sm text-[#8A7867]">אין במסנן.</p> : noTask.map((row) => (
              <p key={row.id} className="text-sm">{row.name} · {row.phone} · נוסף {formatWhen(row.addedAt)} · הסבב נפתח {formatWhen(row.roundOpenedAt)} · {row.whyNoTask || "לא ניתן לאימות"}</p>
            ))}
          </section>
          <p className="text-xs font-bold text-[#A08B74]">עודכן: {formatWhen(data?.updatedAt)}</p>
        </main>
      </div>
    </div>
  );
}
