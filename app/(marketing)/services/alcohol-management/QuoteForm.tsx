"use client";

import { useState } from "react";

const fieldClass =
  "min-h-12 w-full rounded-2xl border border-[#E6D2AA] bg-white px-4 text-base font-semibold text-[#2C241C] outline-none transition focus:border-[#C9A45C] focus:ring-2 focus:ring-[#C9A45C]/30";

type Status = "idle" | "loading" | "success" | "error";

export default function AlcoholQuoteForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || ""),
      phone: String(data.get("phone") || ""),
      eventType: String(data.get("eventType") || ""),
      eventDate: String(data.get("eventDate") || ""),
      venue: String(data.get("venue") || ""),
      guests: String(data.get("guests") || ""),
      bars: String(data.get("bars") || ""),
      tableBottles: String(data.get("tableBottles") || ""),
      bottleEstimate: String(data.get("bottleEstimate") || ""),
      notes: String(data.get("notes") || ""),
    };

    try {
      const res = await fetch("/api/services/alcohol-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error("send_failed");
      }
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setError("לא הצלחנו לשלוח את הפנייה. אפשר לנסות שוב או ליצור קשר בטלפון.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-[28px] border border-[#C9A45C]/50 bg-[#FFF8EA] px-6 py-8 text-center">
        <p className="text-xl font-black text-[#2C241C]">הפנייה התקבלה</p>
        <p className="mt-3 text-[15px] leading-7 text-[#5C4A3A]">
          תודה. נחזור אליכם עם הצעת מחיר מותאמת לפרטי האירוע.
        </p>
        <button
          type="button"
          className="mt-6 rounded-full border border-[#DCC7A6] bg-white px-6 py-3 text-sm font-black text-[#5E4735]"
          onClick={() => setStatus("idle")}
        >
          שליחת פנייה נוספת
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          שם מלא *
          <input name="name" required autoComplete="name" className={fieldClass} />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          טלפון *
          <input
            name="phone"
            required
            inputMode="tel"
            autoComplete="tel"
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          סוג האירוע
          <select name="eventType" className={fieldClass} defaultValue="">
            <option value="">בחירה (אופציונלי)</option>
            <option value="חתונה">חתונה</option>
            <option value="חינה">חינה</option>
            <option value="בר/בת מצווה">בר / בת מצווה</option>
            <option value="אירוע אחר">אירוע אחר</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          תאריך האירוע
          <input name="eventDate" type="date" className={fieldClass} />
        </label>
      </div>

      <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
        אולם או מיקום
        <input name="venue" className={fieldClass} />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          מספר אורחים משוער
          <input name="guests" inputMode="numeric" className={fieldClass} />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          מספר ברים
          <input name="bars" inputMode="numeric" className={fieldClass} />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          חלוקה לשולחנות?
          <select name="tableBottles" className={fieldClass} defaultValue="">
            <option value="">עדיין לא יודעים</option>
            <option value="כן">כן</option>
            <option value="לא">לא</option>
          </select>
        </label>
      </div>

      <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
        כמות בקבוקים משוערת (אם ידועה)
        <input name="bottleEstimate" className={fieldClass} />
      </label>

      <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
        הערות
        <textarea name="notes" rows={4} className={`${fieldClass} min-h-[7rem] py-3`} />
      </label>

      <p className="text-xs leading-5 text-[#8A6B45]">
        אין חובה למלא שדות שעדיין לא ידועים. מספר אנשי הצוות והמחיר ייקבעו לפי פרטי האירוע.
      </p>

      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-l from-[#1A1410] via-[#3A2B22] to-[#5A4333] px-8 py-3.5 text-base font-black text-white transition hover:-translate-y-0.5 disabled:opacity-60"
      >
        {status === "loading" ? "שולחים…" : "לקבלת הצעת מחיר מותאמת לאירוע"}
      </button>
    </form>
  );
}
