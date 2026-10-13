"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type PaymentMethod = "cash" | "bank_transfer" | "bit" | "paybox" | "check" | "other";

type BillingRow = {
  clientId: string;
  clientName: string;
  clientEmail: string;
  eventName: string;
  eventDate?: string | null;
  initialRecords: number;
  actualRecords: number;
  finalRecords: number | null;
  finalRecordsUpdatedAt?: string | null;
  pricePerRecord: number;
  amountDue: number | null;
  amountPaid: number;
  balance: number | null;
  status: string;
  statusLabel: string;
  followUp?: {
    snoozeUntil?: string | null;
    handled?: boolean;
    note?: string;
  };
};

type BillingPayload = {
  producer: { _id: string; name: string; email: string; pricePerRecord: number };
  summary: {
    eventCount: number;
    totalDue: number;
    totalPaid: number;
    balance: number;
    unpaidCount: number;
  };
  rows: BillingRow[];
};

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "מזומן" },
  { value: "bank_transfer", label: "העברה בנקאית" },
  { value: "bit", label: "ביט" },
  { value: "paybox", label: "פייבוקס" },
  { value: "check", label: "צ'ק" },
  { value: "other", label: "אחר" },
];

const ERRORS: Record<string, string> = {
  FORBIDDEN: "אין הרשאה",
  NOT_FOUND: "לא נמצא",
  INVALID_AMOUNT: "סכום לא תקין",
  INVALID_METHOD: "יש לבחור אמצעי תשלום",
  INVALID_DATE: "תאריך לא תקין",
  INVALID_PRICE: "מחיר לא תקין",
  INVALID_FINAL_RECORDS: "כמות רשומות לא תקינה",
  NO_OPEN_BALANCE: "אין יתרה פתוחה לתזכורת",
  INVALID_REMINDER: "תאריך התזכורת לא תקין",
  PAST_DATE: "אי אפשר לבחור תאריך שעבר",
  ALREADY_BILLED_BY_ANOTHER_PRODUCER: "הלקוח כבר משויך לגבייה של מפיק אחר",
  ALREADY_TRACKED: "הלקוח כבר נמצא במעקב של המפיק הזה",
  NOT_A_CLIENT: "אפשר לשייך רק לקוח",
  VENUE_CLIENT: "לקוח אולם לא נכנס למעקב הזה",
  MISSING_EMAIL: "חסר אימייל",
};

