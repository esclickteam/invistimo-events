"use client";

import { useState } from "react";
import { User, Mail, Phone } from "lucide-react";

export default function CreateStaffByProducer({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/producer/create-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          staffType: "producer_staff",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "שגיאה ביצירת עובד");
      }

      alert("העובד נוצר בהצלחה ונשלח אליו מייל להגדרת סיסמה");
      onSuccess?.();
    } catch (err) {
      setError(err?.message || "שגיאה ביצירת עובד");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2">שם מלא</label>
        <div className="relative">
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            className="w-full border rounded-xl px-4 py-3 pr-10"
            placeholder="הכנס שם מלא"
          />
          <User className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">אימייל</label>
        <div className="relative">
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            className="w-full border rounded-xl px-4 py-3 pr-10"
            placeholder="name@example.com"
          />
          <Mail className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">טלפון (אופציונלי)</label>
        <div className="relative">
          <input
            type="text"
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            className="w-full border rounded-xl px-4 py-3 pr-10"
            placeholder="05X-XXXXXXX"
          />
          <Phone className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#3b2a22] hover:bg-[#2f211a] text-white rounded-xl py-3 font-semibold disabled:opacity-60"
      >
        {loading ? "יוצר עובד..." : "יצירת עובד ושליחת מייל הגדרת סיסמה"}
      </button>
    </form>
  );
}
