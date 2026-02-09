"use client";

import { useState, useMemo } from "react";
import {
  User,
  Mail,
  Phone,
  Users,
  PhoneCall,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const SMS_PER_RECORD = 3;

/* =========================
   Input styles (CRITICAL)
========================= */
const INPUT_CLASS = `
  w-full
  h-12
  rounded-xl
  border
  border-slate-300
  bg-white
  px-4
  pr-10
  text-sm
  outline-none
  focus:border-[#3A2B23]
  focus:ring-2
  focus:ring-[#3A2B23]/20
`;

export default function CreateClientByProducer({ onSuccess }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ חדש: סוג משתמש

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    guests: 1,
    includeCalls: false,
  });

  const pricePerRecord = user?.producerPricePerRecord || 0;

  /* =========================
     Calculations
  ========================= */
  const smsTotal = useMemo(
    () => Number(form.guests) * SMS_PER_RECORD,
    [form.guests]
  );

  const totalPrice = useMemo(
    () => Number(form.guests) * pricePerRecord,
    [form.guests, pricePerRecord]
  );

  /* =========================
     Handlers
  ========================= */
  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    setError("");

    if (!form.name || !form.email) {
      setError("נא למלא שם ואימייל");
      return;
    }

    try {
      setLoading(true);

      // =========================
      // יצירת עובד מפיק
      // =========================
      if (isStaff) {
        const res = await fetch("/api/producer/create-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone,
            // חשוב: השרת יכול לקחת מהטוקן,
            // אבל נוסיף גם בפיילוד כדי למנוע נפילות אם נדרש.
            assignedProducerId: user?._id,
            staffType: "producer_staff",
          }),
        });

        const data = await res.json();

        if (!res.ok || !data?.success) {
          throw new Error(data?.message || data?.error || "יצירת עובד נכשלה");
        }

        onSuccess?.();
        return;
      }

      // =========================
      // יצירת לקוח (לוגיקה קיימת - נשארת)
      // =========================
      if (Number(form.guests) <= 0) {
        setError("מספר רשומות חייב להיות גדול מ־0");
        return;
      }

      if (pricePerRecord <= 0) {
        setError("לא הוגדר מחיר לרשומה עבור המפיק");
        return;
      }

      const res = await fetch("/api/producer/create-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          guests: Number(form.guests),
          includeCalls: form.includeCalls,
          producerId: user?._id,

        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "יצירת לקוח נכשלה");
      }

      if (data.checkoutUrl) {
        onSuccess?.();
        window.location.href = data.checkoutUrl;
        return;
      }

      setError("לא התקבל קישור לתשלום");
    } catch (err) {
      console.error(err);
      setError(err?.message || "שגיאה כללית");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className="w-full flex justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[520px] space-y-6 text-right"
      >
       

        {/* ===== פרטי משתמש ===== */}
        <Section title={isClient ? "פרטי לקוח" : "פרטי עובד"}>
          <Field label="שם מלא" icon={<User />}>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="אימייל" icon={<Mail />}>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="טלפון (אופציונלי)" icon={<Phone />}>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className={INPUT_CLASS}
            />
          </Field>
        </Section>

        {/* ===== רק ללקוח: הגדרות מערכת ===== */}
        {isClient && (
          <Section title="הגדרות מערכת">
            <Field label="כמות רשומות" icon={<Users />}>
              <input
                type="number"
                name="guests"
                min={1}
                step={1}
                value={form.guests}
                onChange={handleChange}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="כמות הודעות SMS (אוטומטי)" icon={<MessageSquare />}>
              <input
                type="number"
                value={smsTotal}
                disabled
                className={`${INPUT_CLASS} bg-slate-100 cursor-not-allowed`}
              />
              <div className="text-xs text-gray-500 mt-1">
                {SMS_PER_RECORD} הודעות לכל רשומה
              </div>
            </Field>

            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                name="includeCalls"
                checked={form.includeCalls}
                onChange={handleChange}
              />
              <PhoneCall className="w-4 h-4 text-slate-400" />
              כולל שיחות טלפון
            </label>
          </Section>
        )}

        {/* ===== רק ללקוח: סיכום תשלום ===== */}
        {isClient && (
          <Section title="סיכום תשלום">
            {pricePerRecord > 0 ? (
              <div className="text-sm text-slate-700">
                {form.guests} רשומות × ₪{pricePerRecord} ={" "}
                <span className="font-bold text-lg">₪{totalPrice}</span>
              </div>
            ) : (
              <div className="text-sm text-red-600">
                לא הוגדר מחיר לרשומה עבור המפיק
              </div>
            )}
          </Section>
        )}

        {/* ===== רק לעובד: הודעה ===== */}
        {isStaff && (
          <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            לאחר יצירת העובד, יישלח אליו מייל להגדרת סיסמה.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || (isClient && pricePerRecord === 0)}
          className="w-full h-12 rounded-xl bg-[#3A2B23] text-white font-semibold disabled:opacity-50"
        >
          {loading
            ? isClient
              ? "מעביר לתשלום…"
              : "יוצר עובד…"
            : isClient
            ? "המשך לתשלום"
            : "יצירת עובד ושליחת מייל הגדרת סיסמה"}
        </button>
      </form>
    </div>
  );
}

/* =========================
   UI helpers
========================= */
function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold text-slate-500 border-b pb-2">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <div className="absolute right-3 inset-y-0 flex items-center text-slate-400">
            {icon}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