function money(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `₪${Number(value).toLocaleString("he-IL")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" });
}

export default function ProducerBillingPage() {
  const params = useParams<{ producerId: string }>();
  const producerId = String(params?.producerId || "");
  const [payload, setPayload] = useState<BillingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentFor, setPaymentFor] = useState<BillingRow | null>(null);
  const [assignEmail, setAssignEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [focusClient, setFocusClient] = useState("");

  async function load(background = false) {
    if (!background) {
      setLoading(true);
      setError("");
    }
    try {
      const res = await fetch(`/api/admin/producers/${producerId}/billing`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        if (!background) {
          setError(ERRORS[data?.error] || "טעינת המעקב נכשלה");
          setPayload(null);
        }
        return;
      }
      setPayload(data);
      if (background) setError("");
    } catch {
      if (!background) setError("טעינת המעקב נכשלה");
    } finally {
      if (!background) setLoading(false);
    }
  }

  useEffect(() => {
    if (!producerId) return;
    const params = new URLSearchParams(window.location.search);
    setFocusClient(params.get("client") || "");
    void load(false);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void load(true);
    }, 15000);
    const onFocus = () => {
      void load(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [producerId]);

  useEffect(() => {
    if (!focusClient || !payload) return;
    document.getElementById(`collection-client-${focusClient}`)?.scrollIntoView({
      block: "center",
    });
  }, [focusClient, payload]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/producers/${producerId}/billing`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(ERRORS[data?.error] || "הפעולה נכשלה");
        return false;
      }
      setPayload(data);
      return true;
    } catch {
      setError("הפעולה נכשלה");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir="rtl" className="mx-auto w-full max-w-[1400px] px-4 py-6 text-right">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/users" className="text-sm font-bold text-[var(--admin-brand)]">
            חזרה למשתמשים
          </Link>
          <h1 className="mt-2 text-3xl font-black text-[var(--admin-text)]">מעקב תשלומים</h1>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            {payload?.producer?.name || "מפיק"} · {payload?.producer?.email || ""}
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">טוען…</p>
      ) : payload ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Summary label="מספר האירועים" value={String(payload.summary.eventCount)} />
            <Summary label="סך החיובים" value={money(payload.summary.totalDue)} />
            <Summary label="סך התשלומים שהתקבלו" value={money(payload.summary.totalPaid)} />
            <Summary label="יתרה כוללת לגבייה" value={money(payload.summary.balance)} />
            <Summary label="אירועים שטרם שולמו" value={String(payload.summary.unpaidCount)} />
          </div>

          <div className="admin-table-region overflow-x-auto rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white">
            <table className="admin-table min-w-[1100px]">
              <thead>
                <tr>
                  <th>לקוח</th>
                  <th>אירוע</th>
                  <th>תאריך</th>
                  <th>ראשונית</th>
                  <th>בפועל</th>
                  <th>סופית לחיוב</th>
                  <th>מחיר לרשומה</th>
                  <th>סכום לתשלום</th>
                  <th>שולם</th>
                  <th>יתרה</th>
                  <th>סטטוס</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {payload.rows.map((row) => (
                  <tr
                    key={row.clientId}
                    id={`collection-client-${row.clientId}`}
                    className={focusClient === row.clientId ? "bg-[#FFF6E8]" : ""}
                  >
                    <td>
                      <div className="font-bold">{row.clientName}</div>
                      <div className="text-xs text-[var(--admin-muted)]">{row.clientEmail}</div>
                    </td>
                    <td>{row.eventName}</td>
                    <td>{formatDate(row.eventDate)}</td>
                    <td>{row.initialRecords}</td>
                    <td>{row.actualRecords}</td>
                    <td>{row.finalRecords ?? "—"}</td>
                    <td>{money(row.pricePerRecord)}</td>
                    <td>{money(row.amountDue)}</td>
                    <td>{money(row.amountPaid)}</td>
                    <td>{money(row.balance)}</td>
                    <td className="font-bold">{row.statusLabel}</td>
                    <td>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-[var(--admin-brand)] px-3 py-2 text-xs font-bold text-white"
                          onClick={() => setPaymentFor(row)}
                        >
                          רישום תשלום
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-xs font-bold"
                          onClick={() => {
                            const next = window.prompt("מחיר לרשומה", String(row.pricePerRecord));
                            if (next == null) return;
                            void post({
                              action: "price",
                              clientId: row.clientId,
                              pricePerRecord: Number(next),
                            });
                          }}
                        >
                          עדכון מחיר
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-xs font-bold"
                          onClick={() => {
                            const next = window.prompt(
                              "כמות סופית לחיוב",
                              row.finalRecords == null ? "" : String(row.finalRecords),
                            );
                            if (next == null) return;
                            void post({
                              action: "final-records",
                              clientId: row.clientId,
                              finalRecords: Number(next),
                            });
                          }}
                        >
                          תיקון כמות
                        </button>
                        {row.balance != null && row.balance > 0 && (
                          <FollowUpControls
                            row={row}
                            busy={busy}
                            onSubmit={(body) => post(body)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {payload.rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-[var(--admin-muted)]">
                      אין אירועים במעקב של המפיק הזה
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form
            className="mt-6 flex flex-col gap-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-4 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              void post({ action: "assign", email: assignEmail }).then((ok) => {
                if (ok) setAssignEmail("");
              });
            }}
          >
            <label className="flex-1 text-sm font-bold">
              שיוך לקוח רגיל לגבייה של המפיק
              <input
                type="email"
                value={assignEmail}
                onChange={(event) => setAssignEmail(event.target.value)}
                placeholder="email@example.com"
                className="mt-2 h-11 w-full rounded-xl border border-[var(--admin-border)] px-3"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !assignEmail.trim()}
              className="h-11 rounded-xl bg-black px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              הוספה למעקב
            </button>
          </form>
          <p className="mt-2 text-xs text-[var(--admin-muted)]">
            לקוח רגיל שמשויך למפיק רק לניהול לא נכנס למעקב. השיוך כאן לא משנה חבילה או הרשאות, ולא מאפשר חיוב כפול.
          </p>
        </>
      ) : null}

      {paymentFor && (
        <PaymentDialog
          row={paymentFor}
          busy={busy}
          onClose={() => setPaymentFor(null)}
          onSubmit={async (values) => {
            const ok = await post({
              action: "payment",
              clientId: paymentFor.clientId,
              ...values,
            });
            if (ok) setPaymentFor(null);
          }}
        />
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-white px-4 py-3">
      <div className="text-xs font-bold text-[var(--admin-muted)]">{label}</div>
      <div className="mt-1 text-xl font-black text-[var(--admin-text)]">{value}</div>
    </div>
  );
}

