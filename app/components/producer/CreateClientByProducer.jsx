"use client";

import { useState } from "react";
import { User, Mail, Phone, Lock, Users, PhoneCall } from "lucide-react";

export default function CreateClientByProducer({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    maxGuests: 100,
    includeCalls: false,
  });

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

    try {
      setLoading(true);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          plan: "premium",
          maxGuests: Number(form.maxGuests),
          includeCalls: form.includeCalls,
          createdByProducer: true,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.error || "יצירת משתמש נכשלה");
      }

      onSuccess?.();

      setForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        maxGuests: 100,
        includeCalls: false,
      });
    } catch (err) {
      setError(err?.message || "שגיאה כללית");
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
        className="
          w-full
          max-w-[520px]
          space-y-5
          text-right
        "
      >
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            שם מלא
          </label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              required
              className="w-full pr-10 pl-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[var(--brand-purple)] focus:border-[var(--brand-purple)] outline-none"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            אימייל
          </label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full pr-10 pl-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[var(--brand-purple)] focus:border-[var(--brand-purple)] outline-none"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            טלפון
          </label>
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
              className="w-full pr-10 pl-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[var(--brand-purple)] focus:border-[var(--brand-purple)] outline-none"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            סיסמה
          </label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full pr-10 pl-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[var(--brand-purple)] focus:border-[var(--brand-purple)] outline-none"
            />
          </div>
        </div>

        {/* Max Guests */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            כמות אורחים
          </label>
          <div className="relative">
            <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              name="maxGuests"
              value={form.maxGuests}
              onChange={handleChange}
              className="w-full pr-10 pl-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-[var(--brand-purple)] outline-none"
            >
              {[100, 200, 300, 400, 500, 600, 700, 800, 1000].map((n) => (
                <option key={n} value={n}>
                  עד {n} אורחים
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Include Calls */}
        <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            name="includeCalls"
            checked={form.includeCalls}
            onChange={handleChange}
            className="w-4 h-4 rounded border-slate-300 text-[var(--brand-purple)] focus:ring-[var(--brand-purple)]"
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
          disabled={loading}
          className="
            w-full
            h-12
            mt-6
            rounded-xl
            bg-[#3A2B23]
            text-white
            text-base
            font-semibold
            border
            border-[#3A2B23]
            shadow-lg
            hover:bg-[#2E221B]
            focus:outline-none
            focus:ring-2
            focus:ring-[#3A2B23]
            focus:ring-offset-2
            disabled:opacity-80
            disabled:cursor-not-allowed
          "
        >
          {loading ? "יוצר לקוח…" : "צור לקוח"}
        </button>
      </form>
    </div>
  );
}
