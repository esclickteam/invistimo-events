"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeDollarSign,
  CalendarCheck2,
  ClipboardCheck,
  Plus,
  Receipt,
  Save,
  Send,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

type ExtraCharge = {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  notes: string;
};

type PaymentStatus = "open" | "closed";

type HallPaymentData = {
  eventId: string;
  hallId: string;
  estimatedGuests: number;
  reserveGuests: number;
  pricePerGuest: number;
  actualGuests: number;
  advancePayment: number;
  paidAmount: number;
  extras: ExtraCharge[];

  bankName: string;
  bankBranch: string;
  bankAccountNumber: string;
  bankAccountHolder: string;

  paymentSmsPhone: string;
  paymentSmsMessage: string;
  notes: string;
  status: PaymentStatus;
  closedAt?: string | null;
  updatedAt?: string | null;
};

type Summary = {
  plannedGuests: number;
  plannedMealTotal: number;
  actualMealTotal: number;
  extrasTotal: number;
  finalTotal: number;
  totalPaid: number;
  remainingToPay: number;
  reserveOverflow: number;
};

const EXTRA_TEMPLATES = [
  "עיצוב",
  "תאורה",
  "הגברה",
  "הושבה",
  "דיילות",
  "בר",
  "ניקיון",
  "אבטחה",
];

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(n(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function normalizeStatus(value: unknown): PaymentStatus {
  return value === "closed" ? "closed" : "open";
}

function buildDefaultState(eventId: string, hallId = ""): HallPaymentData {
  return {
    eventId,
    hallId,
    estimatedGuests: 0,
    reserveGuests: 0,
    pricePerGuest: 0,
    actualGuests: 0,
    advancePayment: 0,
    paidAmount: 0,
    extras: [],

    bankName: "",
    bankBranch: "",
    bankAccountNumber: "",
    bankAccountHolder: "",

    paymentSmsPhone: "",
    paymentSmsMessage: "",
    notes: "",
    status: "open",
    closedAt: null,
    updatedAt: null,
  };
}

function calculateSummary(data: HallPaymentData): Summary {
  const plannedGuests = n(data.estimatedGuests) + n(data.reserveGuests);
  const plannedMealTotal = plannedGuests * n(data.pricePerGuest);
  const actualMealTotal = n(data.actualGuests) * n(data.pricePerGuest);
  const extrasTotal = data.extras.reduce(
    (sum, item) => sum + n(item.quantity) * n(item.unitPrice),
    0
  );
  const finalTotal = actualMealTotal + extrasTotal;
  const totalPaid = n(data.advancePayment) + n(data.paidAmount);
  const remainingToPay = Math.max(0, finalTotal - totalPaid);
  const reserveOverflow = Math.max(0, n(data.actualGuests) - plannedGuests);

  return {
    plannedGuests,
    plannedMealTotal,
    actualMealTotal,
    extrasTotal,
    finalTotal,
    totalPaid,
    remainingToPay,
    reserveOverflow,
  };
}

function buildBankDetailsText(data: HallPaymentData) {
  const rows = [
    data.bankName?.trim() ? `בנק: ${data.bankName.trim()}` : "",
    data.bankBranch?.trim() ? `סניף: ${data.bankBranch.trim()}` : "",
    data.bankAccountNumber?.trim() ? `מספר חשבון: ${data.bankAccountNumber.trim()}` : "",
    data.bankAccountHolder?.trim() ? `על שם: ${data.bankAccountHolder.trim()}` : "",
  ].filter(Boolean);

  return rows.length ? rows.join("\n") : "";
}

function buildDefaultSmsMessage(data: HallPaymentData, summary: Summary) {
  const bankDetails = buildBankDetailsText(data);
  const transferSection = bankDetails ? `\nפרטי חשבון להעברה:\n${bankDetails}` : "";

  return [
    "שלום, מצורף סיכום תשלום לאירוע מטעם האולם:",
    `סה״כ הגיעו בפועל: ${n(data.actualGuests)} אורחים`,
    `מחיר למנה: ${money(n(data.pricePerGuest))}`,
    `חיוב מנות בפועל: ${money(summary.actualMealTotal)}`,
    `תשלומים נוספים: ${money(summary.extrasTotal)}`,
    `סה״כ חיוב סופי: ${money(summary.finalTotal)}`,
    `סה״כ שולם: ${money(summary.totalPaid)}`,
    `יתרה לתשלום: ${money(summary.remainingToPay)}`,
    transferSection,
  ]
    .filter(Boolean)
    .join("\n");
}

async function readJsonSafely(res: Response) {
  const text = await res.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      res.status === 404
        ? "נתיב השרת של התשלומים לא נמצא. ודאי שהקובץ נמצא ב־app/api/venues/dashboard/events/[eventId]/hall-payments/route.ts"
        : "השרת החזיר HTML במקום JSON. בדרך כלל זה אומר שה־API Route לא נמצא, נפל בשגיאה, או שהניתוב לא נכון."
    );
  }
}