function FollowUpControls({
  row,
  busy,
  onSubmit,
}: {
  row: BillingRow;
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => Promise<boolean | undefined>;
}) {
  const [note, setNote] = useState(row.followUp?.note || "");
  const [remindOn, setRemindOn] = useState("");

  useEffect(() => {
    setNote(row.followUp?.note || "");
  }, [row.followUp?.note, row.clientId]);

  function send(mode: string) {
    void onSubmit({
      action: "follow-up",
      clientId: row.clientId,
      mode,
      note,
      remindOn,
    });
  }

  return (
    <div className="mt-2 space-y-2 border-t border-[var(--admin-border)] pt-2">
      <label className="block text-[11px] font-bold text-[var(--admin-muted)]">
        הערה פנימית
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="דיברתי עם המפיקה, התחייבה להעביר תשלום ביום חמישי."
          rows={2}
          className="mt-1 w-full rounded-lg border border-[var(--admin-border)] px-2 py-1 text-xs font-semibold"
        />
      </label>
      {row.followUp?.handled && (
        <p className="text-[11px] font-bold text-[var(--admin-muted)]">טופל לעת עתה</p>
      )}
      {row.followUp?.snoozeUntil && (
        <p className="text-[11px] font-bold text-[var(--admin-muted)]">
          תזכורת הבאה: {formatDate(row.followUp.snoozeUntil)}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <button type="button" disabled={busy} onClick={() => send("note")} className="rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-[11px] font-bold">
          שמירת הערה
        </button>
        <button type="button" disabled={busy} onClick={() => send("handled")} className="rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-[11px] font-bold">
          טופל לעת עתה
        </button>
        <button type="button" disabled={busy} onClick={() => send("tomorrow")} className="rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-[11px] font-bold">
          להזכיר לי מחר
        </button>
        <button type="button" disabled={busy} onClick={() => send("in_3_days")} className="rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-[11px] font-bold">
          להזכיר לי בעוד 3 ימים
        </button>
        <input
          type="date"
          value={remindOn}
          onChange={(event) => setRemindOn(event.target.value)}
          className="h-8 rounded-lg border border-[var(--admin-border)] px-2 text-[11px]"
        />
        <button
          type="button"
          disabled={busy || !remindOn}
          onClick={() => send("date")}
          className="rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-[11px] font-bold disabled:opacity-50"
        >
          בחירת תאריך לתזכורת
        </button>
      </div>
    </div>
  );
}

function PaymentDialog({
  row,
  busy,
  onClose,
  onSubmit,
}: {
  row: BillingRow;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: { amount: number; paidAt: string; method: PaymentMethod; note: string }) => void;
}) {
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" dir="rtl">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="סגירה" />
      <form
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 text-right shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ amount: Number(amount), paidAt, method, note });
        }}
      >
        <h2 className="text-xl font-black">רישום תשלום</h2>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          {row.clientName} · יתרה {money(row.balance)}
        </p>
        <label className="mt-4 block text-sm font-bold">
          סכום ששולם
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-[var(--admin-border)] px-3"
          />
        </label>
        <label className="mt-3 block text-sm font-bold">
          תאריך
          <input
            required
            type="date"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-[var(--admin-border)] px-3"
          />
        </label>
        <label className="mt-3 block text-sm font-bold">
          אמצעי תשלום
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            className="mt-2 h-11 w-full rounded-xl border border-[var(--admin-border)] px-3"
          >
            {METHODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm font-bold">
          הערה פנימית
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--admin-border)] px-3 py-2"
            rows={3}
          />
        </label>
        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="h-11 flex-1 rounded-xl bg-black text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "שומר…" : "שמירת תשלום"}
          </button>
          <button type="button" onClick={onClose} className="h-11 rounded-xl bg-[#ECE7E1] px-4 text-sm font-bold">
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}
