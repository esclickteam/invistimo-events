"use client";

import { useState } from "react";
import { trackPublicEvent } from "@/lib/seo/analytics";

const EVENT_TYPES = ["חתונה", "חינה", "בר/בת מצווה", "אירוע משפחתי", "אירוע עסקי", "אחר"];
const REGIONS = [
  "צפון",
  "חיפה והקריות",
  "שרון",
  "מרכז",
  "ירושלים והסביבה",
  "דרום",
  "עדיין לא יודעים",
];
const SERVICE_TYPES = [
  { value: "self", label: "מערכת עצמאית" },
  { value: "guidance", label: "ליווי מקצועי" },
  { value: "day_of", label: "מנהל אירוע ביום האירוע" },
  { value: "unsure", label: "עדיין לא בטוחים" },
];

export default function ContactForm({
  id = "contact",
  title = "בדיקת התאמה למנהל אירוע ולמסלולי הניהול",
  lede = "השאירו פרטים לבדיקת זמינות והתאמה — בהתאם לאזור, לתאריך ולהיקף השירות. אין הבטחת זמינות בכל אזור בלי בדיקה.",
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventType, setEventType] = useState("חתונה");
  const [eventDate, setEventDate] = useState("");
  const [region, setRegion] = useState("");
  const [venue, setVenue] = useState("");
  const [guests, setGuests] = useState("");
  const [serviceType, setServiceType] = useState("unsure");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    if (!consent) {
      setError("יש לאשר יצירת קשר לפני שליחת הפנייה.");
      setLoading(false);
      return;
    }

    const serviceLabel =
      SERVICE_TYPES.find((item) => item.value === serviceType)?.label || serviceType;

    const message = [
      "פנייה מבדיקת התאמה — עמוד ניהול אירועים",
      `טלפון: ${phone}`,
      `סוג אירוע: ${eventType}`,
      `תאריך: ${eventDate || "לא צוין"}`,
      `אזור: ${region || "לא צוין"}`,
      `אולם: ${venue || "לא צוין"}`,
      `מספר מוזמנים משוער: ${guests || "לא צוין"}`,
      `סוג שירות מבוקש: ${serviceLabel}`,
      notes ? `הערות: ${notes}` : null,
      "הסכמה ליצירת קשר: כן",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject: `בדיקת התאמה לניהול אירוע — ${serviceLabel}`,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();

      setSuccess("הפנייה נשלחה בהצלחה! ניצור קשר לבדיקת התאמה וזמינות.");
      if (!data.blocked) {
        trackPublicEvent("generate_lead", {
          method: "event_management_fit",
          page_path: window.location.pathname,
        });
      }
      setName("");
      setEmail("");
      setPhone("");
      setEventType("חתונה");
      setEventDate("");
      setRegion("");
      setVenue("");
      setGuests("");
      setServiceType("unsure");
      setNotes("");
      setConsent(false);
    } catch {
      setError("אירעה שגיאה בשליחת הפנייה. נסו שוב מאוחר יותר, או כתבו ל־support@invistimo.com.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id={id} className="mx-auto max-w-3xl px-4 py-20 md:px-6">
      <div className="text-center">
        <p className="text-sm font-black tracking-[0.14em] text-[#A67C3D]">בדיקת זמינות</p>
        <h2 className="mt-3 text-3xl font-black text-[#2C241C] md:text-4xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#5C4A3A]">{lede}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-10 space-y-5 rounded-[28px] border border-[#E6D2AA] bg-white p-6 shadow-[0_18px_40px_rgba(58,39,20,0.06)] md:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="שם מלא" required>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              autoComplete="name"
            />
          </Field>
          <Field label="טלפון" required>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              autoComplete="tel"
              inputMode="tel"
            />
          </Field>
        </div>

        <Field label="דוא״ל" required>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
            placeholder="example@email.com"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="סוג האירוע">
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className={inputClass}
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="תאריך האירוע">
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="עיר או אזור">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={inputClass}
            >
              <option value="">בחרו אזור לבדיקת זמינות</option>
              {REGIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="מספר מוזמנים משוער">
            <input
              type="number"
              min="1"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className={inputClass}
              inputMode="numeric"
            />
          </Field>
        </div>

        <Field label="אולם (אם ידוע)">
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className={inputClass}
            placeholder="שם האולם או המקום"
          />
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-[#3F3025]">סוג השירות המבוקש</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SERVICE_TYPES.map((item) => (
              <label
                key={item.value}
                className={[
                  "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold",
                  serviceType === item.value
                    ? "border-[#C7A56B] bg-[#FFF8EE] text-[#3F3025]"
                    : "border-[#E6D2AA] bg-white text-[#5C4A3A]",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="serviceType"
                  value={item.value}
                  checked={serviceType === item.value}
                  onChange={() => setServiceType(item.value)}
                  className="accent-[#A67C3D]"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="הערות נוספות">
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
            placeholder="פרטים שיעזרו לנו להבין את הצרכים"
          />
        </Field>

        <label className="flex items-start gap-3 text-sm leading-7 text-[#5C4A3A]">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 accent-[#A67C3D]"
            required
          />
          <span>
            אני מאשר/ת ל־Invistimo ליצור איתי קשר בנוגע לפנייה זו, בהתאם למדיניות הפרטיות.
          </span>
        </label>

        {success ? <Alert type="success">{success}</Alert> : null}
        {error ? <Alert type="error">{error}</Alert> : null}

        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-full bg-gradient-to-l from-[#3A2B22] via-[#5A4333] to-[#2C211B] py-3.5 text-base font-black text-white transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {loading ? "שולח..." : "שליחת פנייה לבדיקת התאמה"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#7A6042]">
        או במייל ישיר: <strong>support@invistimo.com</strong> ·{" "}
        <a
          className="font-bold underline-offset-2 hover:underline"
          href="https://wa.me/972555039072"
          data-placement="event_management"
        >
          WhatsApp
        </a>
      </p>
    </section>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#d6c7b6] bg-[#FFFDF8] px-4 py-3 text-[#3F3025] focus:outline-none focus:ring-2 focus:ring-[#c7a17a]";

function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-[#3F3025]">
        {label}
        {required ? <span className="text-[#A67C3D]"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

function Alert({ type, children }) {
  const styles =
    type === "success"
      ? "bg-green-50 border-green-200 text-green-800"
      : "bg-red-50 border-red-200 text-red-800";

  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}
