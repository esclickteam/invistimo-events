"use client";

import { useCallback, useEffect, useState } from "react";

type Row = {
  userId: string;
  customerName: string;
  eventId: string;
  eventTitle: string;
  eventDate: string | null;
  plannedDeletionAt: string | null;
  reminderRoundComplete: boolean;
  thankYouClear: boolean;
  openWorkCount: number;
  bucket: string;
  eligible: boolean;
  reasons: string[];
  accountDeletable: boolean;
};

type Groups = {
  future: Row[];
  active: Row[];
  waiting: Row[];
  eligible: Row[];
  blocked: Row[];
};

type RunRow = {
  id: string;
  mode: string;
  startedAt: string;
  finishedAt: string | null;
  emergencyStop: boolean;
  anomaly: boolean;
  eligibleAccounts: number;
  executed: number;
  entryCount: number;
};

const REASONS: Record<string, string> = {
  NOT_CUSTOMER: "אינו לקוח",
  MISSING_EVENT_DATE: "חסר תאריך אירוע",
  INVALID_EVENT_DATE: "תאריך אירוע לא תקין",
  FUTURE_EVENT: "אירוע עתידי",
  EVENT_TODAY: "האירוע מתקיים היום",
  RETENTION_NOT_ELAPSED: "טרם חלפו 7 ימים מלאים מסיום יום האירוע",
  THANK_YOU_SCHEDULED: "הודעת תודה מתוזמנת",
  THANK_YOU_SENDING: "הודעת תודה בשליחה",
  THANK_YOU_RETRY: "הודעת תודה ממתינה לניסיון חוזר",
  THANK_YOU_FINAL_FAILURE: "כישלון סופי בשליחת תודה — נדרשת החלטה",
  OPEN_SCHEDULED_WORK: "שליחה מתוזמנת פתוחה",
  OPEN_WORKER: "משימה או שיחה בביצוע",
  OPEN_RETRY: "שליחה ממתינה לניסיון חוזר",
  FINAL_FAILURE_NEEDS_DECISION: "כישלון סופי — נדרשת החלטה",
  OPEN_TASK: "משימה פתוחה",
  AUTO_DELETE_EXEMPT: "סומן לא למחוק אוטומטית",
  DISPUTE_OR_TREATMENT: "מחלוקת או טיפול פתוח",
  ADMIN_HOLD: "החרגת אדמין",
  DATE_MISMATCH: "אי־התאמה בתאריך האירוע",
  VENUE_LINKED: "אירוע מקושר לאולם",
  ACCOUNT_ATTRIBUTION_UNCERTAIN: "שיוך האירוע לחשבון אינו ודאי",
  RETROACTIVE_HOLD: "לקוח קיים — נדרש אישור נפרד לפני מחיקה",
  OTHER_FUTURE_EVENT: "לחשבון יש אירוע עתידי",
  NOT_ALL_EVENTS_ELIGIBLE: "לא כל האירועים בחשבון זכאים",
};

const SECTIONS: Array<{ key: keyof Groups; title: string; hint: string }> = [
  { key: "future", title: "אירועים עתידיים", hint: "אירוע עתידי אינו זכאי למחיקה, גם אם סבב התזכורת הסתיים." },
  { key: "active", title: "אירועים פעילים", hint: "היום, או שטרם חלפו 7 ימים מלאים מסיום יום האירוע." },
  { key: "waiting", title: "ממתינים לסיום פעולות", hint: "התאריך עבר, אבל הודעת תודה או משימה אחרת עדיין פתוחה." },
  { key: "eligible", title: "זכאים למחיקה בבדיקה", hint: "עומדים בתנאי התאריך והבטיחות. לא נמחקים כל עוד המערכת במצב DRY RUN." },
  { key: "blocked", title: "חסומים", hint: "החרגה, מחלוקת, תאריך חסר או שיוך לא ודאי." },
];