export default function EventHallPaymentsTab({
  eventId,
  hallId,
}: {
  eventId: string;
  hallId?: string;
}) {
  const [data, setData] = useState<HallPaymentData>(() =>
    buildDefaultState(eventId, hallId || "")
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [message, setMessage] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const didLoadRef = useRef(false);
  const skipNextAutoSaveRef = useRef(true);
  const saveAbortRef = useRef<AbortController | null>(null);

  const summary = useMemo(() => calculateSummary(data), [data]);

  const autoSaveKey = useMemo(
    () =>
      JSON.stringify({
        hallId: data.hallId,
        estimatedGuests: data.estimatedGuests,
        reserveGuests: data.reserveGuests,
        pricePerGuest: data.pricePerGuest,
        actualGuests: data.actualGuests,
        advancePayment: data.advancePayment,
        paidAmount: data.paidAmount,
        extras: data.extras,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountHolder: data.bankAccountHolder,
        paymentSmsPhone: data.paymentSmsPhone,
        paymentSmsMessage: data.paymentSmsMessage,
        notes: data.notes,
        status: data.status,
      }),
    [
      data.hallId,
      data.estimatedGuests,
      data.reserveGuests,
      data.pricePerGuest,
      data.actualGuests,
      data.advancePayment,
      data.paidAmount,
      data.extras,
      data.bankName,
      data.bankBranch,
      data.bankAccountNumber,
      data.bankAccountHolder,
      data.paymentSmsPhone,
      data.paymentSmsMessage,
      data.notes,
      data.status,
    ]
  );

  const apiPath = `/api/venues/dashboard/events/${eventId}/hall-payments`;

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setMessage("");

        const res = await fetch(apiPath, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const json = await readJsonSafely(res);
        if (!active) return;

        if (!res.ok) {
          throw new Error(json?.error || json?.message || "שגיאה בטעינת נתוני תשלומים");
        }

        const nextData = {
          ...buildDefaultState(eventId, hallId || ""),
          ...json.data,
          eventId,
          hallId: json?.data?.hallId || hallId || "",
          status: normalizeStatus(json?.data?.status),
          extras: Array.isArray(json?.data?.extras) ? json.data.extras : [],

          bankName: String(json?.data?.bankName || ""),
          bankBranch: String(json?.data?.bankBranch || ""),
          bankAccountNumber: String(json?.data?.bankAccountNumber || ""),
          bankAccountHolder: String(json?.data?.bankAccountHolder || ""),

          paymentSmsPhone: String(json?.data?.paymentSmsPhone || ""),
          paymentSmsMessage: String(json?.data?.paymentSmsMessage || ""),
        };

        if (!nextData.paymentSmsMessage) {
          nextData.paymentSmsMessage = buildDefaultSmsMessage(nextData, calculateSummary(nextData));
        }

        skipNextAutoSaveRef.current = true;
        setData(nextData);
        setLastSavedAt(nextData.updatedAt || null);
      } catch (error: any) {
        if (!active) return;
        setMessage(error?.message || "שגיאה בטעינת נתוני תשלומים");
        skipNextAutoSaveRef.current = true;
        setData(buildDefaultState(eventId, hallId || ""));
      } finally {
        if (active) {
          didLoadRef.current = true;
          setLoading(false);
        }
      }
    }

    didLoadRef.current = false;
    skipNextAutoSaveRef.current = true;
    load();

    return () => {
      active = false;
      saveAbortRef.current?.abort();
    };
  }, [eventId, hallId, apiPath]);

  async function savePayload(payload: HallPaymentData, nextStatus?: PaymentStatus) {
    saveAbortRef.current?.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;

    try {
      setSaving(true);
      setMessage("");

      const payloadToSave = {
        ...payload,
        hallId: payload.hallId || hallId || "",
        status: nextStatus || payload.status || "open",
      };

      const res = await fetch(apiPath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payloadToSave),
        signal: controller.signal,
      });

      const json = await readJsonSafely(res);

      if (!res.ok) {
        throw new Error(json?.error || json?.message || "שגיאה בשמירת התשלומים");
      }

      const saved = {
        ...payloadToSave,
        ...json.data,
        status: normalizeStatus(json?.data?.status),
        extras: Array.isArray(json?.data?.extras) ? json.data.extras : payloadToSave.extras,

        bankName: String(json?.data?.bankName || payloadToSave.bankName || ""),
        bankBranch: String(json?.data?.bankBranch || payloadToSave.bankBranch || ""),
        bankAccountNumber: String(json?.data?.bankAccountNumber || payloadToSave.bankAccountNumber || ""),
        bankAccountHolder: String(json?.data?.bankAccountHolder || payloadToSave.bankAccountHolder || ""),

        paymentSmsPhone: String(json?.data?.paymentSmsPhone || payloadToSave.paymentSmsPhone || ""),
        paymentSmsMessage: String(json?.data?.paymentSmsMessage || payloadToSave.paymentSmsMessage || ""),
      };

      skipNextAutoSaveRef.current = true;
      setData(saved);
      setLastSavedAt(saved.updatedAt || new Date().toISOString());
      setMessage(nextStatus === "closed" ? "האירוע נסגר והתשלום נשמר" : "נשמר אוטומטית אחרי כמה שניות");
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      setMessage(error?.message || "שגיאה בשמירת התשלומים");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (loading || !didLoadRef.current) return;

    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void savePayload(data);
    }, 3500);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSaveKey]);

  const updateSmsMessageFromCurrentSummary = () => {
    setData((current) => ({
      ...current,
      paymentSmsMessage: buildDefaultSmsMessage(current, calculateSummary(current)),
    }));
  };

  const setField = (field: keyof HallPaymentData, value: any) => {
    setData((current) => ({ ...current, [field]: value, status: "open" }));
  };

  const setNumberField = (field: keyof HallPaymentData, value: string) => {
    setData((current) => ({ ...current, [field]: n(value), status: "open" }));
  };

  const closeEvent = () => {
    const nextData: HallPaymentData = {
      ...data,
      status: "closed",
      closedAt: new Date().toISOString(),
      paymentSmsMessage: data.paymentSmsMessage || buildDefaultSmsMessage(data, summary),
    };
    skipNextAutoSaveRef.current = true;
    setData(nextData);
    void savePayload(nextData, "closed");
  };

  const sendPaymentSms = async () => {
    if (!data.paymentSmsPhone.trim()) {
      alert("חובה להזין מספר טלפון לשליחת SMS");
      return;
    }

    const text = data.paymentSmsMessage.trim() || buildDefaultSmsMessage(data, summary);

    if (!text.trim()) {
      alert("חובה להזין תוכן הודעה");
      return;
    }

    try {
      setSendingSms(true);
      setMessage("");

      await savePayload({ ...data, paymentSmsMessage: text });

      const cleanPhone = data.paymentSmsPhone.trim();

      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          phone: cleanPhone,
          to: cleanPhone,
          recipient: cleanPhone,
          recipients: [cleanPhone],
          phones: [cleanPhone],
          message: text,
          text,
          content: text,
          eventId,
          hallId: data.hallId || hallId || "",
          type: "hall_payment_summary",
          provider: "4free",
        }),
      });

      const json = await readJsonSafely(res);

      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || json?.error || "שליחת ה-SMS נכשלה");
      }

      setMessage("סיכום התשלום נשלח ללקוח ב-SMS");
    } catch (error: any) {
      setMessage(error?.message || "שליחת ה-SMS נכשלה");
    } finally {
      setSendingSms(false);
    }
  };

  const addExtra = (title = "") => {
    setData((current) => ({
      ...current,
      status: "open",
      extras: [
        ...current.extras,
        {
          id: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title,
          quantity: 1,
          unitPrice: 0,
          notes: "",
        },
      ],
    }));
  };

  const updateExtra = (id: string, field: keyof ExtraCharge, value: string) => {
    setData((current) => ({
      ...current,
      status: "open",
      extras: current.extras.map((item) => {
        if (item.id !== id) return item;

        if (field === "quantity" || field === "unitPrice") {
          return { ...item, [field]: n(value) };
        }

        return { ...item, [field]: value };
      }),
    }));
  };

  const removeExtra = (id: string) => {
    setData((current) => ({
      ...current,
      status: "open",
      extras: current.extras.filter((item) => item.id !== id),
    }));
  };

  if (loading) {
    return (
      <div className="rounded-[32px] border border-[#eadfce] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#fff4dc] text-[#b98121]">
          <Receipt size={28} />
        </div>
        <h2 className="mt-4 text-2xl font-black text-[#2b241c]">טוען נתוני תשלומים...</h2>
        <p className="mt-2 text-sm font-bold text-[#7f705d]">מכינים את טאב התשלומים של האולם</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <section className="overflow-hidden rounded-[38px] border border-[#e6dccb] bg-[radial-gradient(circle_at_top_right,rgba(255,246,226,0.95),transparent_34%),linear-gradient(135deg,#fffdf8_0%,#fbf3e8_46%,#f2e5d2_100%)] p-5 shadow-[0_24px_70px_rgba(47,35,20,0.10)]">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[30px] border border-[#eadfce] bg-white/90 p-6 shadow-[0_12px_34px_rgba(47,35,20,0.06)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fff4dc] px-3 py-1 text-xs font-black text-[#9f6f1a]">
              <Sparkles size={14} />
              תשלומים לאולם
            </div>

            <h1 className="mt-4 text-3xl font-black text-[#2b241c]">ניהול תשלומי אירוע</h1>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-[#7f705d]">
              בדיקת מה שהאולם צריך: מספר מנות, רזרבה, מחיר למנה, הגעה בפועל,
              סגירת אירוע וחישוב סופי כולל תשלומים נוספים כמו עיצוב, תאורה,
              הגברה, הושבה ודיילות.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <TopStat label="סטטוס" value={data.status === "closed" ? "סגור" : "פתוח"} />
              <TopStat
                label="שמירה"
                value={saving ? "שומר..." : lastSavedAt ? `נשמר ${formatDateTime(lastSavedAt)}` : "שמירה אוטומטית"}
              />
              <TopStat label="נסגר בתאריך" value={formatDateTime(data.closedAt)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            <SummaryCard icon={<Users size={20} />} title="סה״כ מנות מתוכננות" value={`${summary.plannedGuests}`} subtitle="מספר מנות + רזרבה" />
            <SummaryCard icon={<CalendarCheck2 size={20} />} title="הגיעו בפועל" value={`${n(data.actualGuests)}`} subtitle="מוזן ע״י האולם" />
            <SummaryCard icon={<Receipt size={20} />} title="סה״כ חיוב סופי" value={money(summary.finalTotal)} subtitle="מנות בפועל + תוספות" highlight />
            <SummaryCard icon={<BadgeDollarSign size={20} />} title="נשאר לתשלום" value={money(summary.remainingToPay)} subtitle="אחרי מקדמה ושולם בפועל" highlight />
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-[22px] border border-[#eadfce] bg-white px-4 py-3 text-sm font-black text-[#6f6252] shadow-sm">
          {message}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <Card title="פרטי חיוב בסיסיים" icon={<Users size={19} />}>
            <div className="grid gap-4 md:grid-cols-3">
              <NumberField label="מספר מנות" value={data.estimatedGuests} onChange={(value) => setNumberField("estimatedGuests", value)} />
              <NumberField label="כמות רזרבה" value={data.reserveGuests} onChange={(value) => setNumberField("reserveGuests", value)} />
              <NumberField label="מחיר למנה" value={data.pricePerGuest} onChange={(value) => setNumberField("pricePerGuest", value)} prefix="₪" />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InlineInfo label="סה״כ מנות כולל רזרבה" value={`${summary.plannedGuests}`} />
              <InlineInfo label="עלות מתוכננת" value={money(summary.plannedMealTotal)} />
            </div>
          </Card>

          <Card title="הגעה בפועל וסגירת אירוע" icon={<ClipboardCheck size={19} />}>
            <div className="grid gap-4 md:grid-cols-2">
              <NumberField label="הגיעו בפועל" value={data.actualGuests} onChange={(value) => setNumberField("actualGuests", value)} />
              <ReadonlyField label="חיוב לפי הגעה בפועל" value={money(summary.actualMealTotal)} />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InlineInfo label="חריגה מעל הרזרבה" value={`${summary.reserveOverflow}`} warn={summary.reserveOverflow > 0} />
              <InlineInfo label="מצב אירוע" value={data.status === "closed" ? "האירוע סגור" : "האירוע פתוח"} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void savePayload(data)}
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a] disabled:opacity-60"
              >
                <Save size={16} />
                {saving ? "שומר..." : "שמירה עכשיו"}
              </button>

              <button
                type="button"
                onClick={closeEvent}
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-5 text-sm font-black text-[#6f6252] shadow-sm transition hover:bg-[#fff8eb] disabled:opacity-60"
              >
                <ClipboardCheck size={16} />
                {saving ? "שומר..." : "סגירת אירוע"}
              </button>
            </div>
          </Card>

          <Card title="מקדמה ושולם בפועל" icon={<BadgeDollarSign size={19} />}>
            <div className="grid gap-4 md:grid-cols-2">
              <NumberField label="מקדמה" value={data.advancePayment} onChange={(value) => setNumberField("advancePayment", value)} prefix="₪" />
              <NumberField label="שולם בפועל בנוסף למקדמה" value={data.paidAmount} onChange={(value) => setNumberField("paidAmount", value)} prefix="₪" />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <InlineInfo label="סה״כ שולם" value={money(summary.totalPaid)} />
              <InlineInfo label="יתרה לתשלום" value={money(summary.remainingToPay)} strong />
              <InlineInfo label="מצב תשלום" value={summary.remainingToPay <= 0 && summary.finalTotal > 0 ? "שולם במלואו" : "נותרה יתרה"} warn={summary.remainingToPay > 0} />
            </div>
          </Card>

          <Card title="שליחת סיכום תשלום ללקוח" icon={<Send size={19} />}>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="טלפון לקוח לשליחת SMS"
                value={data.paymentSmsPhone}
                onChange={(value) => setField("paymentSmsPhone", value)}
                placeholder="לדוגמה: 0521234567"
              />
              <div>
                <span className="mb-1 block text-xs font-black text-[#8a7b68]">סיכום מהיר להודעה</span>
                <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-3 text-xs font-black leading-6 text-[#6f6252]">
                  הגיעו בפועל: {n(data.actualGuests)} · סה״כ חיוב: {money(summary.finalTotal)} · נשאר: {money(summary.remainingToPay)}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs font-black text-[#8a7b68]">פרטי חשבון בנק להעברה</div>
              <div className="grid gap-3 md:grid-cols-2">
                <TextField
                  label="בנק"
                  value={data.bankName}
                  onChange={(value) => setField("bankName", value)}
                  placeholder="לדוגמה: מזרחי / לאומי / הפועלים"
                />
                <TextField
                  label="סניף"
                  value={data.bankBranch}
                  onChange={(value) => setField("bankBranch", value)}
                  placeholder="לדוגמה: 123"
                />
                <TextField
                  label="מספר חשבון"
                  value={data.bankAccountNumber}
                  onChange={(value) => setField("bankAccountNumber", value)}
                  placeholder="לדוגמה: 123456789"
                />
                <TextField
                  label="על שם"
                  value={data.bankAccountHolder}
                  onChange={(value) => setField("bankAccountHolder", value)}
                  placeholder="שם בעל החשבון / שם האולם"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={updateSmsMessageFromCurrentSummary}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-xs font-black text-[#6f6252] transition hover:bg-[#fff8eb]"
              >
                <Sparkles size={14} />
                עדכון נוסח לפי הסיכום
              </button>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-black text-[#8a7b68]">נוסח הודעת SMS</span>
              <textarea
                value={data.paymentSmsMessage}
                onChange={(e) => setField("paymentSmsMessage", e.target.value)}
                placeholder="נוסח ההודעה ללקוח"
                className="min-h-[180px] w-full rounded-2xl border border-[#eadfce] bg-white p-3 text-sm font-bold leading-7 text-[#2b241c] outline-none focus:border-[#b98121]"
              />
            </label>

            <button
              type="button"
              onClick={sendPaymentSms}
              disabled={sendingSms || saving}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#6f5a42] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#574633] disabled:opacity-60"
            >
              <Send size={17} />
              {sendingSms ? "שולח..." : "שליחת SMS ללקוח"}
            </button>
          </Card>

          <Card title="הערות תשלום" icon={<Receipt size={19} />}>
            <label className="block">
              <span className="mb-2 block text-xs font-black text-[#8a7b68]">הערות פנימיות לאולם</span>
              <textarea
                value={data.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="לדוגמה: חויבו 2 מנות ספק, עיצוב עודכן ביום האירוע, הגברה כללה מסך..."
                className="min-h-[120px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
              />
            </label>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="תשלומים נוספים לאולם" icon={<BadgeDollarSign size={19} />}>
            <div className="flex flex-wrap gap-2">
              {EXTRA_TEMPLATES.map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => addExtra(template)}
                  className="rounded-full border border-[#d9bd83] bg-[#fff8eb] px-3 py-2 text-xs font-black text-[#9f6f1a] transition hover:bg-[#fff3d8]"
                >
                  + {template}
                </button>
              ))}

              <button
                type="button"
                onClick={() => addExtra("")}
                className="rounded-full border border-[#eadfce] bg-white px-3 py-2 text-xs font-black text-[#6f6252] transition hover:bg-[#fff8eb]"
              >
                + תשלום נוסף ידני
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {data.extras.length ? (
                data.extras.map((item) => {
                  const total = n(item.quantity) * n(item.unitPrice);
                  return (
                    <div key={item.id} className="rounded-[24px] border border-[#eadfce] bg-[#fffdf8] p-4 shadow-sm">
                      <div className="grid gap-3 lg:grid-cols-[1.1fr_110px_140px_1fr_44px] lg:items-end">
                        <TextField label="סוג תשלום" value={item.title} onChange={(value) => updateExtra(item.id, "title", value)} placeholder="לדוגמה: עיצוב" />
                        <NumberField label="כמות" value={item.quantity} onChange={(value) => updateExtra(item.id, "quantity", value)} />
                        <NumberField label="מחיר יחידה" value={item.unitPrice} onChange={(value) => updateExtra(item.id, "unitPrice", value)} prefix="₪" />

                        <div>
                          <span className="mb-1 block text-xs font-black text-[#8a7b68]">סה״כ</span>
                          <div className="flex h-11 items-center rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-black text-[#2b241c]">
                            {money(total)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeExtra(item.id)}
                          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="mt-3">
                        <TextField label="הערה" value={item.notes} onChange={(value) => updateExtra(item.id, "notes", value)} placeholder="הערה פנימית / פירוט השירות" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[24px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-[#b98121] shadow-sm">
                    <Plus size={22} />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-[#2b241c]">אין עדיין תשלומים נוספים</h3>
                  <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
                    אפשר להוסיף עיצוב, תאורה, הגברה, הושבה, דיילות וכל שירות נוסף שהאולם מחייב עליו.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card title="סיכום כספי סופי" icon={<Receipt size={19} />}>
            <div className="grid gap-3 md:grid-cols-2">
              <InlineInfo label="מנות מתוכננות" value={money(summary.plannedMealTotal)} />
              <InlineInfo label="מנות בפועל" value={money(summary.actualMealTotal)} />
              <InlineInfo label="תשלומים נוספים" value={money(summary.extrasTotal)} />
              <InlineInfo label="סה״כ לחיוב" value={money(summary.finalTotal)} strong />
              <InlineInfo label="מקדמה" value={money(n(data.advancePayment))} />
              <InlineInfo label="שולם בפועל" value={money(n(data.paidAmount))} />
              <InlineInfo label="סה״כ שולם" value={money(summary.totalPaid)} />
              <InlineInfo label="נשאר לתשלום" value={money(summary.remainingToPay)} strong />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[34px] border border-[#e6dccb] bg-white shadow-[0_20px_55px_rgba(47,35,20,0.075)]">
      <div className="border-b border-[#eadfce] bg-[linear-gradient(135deg,#fffdf8,#f7efe3)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-[#eadfce] bg-white text-[#9f6f1a] shadow-sm">
            {icon}
          </div>
          <h2 className="text-xl font-black text-[#2b241c]">{title}</h2>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-[28px] border p-5 shadow-[0_12px_34px_rgba(47,35,20,0.06)]",
        highlight
          ? "border-[#d9bd83] bg-[linear-gradient(135deg,#fff8eb,#fffdf8)]"
          : "border-[#eadfce] bg-white/88",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#fff4dc] text-[#9f6f1a]">
          {icon}
        </div>
        <div className="text-left text-xs font-black text-[#8a7b68]">{subtitle}</div>
      </div>
      <div className="mt-4 text-sm font-black text-[#8a7b68]">{title}</div>
      <div className="mt-1 text-3xl font-black text-[#2b241c]">{value}</div>
    </div>
  );
}

function TopStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#eadfce] bg-[#fffdf8] p-4">
      <div className="text-[11px] font-black text-[#8a7b68]">{label}</div>
      <div className="mt-1 text-base font-black text-[#2b241c]">{value}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  prefix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#8a7b68]">{label}</span>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-black text-[#8a7b68]">
            {prefix}
          </span>
        ) : null}
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={[
            "h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#2b241c] outline-none focus:border-[#b98121]",
            prefix ? "pl-9 pr-3" : "px-3",
          ].join(" ")}
        />
      </div>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#8a7b68]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#2b241c] outline-none focus:border-[#b98121]"
      />
    </label>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-black text-[#8a7b68]">{label}</span>
      <div className="flex h-11 items-center rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-black text-[#2b241c]">
        {value}
      </div>
    </div>
  );
}

function InlineInfo({
  label,
  value,
  warn,
  strong,
}: {
  label: string;
  value: string;
  warn?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-[22px] border p-4",
        warn
          ? "border-amber-200 bg-amber-50"
          : strong
            ? "border-[#d9bd83] bg-[#fff8eb]"
            : "border-[#eadfce] bg-[#fffdf8]",
      ].join(" ")}
    >
      <div className="text-[11px] font-black text-[#8a7b68]">{label}</div>
      <div className="mt-1 text-lg font-black text-[#2b241c]">{value}</div>
    </div>
  );
}
