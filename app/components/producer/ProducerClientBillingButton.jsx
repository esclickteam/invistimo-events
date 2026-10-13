"use client";

import { useState } from "react";

function formatDay(value) {
  if (!value) return "טרם נקבע";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${Number(day)}.${Number(month)}.${year}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "טרם נקבע";
  return date.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" });
}

export default function ProducerClientBillingButton({ client, producerId }) {
  const payer = client?.producerBilling?.payerProducerId;
  const isPayer = payer && String(payer) === String(producerId);
  const isOwnProducerClient =
    client?.billingSource === "producer" && (!payer || isPayer);
  const visible = Boolean(isOwnProducerClient || isPayer);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [billing, setBilling] = useState(null);
  const [finalRecords, setFinalRecords] = useState("");

  if (!visible) return null;

  const eventName =
    billing?.eventName ||
    client?.event?.eventName ||
    client?.eventName ||
    "טרם נפתח אירוע";
  const eventDate = billing?.eventDate || client?.event?.eventDate || client?.eventDate || null;

  async function openModal() {
    setOpen(true);
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const res = await fetch(`/api/producer/clients/${client._id}/billing`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError("לא ניתן לטעון את נתוני הרשומות");
        return;
      }
      setBilling(data.billing);
      setFinalRecords(
        data.billing?.finalRecords == null ? "" : String(data.billing.finalRecords),
      );
    } catch {
      setError("לא ניתן לטעון את נתוני הרשומות");
    } finally {
      setLoading(false);
    }
  }

  async function saveFinalRecords() {
    const next = Number(finalRecords);
    if (!Number.isInteger(next) || next < 0) {
      setError("יש להזין כמות רשומות שלמה");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/producer/clients/${client._id}/billing`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalRecords: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError("עדכון הכמות נכשל");
        return;
      }
      setBilling(data.billing);
      setNotice(`הכמות הסופית נשמרה: ${data.billing?.finalRecords ?? next}`);
    } catch {
      setError("עדכון הכמות נכשל");
    } finally {
      setSaving(false);
    }
  }

  async function resendPasswordSms() {
    setSending(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/producer/clients/${client._id}/password-sms`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (res.status === 429) {
        setError(
          data?.error === "PASSWORD_SMS_DAILY_LIMIT"
            ? "הגעת למכסת השליחות ליממה"
            : "אפשר לשלוח שוב בעוד דקה",
        );
        return;
      }
      if (!res.ok || !data?.success) {
        setError("שליחת ה־SMS נכשלה");
        return;
      }
      if (data.passwordSms?.status === "sent") {
        setNotice("נשלח SMS חדש להגדרת סיסמה.");
      } else if (data.passwordSms?.status === "missing_phone") {
        setError("אין מספר טלפון ללקוח");
      } else {
        setError("שליחת ה־SMS נכשלה. הלקוח נשאר פעיל.");
      }
    } catch {
      setError("שליחת ה־SMS נכשלה");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-2xl bg-[#8B5CF6] px-4 py-3 text-sm font-black text-white shadow-sm hover:opacity-95"
      >
        עדכון כמות סופית
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" dir="rtl">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="סגירה"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 text-right shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-[#1E1B2E]">עדכון כמות סופית</h3>
                <p className="mt-1 text-sm text-[#7B7285]">{billing?.clientName || client?.name || "לקוח"}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="font-black text-[#7B7285]">
                סגירה
              </button>
            </div>

            {loading ? (
              <p className="mt-6 text-sm text-[#7B7285]">טוען…</p>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Stat label="שם הלקוח" value={billing?.clientName || client?.name || "לקוח"} />
                  <Stat label="שם האירוע" value={eventName} />
                  <Stat label="תאריך האירוע" value={formatDay(eventDate)} />
                  <Stat label="כמות ראשונית" value={billing?.initialRecords ?? "—"} />
                  <Stat label="רשומות בפועל" value={billing?.actualRecords ?? "—"} />
                  <Stat label="כמות סופית אחרונה" value={billing?.finalRecords ?? "טרם נשמרה"} />
                </div>
                <label className="block text-sm font-black text-[#1E1B2E]">
                  כמות סופית חדשה
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={finalRecords}
                    onChange={(event) => setFinalRecords(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#E8DDD3] px-4 py-3 text-sm outline-none"
                  />
                </label>
                <p className="text-xs leading-5 text-[#7B7285]">
                  אפשר להגדיל או להקטין. השינוי לא מוחק אורחים ולא משנה אישורי הגעה, הודעות, שיחות או הושבה.
                </p>
                {error && <p className="text-sm font-bold text-red-600">{error}</p>}
                {notice && <p className="text-sm font-bold text-emerald-700">{notice}</p>}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={saveFinalRecords}
                    disabled={saving}
                    className="rounded-2xl bg-[#1E1B2E] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    {saving ? "שומר…" : "שמירת כמות סופית"}
                  </button>
                  <button
                    type="button"
                    onClick={resendPasswordSms}
                    disabled={sending}
                    className="rounded-2xl border border-[#E8DDD3] px-4 py-3 text-sm font-black text-[#1E1B2E] disabled:opacity-50"
                  >
                    {sending ? "שולח…" : "שליחה מחדש של קישור סיסמה"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#FCFBFA] px-3 py-3">
      <div className="text-xs font-bold text-[#7B7285]">{label}</div>
      <div className="mt-1 text-base font-black text-[#1E1B2E]">{value}</div>
    </div>
  );
}
