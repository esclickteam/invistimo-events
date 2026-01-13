"use client";

import { useState } from "react";

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

          // חבילת פרימיום – בדיוק כמו הרשמה רגילה
          plan: "premium",
          maxGuests: Number(form.maxGuests),
          includeCalls: form.includeCalls,

          createdByProducer: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "יצירת משתמש נכשלה");
      }

      // ✅ הצלחה – מחזירים שליטה לדשבורד
      onSuccess?.();

      // ניקוי טופס (אופציונלי אבל מומלץ)
      setForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        maxGuests: 100,
        includeCalls: false,
      });
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
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 12 }}>יצירת לקוח חדש</h2>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="text"
          name="fullName"
          placeholder="שם מלא"
          value={form.fullName}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="אימייל"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          type="tel"
          name="phone"
          placeholder="טלפון"
          value={form.phone}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="סיסמה"
          value={form.password}
          onChange={handleChange}
          required
        />

        <select
          name="maxGuests"
          value={form.maxGuests}
          onChange={handleChange}
        >
          <option value={100}>עד 100 אורחים</option>
          <option value={200}>עד 200 אורחים</option>
          <option value={300}>עד 300 אורחים</option>
          <option value={400}>עד 400 אורחים</option>
          <option value={500}>עד 500 אורחים</option>
          <option value={600}>עד 600 אורחים</option>
          <option value={700}>עד 700 אורחים</option>
          <option value={800}>עד 800 אורחים</option>
          <option value={1000}>עד 1000 אורחים</option>
        </select>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            name="includeCalls"
            checked={form.includeCalls}
            onChange={handleChange}
          />
          כולל שיחות טלפון
        </label>

        {error && (
          <div style={{ color: "red", fontSize: 14 }}>{error}</div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "יוצר משתמש..." : "צור לקוח"}
        </button>
      </form>
    </div>
  );
}
