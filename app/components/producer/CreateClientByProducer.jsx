"use client";

import { useState, useMemo } from "react";
import { User, Mail, Phone, Users, PhoneCall, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const SMS_PER_RECORD = 3;

export default function CreateClientByProducer({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    guests: 1, // ⭐ מספר רשומות חופשי
    includeCalls: false,
  });

  const { user } = useAuth();

  const pricePerRecord = user?.producerPricePerRecord || 0;

  // 🔢 חישובים אוטומטיים
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
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "יצירת לקוח נכשלה");
      }

      if (data.checkoutUrl) {
        onSuccess?.();
        window.location.href = data.checkoutUrl;
        return;
      }

      setError("לא התקבל קישור לתשלום");
    } catch (err) {
      console.error(err);
      setError(err.message || "שגיאה כללית");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Render
  ========================= */
  return (
    <div className="w-full flex justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[520px] space-y-5 text-right"
      >
        {/* Name */}
        <Field label="שם מלא" icon={<User />}>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="input"
          />
        </Field>

        {/* Email */}
        <Field label="אימייל" icon={<Mail />}>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="input"
          />
        </Field>

        {/* Phone */}
        <Field label="טלפון" icon={<Phone />}>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="input"
          />
        </Field>

        {/* Records */}
        <Field label="כמות רשומות" icon={<Users />}>
          <input
            type="number"
            name="guests"
            min={1}
            step={1}
            value={form.guests}
            onChange={handleChange}
            className="input"
          />
        </Field>

        {/* SMS – אוטומטי */}
        <Field label="כמות הודעות SMS (אוטומטי)" icon={<MessageSquare />}>
          <input
            type="number"
            value={smsTotal}
            disabled
            className="input bg-gray-100 cursor-not-allowed"
          />
          <div className="text-xs text-gray-500 mt-1">
            מחושב אוטומטית: {SMS_PER_RECORD} הודעות לכל רשומה
          </div>
        </Field>

        {/* Price */}
        <div className="text-sm text-slate-700">
          {pricePerRecord > 0 ? (
            <>
              {form.guests} רשומות × ₪{pricePerRecord} ={" "}
              <span className="font-semibold">₪{totalPrice}</span>
            </>
          ) : (
            <span className="text-red-600">
              לא הוגדר מחיר לרשומה עבור המפיק
            </span>
          )}
        </div>

        {/* Calls */}
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

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || pricePerRecord === 0}
          className="w-full h-12 mt-6 rounded-xl bg-[#3A2B23] text-white font-semibold disabled:opacity-50"
        >
          {loading ? "מעביר לתשלום…" : "המשך לתשלום"}
        </button>
      </form>
    </div>
  );
}

/* =========================
   Small UI helper
========================= */
function Field({ label, icon, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
          {icon}
        </div>
        {children}
      </div>
    </div>
  );
}
