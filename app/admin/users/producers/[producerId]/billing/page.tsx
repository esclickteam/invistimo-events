"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminActionsItem, AdminActionsMenu } from "@/app/components/admin/ui/AdminUI";

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

type EditorKind = "price" | "quantity" | "note" | "date";

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

function hasOpenBalance(row: BillingRow) {
  return row.balance != null && row.balance > 0;
}

export default function ProducerBillingPage() {
  const params = useParams<{ producerId: string }>();
  const producerId = String(params?.producerId || "");
  const [payload, setPayload] = useState<BillingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentFor, setPaymentFor] = useState<BillingRow | null>(null);
  const [editor, setEditor] = useState<{ kind: EditorKind; row: BillingRow } | null>(null);
  const [assignEmail, setAssignEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [focusClient, setFocusClient] = useState("");
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);

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

  function openEditor(kind: EditorKind, row: BillingRow) {
    setOpenActionsId(null);
    setEditor({ kind, row });
  }

  async function runFollowUp(row: BillingRow, mode: "handled" | "tomorrow" | "in_3_days") {
    setOpenActionsId(null);
    await post({
      action: "follow-up",
      clientId: row.clientId,
      mode,
      note: row.followUp?.note || "",
    });
  }

  return (
    <div dir="rtl" className="mx-auto w-full max-w-[1400px] px-4 py-6 text-right">
      <style>{`
        tr.billing-row-focus > td { background: #fff6e8; }
        @media (min-width: 768px) {
          .admin-table.billing-table tbody td.billing-nowrap { white-space: nowrap; }
          .admin-table.billing-table .billing-clip {
            display: block;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      `}</style>
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

          <div className="admin-table-region w-full min-w-0">
            <div className="admin-table-scroll">
              <table className="admin-table billing-table">
                <colgroup>
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "7%" }} />
                </colgroup>
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
                  {payload.rows.map((row) => {
                    const open = openActionsId === row.clientId;
                    const openBalance = hasOpenBalance(row);
                    return (
                      <tr
                        key={row.clientId}
                        id={`collection-client-${row.clientId}`}
                        className={
                          focusClient === row.clientId
                            ? `billing-row-focus${open ? " actions-open" : ""}`
                            : open
                              ? "actions-open"
                              : undefined
                        }
                      >
                        <td data-label="לקוח">
                          <div className="min-w-0">
                            <div className="billing-clip font-bold" title={row.clientName}>
                              {row.clientName}
                            </div>
                            <div className="billing-clip text-xs text-[var(--admin-muted)]" title={row.clientEmail}>
                              {row.clientEmail}
                            </div>
                          </div>
                        </td>
                        <td data-label="אירוע">
                          <span className="billing-clip" title={row.eventName}>
                            {row.eventName}
                          </span>
                        </td>
                        <td className="billing-nowrap" data-label="תאריך">
                          {formatDate(row.eventDate)}
                        </td>
                        <td className="billing-nowrap" data-label="ראשונית">
                          {row.initialRecords}
                        </td>
                        <td className="billing-nowrap" data-label="בפועל">
                          {row.actualRecords}
                        </td>
                        <td className="billing-nowrap" data-label="סופית לחיוב">
                          {row.finalRecords ?? "—"}
                        </td>
                        <td className="billing-nowrap" data-label="מחיר לרשומה">
                          {money(row.pricePerRecord)}
                        </td>
                        <td className="billing-nowrap" data-label="סכום לתשלום">
                          {money(row.amountDue)}
                        </td>
                        <td className="billing-nowrap" data-label="שולם">
                          {money(row.amountPaid)}
                        </td>
                        <td className="billing-nowrap" data-label="יתרה">
                          {money(row.balance)}
                        </td>
                        <td data-label="סטטוס" className="font-bold">
                          <span className="billing-clip" title={row.statusLabel}>
                            {row.statusLabel}
                          </span>
                        </td>
                        <td className="admin-actions-cell" data-label="פעולות">
                          <AdminActionsMenu
                            open={open}
                            width={248}
                            onToggle={() => setOpenActionsId(open ? null : row.clientId)}
                            onClose={() => setOpenActionsId(null)}
                          >
                            {(row.followUp?.handled || row.followUp?.snoozeUntil) && (
                              <div className="border-b border-[var(--admin-border)] px-3 py-2 text-[11px] font-bold leading-5 text-[var(--admin-muted)]">
                                {row.followUp?.handled ? <div>טופל לעת עתה</div> : null}
                                {row.followUp?.snoozeUntil ? (
                                  <div>תזכורת הבאה: {formatDate(row.followUp.snoozeUntil)}</div>
                                ) : null}
                              </div>
                            )}
                            <AdminActionsItem
                              disabled={busy}
                              onClick={() => {
                                setOpenActionsId(null);
                                setPaymentFor(row);
                              }}
                            >
                              רישום תשלום
                            </AdminActionsItem>
                            <AdminActionsItem disabled={busy} onClick={() => openEditor("price", row)}>
                              עדכון מחיר
                            </AdminActionsItem>
                            <AdminActionsItem disabled={busy} onClick={() => openEditor("quantity", row)}>
                              תיקון כמות
                            </AdminActionsItem>
                            {openBalance && (
                              <>
                                <AdminActionsItem disabled={busy} onClick={() => openEditor("note", row)}>
                                  שמירת הערה פנימית
                                </AdminActionsItem>
                                <AdminActionsItem disabled={busy} onClick={() => void runFollowUp(row, "handled")}>
                                  סימון ״טופל לעת עתה״
                                </AdminActionsItem>
                                <AdminActionsItem disabled={busy} onClick={() => void runFollowUp(row, "tomorrow")}>
                                  להזכיר לי מחר
                                </AdminActionsItem>
                                <AdminActionsItem disabled={busy} onClick={() => void runFollowUp(row, "in_3_days")}>
                                  להזכיר לי בעוד 3 ימים
                                </AdminActionsItem>
                                <AdminActionsItem disabled={busy} onClick={() => openEditor("date", row)}>
                                  בחירת תאריך לתזכורת
                                </AdminActionsItem>
                              </>
                            )}
                          </AdminActionsMenu>
                        </td>
                      </tr>
                    );
                  })}
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

      {editor?.kind === "price" && (
        <PriceDialog
          key={editor.row.clientId}
          row={editor.row}
          busy={busy}
          onClose={() => setEditor(null)}
          onSubmit={async (pricePerRecord) => {
            const ok = await post({
              action: "price",
              clientId: editor.row.clientId,
              pricePerRecord,
            });
            if (ok) setEditor(null);
          }}
        />
      )}

      {editor?.kind === "quantity" && (
        <QuantityDialog
          key={editor.row.clientId}
          row={editor.row}
          busy={busy}
          onClose={() => setEditor(null)}
          onSubmit={async (finalRecords) => {
            const ok = await post({
              action: "final-records",
              clientId: editor.row.clientId,
              finalRecords,
            });
            if (ok) setEditor(null);
          }}
        />
      )}

      {editor?.kind === "note" && (
        <NoteDialog
          key={editor.row.clientId}
          row={editor.row}
          busy={busy}
          onClose={() => setEditor(null)}
          onSubmit={async (note) => {
            const ok = await post({
              action: "follow-up",
              clientId: editor.row.clientId,
              mode: "note",
              note,
            });
            if (ok) setEditor(null);
          }}
        />
      )}

      {editor?.kind === "date" && (
        <DateDialog
          key={editor.row.clientId}
          row={editor.row}
          busy={busy}
          onClose={() => setEditor(null)}
          onSubmit={async (remindOn) => {
            const ok = await post({
              action: "follow-up",
              clientId: editor.row.clientId,
              mode: "date",
              remindOn,
              note: editor.row.followUp?.note || "",
            });
            if (ok) setEditor(null);
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

function DialogShell({
  title,
  subtitle,
  busy,
  onClose,
  onSubmit,
  submitLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" dir="rtl">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="סגירה" />
      <form
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 text-right shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <h2 className="text-xl font-black">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--admin-muted)]">{subtitle}</p> : null}
        <div className="mt-4">{children}</div>
        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="h-11 flex-1 rounded-xl bg-black text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "שומר…" : submitLabel}
          </button>
          <button type="button" onClick={onClose} className="h-11 rounded-xl bg-[#ECE7E1] px-4 text-sm font-bold">
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-[var(--admin-border)] px-3 text-sm";

function PriceDialog({
  row,
  busy,
  onClose,
  onSubmit,
}: {
  row: BillingRow;
  busy: boolean;
  onClose: () => void;
  onSubmit: (pricePerRecord: number) => void;
}) {
  const [value, setValue] = useState(String(row.pricePerRecord));
  const [localError, setLocalError] = useState("");

  return (
    <DialogShell
      title="עדכון מחיר"
      subtitle={row.clientName}
      busy={busy}
      onClose={onClose}
      submitLabel="שמירת מחיר"
      onSubmit={() => {
        const next = Number(value);
        if (!Number.isFinite(next) || next < 0) {
          setLocalError("מחיר לא תקין");
          return;
        }
        setLocalError("");
        onSubmit(next);
      }}
    >
      <label className="block text-sm font-bold">
        מחיר לרשומה
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={fieldClass}
        />
      </label>
      {localError ? <p className="mt-2 text-sm font-bold text-red-600">{localError}</p> : null}
    </DialogShell>
  );
}

function QuantityDialog({
  row,
  busy,
  onClose,
  onSubmit,
}: {
  row: BillingRow;
  busy: boolean;
  onClose: () => void;
  onSubmit: (finalRecords: number) => void;
}) {
  const [value, setValue] = useState(row.finalRecords == null ? "" : String(row.finalRecords));
  const [localError, setLocalError] = useState("");

  return (
    <DialogShell
      title="תיקון כמות"
      subtitle={row.eventName}
      busy={busy}
      onClose={onClose}
      submitLabel="שמירת כמות"
      onSubmit={() => {
        const next = Number(value);
        if (!Number.isInteger(next) || next < 0) {
          setLocalError("כמות רשומות לא תקינה");
          return;
        }
        setLocalError("");
        onSubmit(next);
      }}
    >
      <label className="block text-sm font-bold">
        כמות סופית לחיוב
        <input
          required
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={fieldClass}
        />
      </label>
      {localError ? <p className="mt-2 text-sm font-bold text-red-600">{localError}</p> : null}
    </DialogShell>
  );
}

function NoteDialog({
  row,
  busy,
  onClose,
  onSubmit,
}: {
  row: BillingRow;
  busy: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState(row.followUp?.note || "");

  return (
    <DialogShell
      title="שמירת הערה פנימית"
      subtitle={row.eventName}
      busy={busy}
      onClose={onClose}
      submitLabel="שמירת הערה"
      onSubmit={() => onSubmit(note)}
    >
      <label className="block text-sm font-bold">
        הערה פנימית
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="דיברתי עם המפיקה, התחייבה להעביר תשלום ביום חמישי."
          rows={4}
          className="mt-2 w-full rounded-xl border border-[var(--admin-border)] px-3 py-2 text-sm"
        />
      </label>
    </DialogShell>
  );
}

function DateDialog({
  row,
  busy,
  onClose,
  onSubmit,
}: {
  row: BillingRow;
  busy: boolean;
  onClose: () => void;
  onSubmit: (remindOn: string) => void;
}) {
  const [remindOn, setRemindOn] = useState("");
  const [localError, setLocalError] = useState("");

  return (
    <DialogShell
      title="בחירת תאריך לתזכורת"
      subtitle={row.eventName}
      busy={busy}
      onClose={onClose}
      submitLabel="שמירת תזכורת"
      onSubmit={() => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(remindOn)) {
          setLocalError("יש לבחור תאריך");
          return;
        }
        setLocalError("");
        onSubmit(remindOn);
      }}
    >
      <label className="block text-sm font-bold">
        תאריך לתזכורת
        <input
          required
          type="date"
          value={remindOn}
          onChange={(event) => setRemindOn(event.target.value)}
          className={fieldClass}
        />
      </label>
      {localError ? <p className="mt-2 text-sm font-bold text-red-600">{localError}</p> : null}
    </DialogShell>
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
    <DialogShell
      title="רישום תשלום"
      subtitle={`${row.clientName} · יתרה ${money(row.balance)}`}
      busy={busy}
      onClose={onClose}
      submitLabel="שמירת תשלום"
      onSubmit={() => onSubmit({ amount: Number(amount), paidAt, method, note })}
    >
      <label className="block text-sm font-bold">
        סכום ששולם
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="mt-3 block text-sm font-bold">
        תאריך
        <input
          required
          type="date"
          value={paidAt}
          onChange={(event) => setPaidAt(event.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="mt-3 block text-sm font-bold">
        אמצעי תשלום
        <select
          value={method}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          className={fieldClass}
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
          className="mt-2 w-full rounded-xl border border-[var(--admin-border)] px-3 py-2 text-sm"
          rows={3}
        />
      </label>
    </DialogShell>
  );
}
