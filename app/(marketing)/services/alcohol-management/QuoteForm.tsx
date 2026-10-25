"use client";

import { useState } from "react";
import { trackPublicEvent } from "@/lib/seo/analytics";

const inputClass =
  "min-h-12 w-full rounded-2xl border border-[#E6D2AA] bg-white px-4 text-base font-semibold text-[#2C241C] outline-none transition focus:border-[#C9A45C] focus:ring-2 focus:ring-[#C9A45C]/30";

export default function QuoteForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [eventType, setEventType] = useState("חתונה");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [guests, setGuests] = useState("");
  const [bars, setBars] = useState("");
  const [tablesAlcohol, setTablesAlcohol] = useState("לא בטוחים");
  const [bottlesEstimate, setBottlesEstimate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildMessage() {
    return [
      "בקשה להצעת מחיר — ניהול אלכוהול באירוע",
      `שם: ${name}`,
      `טלפון: ${phone}`,
      email ? `אימייל: ${email}` : null,
      `סוג אירוע: ${eventType}`,
      eventDate ? `תאריך: ${eventDate}` : null,
      venue ? `מיקום/אולם: ${venue}` : null,
      guests ? `אורחים משוער: ${guests}` : null,
      bars ? `מספר ברים: ${bars}` : null,
      `חלוקה לשולחנות: ${tablesAlcohol}`,
      bottlesEstimate ? `כמות בקבוקים משוערת: ${bottlesEstimate}` : null,
      notes ? `הערות: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const message = buildMessage();
    const subject = "הצעת מחיר — ניהול אלכוהול";

    try {
      if (email.trim()) {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email: email.trim(),
            subject,
            message,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error("send failed");
        trackPublicEvent("generate_lead", { method: "alcohol_management_quote" });
        setSuccess(true);
      } else {
        const wa = `https://wa.me/972555039072?text=${encodeURIComponent(message)}`;
        window.open(wa, "_blank", "noopener,noreferrer");
        trackPublicEvent("generate_lead", { method: "alcohol_management_whatsapp" });
        setSuccess(true);
      }
    } catch {
      setError("השליחה לא הושלמה. אפשר לנסות שוב או לפנות בוואטסאפ.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        id="quote"
        className="scroll-mt-24 rounded-[28px] border border-[#C9A45C]/50 bg-[#FFF8EA] p-6 text-center md:p-8"
      >
        <p className="text-xl font-black text-[#2C241C]">הפנייה נקלטה</p>
        <p className="mt-3 text-base leading-7 text-[#5C4A3A]">
          תודה. נחזור אליכם עם הצעת מחיר מותאמת לפרטי האירוע.
        </p>
      </div>
    );
  }

  return (
    <form
      id="quote"
      onSubmit={onSubmit}
      className="scroll-mt-24 rounded-[28px] border border-[#E6D2AA] bg-white p-5 shadow-[0_18px_40px_rgba(95,68,34,0.08)] md:p-8"
    >
      <h3 className="text-2xl font-black text-[#2C241C]">בקשת הצעת מחיר</h3>
      <p className="mt-2 text-sm leading-6 text-[#7A6042]">
        מלאו מה שידוע כבר. שדות שאינכם יודעים עדיין אפשר להשאיר ריקים.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          שם מלא *
          <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          טלפון *
          <input required inputMode="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735] sm:col-span-2">
          אימייל (אופציונלי)
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="אם תזינו — נשלח דרך טופס יצירת הקשר"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          סוג האירוע
          <select className={inputClass} value={eventType} onChange={(e) => setEventType(e.target.value)}>
            <option>חתונה</option>
            <option>בר/בת מצווה</option>
            <option>אירוע חברה</option>
            <option>יום הולדת</option>
            <option>אחר</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          תאריך האירוע
          <input type="date" className={inputClass} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          אולם או מיקום
          <input className={inputClass} value={venue} onChange={(e) => setVenue(e.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          מספר אורחים משוער
          <input inputMode="numeric" className={inputClass} value={guests} onChange={(e) => setGuests(e.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          מספר ברים
          <input inputMode="numeric" className={inputClass} value={bars} onChange={(e) => setBars(e.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735]">
          חלוקת בקבוקים לשולחנות?
          <select
            className={inputClass}
            value={tablesAlcohol}
            onChange={(e) => setTablesAlcohol(e.target.value)}
          >
            <option>כן</option>
            <option>לא</option>
            <option>לא בטוחים</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735] sm:col-span-2">
          כמות בקבוקים משוערת (אם ידועה)
          <input
            className={inputClass}
            value={bottlesEstimate}
            onChange={(e) => setBottlesEstimate(e.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#5E4735] sm:col-span-2">
          הערות
          <textarea
            className={`${inputClass} min-h-28 py-3`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm font-bold text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] px-8 text-base font-black text-white disabled:opacity-60 sm:w-auto"
      >
        {loading ? "שולחים…" : "לקבלת הצעת מחיר מותאמת לאירוע"}
      </button>
    </form>
  );
}
