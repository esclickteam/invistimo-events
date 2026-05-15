"use client";

import { useState, useMemo } from "react";
import {
  User,
  Mail,
  Phone,
  Users,
  PhoneCall,
  MessageSquare,
  Crown,
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const SMS_PER_RECORD = 3;

/* =========================
   UI CONST
========================= */
const INPUT_CLASS = `
  w-full
  h-12
  rounded-2xl
  border
  border-[#E8DED1]
  bg-white/90
  px-4
  pr-11
  text-sm
  text-[#3A2B23]
  outline-none
  shadow-[0_8px_22px_rgba(65,45,30,0.04)]
  transition
  placeholder:text-[#B6A79A]
  focus:border-[#B99563]
  focus:ring-4
  focus:ring-[#D8B982]/20
`;

export default function CreateClientByProducer({ onSuccess }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    () => Number(form.guests || 0) * SMS_PER_RECORD,
    [form.guests]
  );

  const totalPrice = useMemo(
    () => Number(form.guests || 0) * pricePerRecord,
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

    if (Number(form.guests) <= 0) {
      setError("מספר רשומות חייב להיות גדול מ־0");
      return;
    }

    if (pricePerRecord <= 0) {
      setError("לא הוגדר מחיר לרשומה עבור המפיק");
      return;
    }

    try {
      setLoading(true);

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
    <div dir="rtl" className="w-full">
      <form onSubmit={handleSubmit} className="w-full space-y-6 text-right">
        {/* Header */}
        <div className="relative overflow-hidden rounded-[30px] border border-[#E8DED1] bg-gradient-to-br from-[#FFFDF8] via-[#FBF3E8] to-[#F2E5D5] p-5 shadow-[0_20px_55px_rgba(58,43,35,0.10)]">
          <div className="absolute -left-16 -top-16 h-36 w-36 rounded-full bg-[#D8B982]/25 blur-2xl" />
          <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[#B99563]/20 blur-2xl" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3A2B23] text-white shadow-[0_12px_30px_rgba(58,43,35,0.22)]">
              <Crown className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-[#2F241D]">
                  יצירת משתמש חדש
                </h2>
                <Sparkles className="h-4 w-4 text-[#B99563]" />
              </div>

              <p className="mt-1 max-w-[420px] text-sm leading-6 text-[#7A6758]">
                יצירת לקוח חדש למערכת, הגדרת כמות רשומות והמשך לתשלום מאובטח.
              </p>
            </div>
          </div>
        </div>

        {/* פרטי לקוח */}
        <Section
          title="פרטי לקוח"
          subtitle="הפרטים הבסיסיים לפתיחת המשתמש במערכת"
          icon={<User />}
        >
          <Field label="שם מלא" icon={<User />}>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="לדוגמה: שיר כהן"
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
              placeholder="client@email.com"
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="טלפון אופציונלי" icon={<Phone />}>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="050-0000000"
              className={INPUT_CLASS}
            />
          </Field>
        </Section>

        {/* הגדרות מערכת */}
        <Section
          title="הגדרות מערכת"
          subtitle="כמות הרשומות וההודעות שייפתחו ללקוח"
          icon={<Users />}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <Field label="כמות הודעות SMS" icon={<MessageSquare />}>
              <input
                type="number"
                value={smsTotal}
                disabled
                className={`${INPUT_CLASS} cursor-not-allowed bg-[#F7F0E7] text-[#7A6758]`}
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-[#E8DED1] bg-[#FFF9F0] px-4 py-3 text-xs leading-5 text-[#7A6758]">
            <span className="font-bold text-[#3A2B23]">{SMS_PER_RECORD}</span>{" "}
            הודעות SMS מחושבות אוטומטית לכל רשומה.
          </div>

          <label
            className={`
              flex cursor-pointer items-center justify-between gap-4
              rounded-2xl border border-[#E8DED1]
              bg-white/85 px-4 py-4
              shadow-[0_10px_28px_rgba(65,45,30,0.05)]
              transition hover:border-[#D8B982] hover:bg-[#FFF9F0]
            `}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4E8D8] text-[#8A6338]">
                <PhoneCall className="h-4 w-4" />
              </div>

              <div>
                <div className="text-sm font-bold text-[#3A2B23]">
                  כולל שיחות טלפון
                </div>
                <div className="text-xs text-[#8B7B70]">
                  סימון אופציונלי בהתאם לחבילת השירות
                </div>
              </div>
            </div>

            <input
              type="checkbox"
              name="includeCalls"
              checked={form.includeCalls}
              onChange={handleChange}
              className="h-5 w-5 accent-[#3A2B23]"
            />
          </label>
        </Section>

        {/* סיכום תשלום */}
        <section className="overflow-hidden rounded-[28px] border border-[#DCC7A7] bg-gradient-to-br from-[#3A2B23] via-[#463226] to-[#2B201A] shadow-[0_24px_60px_rgba(58,43,35,0.20)]">
          <div className="relative p-5">
            <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-[#D8B982]/20 blur-2xl" />
            <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[#F4DFC0]">
                  <CreditCard className="h-4 w-4" />
                  <h3 className="text-sm font-bold">סיכום תשלום</h3>
                </div>

                {pricePerRecord > 0 ? (
                  <div className="mt-4">
                    <div className="text-sm text-[#EBDDCB]">
                      {form.guests} רשומות × ₪{pricePerRecord} לרשומה
                    </div>

                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-4xl font-black text-white">
                        ₪{totalPrice}
                      </span>
                      <span className="pb-1 text-xs text-[#D9C6AE]">
                        לתשלום
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    לא הוגדר מחיר לרשומה עבור המפיק
                  </div>
                )}
              </div>

              {pricePerRecord > 0 && (
                <div className="hidden rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center sm:block">
                  <div className="text-xs text-[#D9C6AE]">מחיר לרשומה</div>
                  <div className="mt-1 text-lg font-black text-white">
                    ₪{pricePerRecord}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || pricePerRecord === 0}
          className={`
            group relative h-13 w-full overflow-hidden rounded-2xl
            bg-[#3A2B23] px-5 py-4
            text-sm font-black text-white
            shadow-[0_18px_40px_rgba(58,43,35,0.22)]
            transition
            hover:-translate-y-0.5 hover:bg-[#2E211A]
            disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0
          `}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition group-hover:opacity-100" />

          <span className="relative flex items-center justify-center gap-2">
            {loading ? (
              "מעביר לתשלום…"
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                המשך לתשלום
              </>
            )}
          </span>
        </button>
      </form>
    </div>
  );
}

/* =========================
   UI helpers
========================= */
function Section({ title, subtitle, icon, children }) {
  return (
    <section className="rounded-[28px] border border-[#E8DED1] bg-white/90 p-5 shadow-[0_18px_45px_rgba(65,45,30,0.07)]">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4E8D8] text-[#8A6338]">
          {icon}
        </div>

        <div>
          <h3 className="text-base font-black text-[#3A2B23]">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-[#8B7B70]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-[#4A382D]">
        {label}
      </label>

      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-center text-[#A89583]">
            <div className="h-4 w-4">{icon}</div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}