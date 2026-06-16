"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const VAT_RATE = 0.18;
const COMMISSION_RATE = 0.05;

function asNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function money(value: unknown) {
  const amount = asNumber(value);

  return amount.toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  });
}

function calculate(grossAmount: number) {
  const gross = Math.max(0, asNumber(grossAmount));
  const net = roundMoney(gross / (1 + VAT_RATE));
  const commission = roundMoney(net * COMMISSION_RATE);

  return {
    gross,
    net,
    commission,
  };
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: "arrow" | "save";
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "save") {
    return (
      <svg {...common}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M17 21v-8H7v8" />
        <path d="M7 3v5h8" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export default function NewEmployeeSalePage() {
  const router = useRouter();

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");

  const [plan, setPlan] = useState("premium");
  const [packageName, setPackageName] = useState("חבילת פרימיום");
  const [guests, setGuests] = useState("");

  const [grossAmount, setGrossAmount] = useState("");
  const [status, setStatus] = useState("paid");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const calculated = useMemo(() => {
    return calculate(asNumber(grossAmount));
  }, [grossAmount]);

  async function submitSale(event: React.FormEvent) {
    event.preventDefault();

    if (saving) return;

    try {
      setError("");
      setSaving(true);

      const response = await fetch("/api/employee/sales", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName,
          clientEmail,
          clientPhone,
          eventName,
          eventDate,
          plan,
          packageName,
          guests: asNumber(guests),
          grossAmount: asNumber(grossAmount),
          status,
          notes,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message || data?.error || "שגיאה ביצירת הלקוח והמכירה",
        );
      }

      alert("הלקוח והעסקה נוצרו בהצלחה");
      router.push("/employee/sales");
      router.refresh();
    } catch (submitError) {
      console.error("CREATE EMPLOYEE SALE FAILED:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "שגיאה ביצירת הלקוח והמכירה",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-950"
    >
      <main className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <button
            type="button"
            onClick={() => router.push("/employee/sales")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <Icon name="arrow" className="h-4 w-4" />
            חזרה למכירות
          </button>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">
            יצירת לקוח חדש
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
            כאן העובד יוצר לקוח חדש ומזין את סכום העסקה. המערכת שומרת את
            המכירה על העובד המחובר ומחשבת עמלה אוטומטית.
          </p>
        </section>

        <form
          onSubmit={submitSale}
          className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]"
        >
          <section className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-2xl font-black text-slate-950">
              פרטי לקוח ועסקה
            </h2>

            {error && (
              <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
                {error}
              </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  שם לקוח *
                </span>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="לדוגמה: הדר כהן"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  אימייל לקוח *
                </span>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="client@email.com"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  טלפון
                </span>
                <input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="0500000000"
                  dir="ltr"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  שם אירוע
                </span>
                <input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="לדוגמה: חתונה הדר ויוסי"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  תאריך אירוע
                </span>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  כמות מוזמנים
                </span>
                <input
                  type="number"
                  min={0}
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="300"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  סוג חבילה
                </span>
                <select
                  value={plan}
                  onChange={(e) => {
                    setPlan(e.target.value);

                    if (e.target.value === "basic") {
                      setPackageName("חבילה בסיסית");
                    }

                    if (e.target.value === "premium") {
                      setPackageName("חבילת פרימיום");
                    }

                    if (e.target.value === "plan1") {
                      setPackageName("מסלול 1");
                    }

                    if (e.target.value === "plan2") {
                      setPackageName("מסלול 2");
                    }

                    if (e.target.value === "plan3") {
                      setPackageName("מסלול 3");
                    }
                  }}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  <option value="basic">בסיסי</option>
                  <option value="premium">פרימיום</option>
                  <option value="plan1">מסלול 1</option>
                  <option value="plan2">מסלול 2</option>
                  <option value="plan3">מסלול 3</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  שם חבילה להצגה
                </span>
                <input
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="חבילת פרימיום"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  סכום עסקה כולל מע״מ *
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={grossAmount}
                  onChange={(e) => setGrossAmount(e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="1000"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  סטטוס עסקה
                </span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  <option value="paid">שולם</option>
                  <option value="pending">ממתין לתשלום</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-black text-slate-700">
                  הערה
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="לדוגמה: הלקוח ביקש לחזור אליו עם עיצוב מיוחד"
                />
              </label>
            </div>
          </section>

          <aside className="h-fit rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-2xl font-black text-slate-950">
              חישוב עמלה
            </h2>

            <div className="mt-5 space-y-3">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500">
                  סכום כולל מע״מ
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {money(calculated.gross)}
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500">
                  סכום לפני מע״מ
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {money(calculated.net)}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  חישוב: סכום כולל / 1.18
                </p>
              </div>

              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-black text-emerald-700">
                  עמלה לעובד
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-900">
                  {money(calculated.commission)}
                </p>
                <p className="mt-1 text-xs font-bold text-emerald-700/70">
                  5% מהסכום לפני מע״מ
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="save" className="h-4 w-4" />
              {saving ? "שומר..." : "שמור לקוח ועסקה"}
            </button>
          </aside>
        </form>
      </main>
    </div>
  );
}