function formatWhen(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function reasonText(reasons: string[]) {
  if (!reasons.length) return "עומד בתנאים";
  return reasons.map((reason) => REASONS[reason] || reason).join(" · ");
}

const EMPTY: Groups = { future: [], active: [], waiting: [], eligible: [], blocked: [] };

export default function EventDeletionsPage() {
  const [groups, setGroups] = useState<Groups>(EMPTY);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [anomaly, setAnomaly] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/event-deletions", { credentials: "include", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      setMessage(data.error || "לא ניתן לטעון את רשימת המחיקות");
      setLoading(false);
      return;
    }
    setGroups(data.groups || EMPTY);
    setRuns(data.runs || []);
    setEmergencyStop(data.emergencyStop === true);
    setAnomaly(data.anomaly === true);
    setMessage("");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    const response = await fetch("/api/admin/event-deletions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok || !data.success) {
      setMessage(data.error || "הפעולה נדחתה");
      return;
    }
    if (action === "dry_run" && data.groups) setGroups(data.groups);
    setMessage(action === "dry_run" ? "בדיקה הושלמה. לא נמחק שום לקוח או אירוע." : "העדכון נשמר.");
    await load();
  }

  return (
    <div dir="rtl" className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">מחיקות אוטומטיות</h1>
        <p className="text-sm text-[#6b7280]">
          מצב המערכת: DRY RUN. מחיקה אמיתית כבויה עד לאישור מפורש. המועד מחושב מתאריך האירוע הנוכחי, 7 ימים מלאים אחרי סיום יום האירוע לפי שעון ישראל.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => post("dry_run")}
            className="rounded-lg bg-[#5b4bcc] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            הרצת בדיקה ללא מחיקה
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => post("emergency_stop", { stopped: !emergencyStop })}
            className="rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm font-bold"
          >
            {emergencyStop ? "ביטול מתג החירום" : "מתג חירום — עצירת מחיקות"}
          </button>
        </div>
        {emergencyStop ? (
          <p className="rounded-lg bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">מתג החירום פעיל. גם מחיקה עתידית תיעצר.</p>
        ) : null}
        {anomaly ? (
          <p className="rounded-lg bg-[#fef2f2] px-3 py-2 text-sm text-[#991b1b]">
            מספר המועמדים חריג. הריצה נעצרת וממתינה לאישור אדמין.
          </p>
        ) : null}
        {message ? <p className="text-sm font-semibold">{message}</p> : null}
      </header>

      {loading ? <p>טוען...</p> : null}

      {SECTIONS.map((section) => (
        <section key={section.key} className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
          <div className="border-b border-[#e5e7eb] px-4 py-3">
            <h2 className="font-bold">{section.title}</h2>
            <p className="text-xs text-[#6b7280]">{section.hint}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-[#f9fafb] text-xs text-[#6b7280]">
                <tr>
                  <th className="px-3 py-2">לקוח</th>
                  <th className="px-3 py-2">אירוע</th>
                  <th className="px-3 py-2">תאריך אירוע</th>
                  <th className="px-3 py-2">מחיקה מתוכננת</th>
                  <th className="px-3 py-2">תזכורת הסתיימה</th>
                  <th className="px-3 py-2">תודה הסתיימה</th>
                  <th className="px-3 py-2">משימות פתוחות</th>
                  <th className="px-3 py-2">סטטוס</th>
                  <th className="px-3 py-2">סיבת עיכוב</th>
                  <th className="px-3 py-2">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {groups[section.key].length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-4 text-[#6b7280]">אין רשומות בקבוצה הזו.</td>
                  </tr>
                ) : (
                  groups[section.key].map((row) => (
                    <tr key={`${row.eventId}-${section.key}`} className="border-t border-[#f3f4f6]">
                      <td className="px-3 py-2">{row.customerName || "—"}</td>
                      <td className="px-3 py-2">{row.eventTitle}</td>
                      <td className="px-3 py-2">{row.eventDate || "—"}</td>
                      <td className="px-3 py-2">{formatWhen(row.plannedDeletionAt)}</td>
                      <td className="px-3 py-2">{row.reminderRoundComplete ? "כן" : "לא"}</td>
                      <td className="px-3 py-2">{row.thankYouClear ? "כן" : "לא"}</td>
                      <td className="px-3 py-2">{row.openWorkCount}</td>
                      <td className="px-3 py-2">{row.eligible ? "זכאי לבדיקה" : "לא זכאי"}</td>
                      <td className="px-3 py-2">{reasonText(row.reasons)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          {row.reasons.includes("AUTO_DELETE_EXEMPT") ? (
                            <button type="button" className="text-xs font-bold text-[#5b4bcc]" disabled={busy} onClick={() => post("exempt", { userId: row.userId, eventId: row.eventId, value: false })}>
                              ביטול החרגה
                            </button>
                          ) : (
                            <button type="button" className="text-xs font-bold text-[#5b4bcc]" disabled={busy} onClick={() => post("exempt", { userId: row.userId, eventId: row.eventId, value: true })}>
                              לא למחוק אוטומטית
                            </button>
                          )}
                          <button type="button" className="text-xs font-bold text-[#5b4bcc]" disabled={busy} onClick={() => post("dispute", { userId: row.userId, eventId: row.eventId, value: !row.reasons.includes("DISPUTE_OR_TREATMENT") })}>
                            {row.reasons.includes("DISPUTE_OR_TREATMENT") ? "סגירת מחלוקת" : "סימון מחלוקת"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="rounded-xl border border-[#e5e7eb] bg-white p-4">
        <h2 className="mb-2 font-bold">היסטוריית בדיקות</h2>
        {runs.length === 0 ? <p className="text-sm text-[#6b7280]">עדיין אין ריצות.</p> : null}
        <ul className="space-y-2 text-sm">
          {runs.map((run) => (
            <li key={run.id} className="border-t border-[#f3f4f6] pt-2">
              {formatWhen(run.startedAt)} · {run.mode} · זכאים {run.eligibleAccounts} · נמחקו {run.executed} · רשומות {run.entryCount}
              {run.emergencyStop ? " · חירום" : ""}
              {run.anomaly ? " · חריג" : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
