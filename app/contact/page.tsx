"use client";

import { FormEvent, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Frank_Ruhl_Libre } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import { trackPublicEvent } from "@/lib/seo/analytics";
import {
  BUSINESS_HOURS,
  CONTACT_DIRECT_ANSWER,
  CONTACT_EMAIL,
  CONTACT_FAQS,
  HERO_IMAGE,
  QUICK_HELP_LINKS,
  WHATSAPP_URL,
} from "./contactContent";

const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-contact-display",
});

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16.02 5C10.05 5 5.22 9.83 5.22 15.8C5.22 17.71 5.72 19.58 6.67 21.23L5 27L10.93 25.45C12.49 26.3 14.24 26.75 16.02 26.75C21.99 26.75 26.82 21.92 26.82 15.95C26.82 9.98 21.99 5 16.02 5Z"
        fill="currentColor"
      />
      <path
        d="M13.14 11.15C12.86 10.53 12.57 10.52 12.31 10.51C12.1 10.5 11.86 10.5 11.62 10.5C11.38 10.5 10.98 10.59 10.64 10.96C10.3 11.34 9.35 12.2 9.35 13.95C9.35 15.7 10.67 17.39 10.85 17.63C11.03 17.87 13.27 21.47 16.78 22.84C19.69 23.98 20.29 23.75 20.93 23.69C21.57 23.63 22.99 22.84 23.28 22.05C23.57 21.26 23.57 20.58 23.48 20.43C23.39 20.28 23.14 20.19 22.77 20.01C22.41 19.83 20.59 18.93 20.26 18.81C19.93 18.69 19.69 18.63 19.45 18.99C19.21 19.35 18.54 20.13 18.33 20.37C18.12 20.61 17.9 20.64 17.54 20.46C17.17 20.28 15.98 19.9 14.56 18.63C13.45 17.64 12.69 16.42 12.48 16.06C12.27 15.7 12.46 15.51 12.64 15.33C12.8 15.17 13 14.91 13.18 14.7C13.36 14.49 13.42 14.34 13.54 14.1C13.66 13.86 13.6 13.65 13.51 13.47C13.42 13.29 12.76 11.52 13.14 11.15Z"
        fill="#FFFDF8"
      />
    </svg>
  );
}

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10.5 3.5L6 8l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 8v4.5l3 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 12.5l2.5 2.5L16 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const fieldClass =
  "w-full rounded-lg border border-[#E0D0B8] bg-[#FFFCFA] px-3.5 py-2.5 text-[15px] text-[#2C2118] outline-none transition placeholder:text-[#A8947E] focus:border-[#C4A46A] focus:bg-white focus:ring-2 focus:ring-[#D4B27A]/25";

const labelClass = "text-[13px] font-bold text-[#4A3728]";

export default function ContactPage() {
  const reduceMotion = useReducedMotion();
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Avoid opacity:0 on first paint (hurts LCP / causes blank flash before hydration).
  const motionProps = reduceMotion
    ? {}
    : {
        initial: false as const,
        whileInView: "show" as const,
        viewport: { once: true, amount: 0.15 },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
        variants: fadeUp,
      };

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "נא למלא שם מלא";
    if (!email.trim()) next.email = "נא למלא כתובת דוא״ל";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "כתובת הדוא״ל אינה תקינה";
    }
    if (!message.trim()) next.message = "נא לכתוב את תוכן הפנייה";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error("שליחת ההודעה נכשלה");
      }
      setSubmitted(true);
      trackPublicEvent("generate_lead", {
        method: "contact",
        page_path: window.location.pathname,
      });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setFieldErrors({});
    } catch (err) {
      console.error("Contact error:", err);
      setError("אירעה שגיאה בעת שליחת הפנייה. אנא נסו שוב מאוחר יותר.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSubmitted(false);
    setError(null);
    setFieldErrors({});
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  function scrollToForm() {
    const el = document.getElementById("contact-form");
    el?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  return (
    <main
      dir="rtl"
      className={`${display.variable} relative overflow-hidden bg-[#F8F3EA] text-[#2C2118]`}
    >
      {/* Atmosphere — soft texture, not flat */}
      <div
        className="pointer-events-none absolute inset-0 -z-20 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-30 bg-[radial-gradient(ellipse_at_top,#FFFCF7_0%,#F8F3EA_48%,#F0E6D6_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-32 left-[12%] h-72 w-72 rounded-full bg-[#D8B98D]/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-[40%] right-[-5%] h-80 w-80 rounded-full bg-[#C9B09A]/10 blur-3xl"
        aria-hidden
      />

      {/* ===== HERO — compact editorial ===== */}
      <section className="relative mx-auto max-w-6xl px-5 pb-4 pt-8 md:px-8 md:pb-5 md:pt-10">
        <div className="grid items-center gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
          <div className="order-1">
            <p className="font-[family-name:var(--font-contact-display)] text-[11px] font-medium tracking-[0.28em] text-[#8A6A3E] sm:text-xs">
              INVISTIMO&nbsp;&nbsp;/&nbsp;&nbsp;GET IN TOUCH
            </p>

            <h1
              className={`${display.className} mt-3 max-w-[18ch] text-[1.75rem] font-medium leading-[1.22] text-[#2C2118] sm:text-[2.15rem] md:text-[2.4rem]`}
            >
              יש דברים שפשוט כיף לתכנן יחד.
            </h1>

            <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#6B5745]">
              שאלה על ההזמנה, אישורי ההגעה, ההושבה או השירותים שלנו? אנחנו כאן כדי להפוך את הדרך
              לאירוע שלכם לפשוטה ונעימה יותר.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-placement="contact_hero"
                className="group inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full bg-[#2C2118] px-6 py-2.5 text-[15px] font-bold text-white transition hover:-translate-y-px hover:bg-[#3D2E22] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4A46A]"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#25D366] text-white">
                  <WhatsAppIcon className="h-3.5 w-3.5" />
                </span>
                דברו איתנו ב־WhatsApp
              </a>
              <button
                type="button"
                onClick={scrollToForm}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#D4C0A0] bg-[#FFFDF8]/80 px-6 py-2.5 text-[15px] font-bold text-[#2C2118] backdrop-blur transition hover:-translate-y-px hover:border-[#C4A46A] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4A46A]"
              >
                שלחו לנו פנייה
              </button>
            </div>
          </div>

          {/* Editorial image — desktop right / mobile after CTAs, compact */}
          <div className="order-2 mx-auto hidden w-full max-w-[240px] sm:block sm:max-w-[260px] lg:mx-0 lg:max-w-[300px]">
            <figure className="relative">
              <div
                className="absolute -inset-1.5 rounded-[2px] border border-[#C9A46A]/45"
                aria-hidden
              />
              <div className="relative aspect-[4/5] overflow-hidden bg-[#EDE3D4]">
                <Image
                  src={HERO_IMAGE.src}
                  alt={HERO_IMAGE.alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 240px, 300px"
                  className={`object-cover object-center ${
                    reduceMotion
                      ? ""
                      : "motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:hover:scale-[1.03]"
                  }`}
                />
              </div>
              <figcaption className="mt-2 text-center font-[family-name:var(--font-contact-display)] text-[10px] tracking-[0.18em] text-[#9A8164] lg:text-start">
                Every detail begins here
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ===== Editorial signature — WOW ===== */}
      <section className="relative mx-auto max-w-6xl px-5 py-4 md:px-8 md:py-5" aria-label="חתימה עריכתית">
        <motion.div
          {...motionProps}
          className="flex flex-col items-start gap-3 border-y border-[#E2D2B8]/80 py-4 sm:flex-row sm:items-center sm:gap-6 sm:py-5"
        >
          <span
            className={`${display.className} text-[12px] tracking-[0.2em] text-[#C4A46A]`}
            aria-hidden
          >
            01
          </span>
          <div className="hidden h-px w-8 shrink-0 bg-[#C4A46A] sm:block" aria-hidden />
          <p
            className={`${display.className} max-w-3xl text-base font-medium leading-relaxed text-[#4A3728] sm:text-lg md:text-xl`}
          >
            Every beautiful celebration begins with a conversation.
          </p>
        </motion.div>
      </section>

      {/* ===== Contact composition — form + rail (starts in first desktop viewport) ===== */}
      <section className="relative mx-auto max-w-6xl px-5 pb-14 pt-5 md:px-8 md:pb-16 md:pt-6">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_0.85fr] lg:gap-12 lg:items-start">
          {/* Form column */}
          <motion.div {...motionProps} id="contact-form" className="scroll-mt-28">
            <div className="rounded-2xl border border-[#E4D4BC] bg-[#FFFCFA] p-5 shadow-[0_18px_48px_rgba(70,48,28,0.06)] sm:p-7 md:p-8">
              {submitted ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex min-h-[320px] flex-col items-center justify-center py-10 text-center"
                >
                  <span className="text-[#8A6A3E]">
                    <CheckIcon />
                  </span>
                  <h2 className={`${display.className} mt-4 text-2xl font-medium text-[#2C2118] sm:text-[1.75rem]`}>
                    הפנייה שלכם התקבלה בהצלחה
                  </h2>
                  <p className="mt-3 max-w-md text-[15px] leading-7 text-[#6B5745]">
                    תודה שפניתם ל־Invistimo. נחזור אליכם בהקדם האפשרי.
                  </p>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full border border-[#D4C0A0] bg-white px-6 py-2.5 text-[15px] font-bold text-[#2C2118] transition hover:-translate-y-px hover:border-[#C4A46A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4A46A]"
                  >
                    שליחת פנייה נוספת
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className={`${display.className} text-2xl font-medium text-[#2C2118] sm:text-[1.75rem]`}>
                      ספרו לנו איך אפשר לעזור
                    </h2>
                    <p className="mt-2 text-[15px] leading-7 text-[#6B5745]">
                      נשמח לשמוע מכם ולחזור אליכם דרך כתובת הדוא״ל שתשאירו.
                    </p>
                  </div>

                  <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`${formId}-name`} className={labelClass}>
                          שם מלא
                        </label>
                        <input
                          ref={nameRef}
                          id={`${formId}-name`}
                          name="name"
                          type="text"
                          autoComplete="name"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          aria-invalid={Boolean(fieldErrors.name)}
                          aria-describedby={fieldErrors.name ? `${formId}-name-err` : undefined}
                          className={fieldClass}
                          placeholder="שם פרטי ומשפחה"
                        />
                        {fieldErrors.name ? (
                          <p id={`${formId}-name-err`} className="text-xs font-semibold text-[#9B3B2E]">
                            {fieldErrors.name}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`${formId}-email`} className={labelClass}>
                          דוא״ל
                        </label>
                        <input
                          id={`${formId}-email`}
                          name="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          dir="ltr"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          aria-invalid={Boolean(fieldErrors.email)}
                          aria-describedby={
                            fieldErrors.email ? `${formId}-email-err` : `${formId}-email-hint`
                          }
                          className={`${fieldClass} text-start`}
                          placeholder="name@email.com"
                        />
                        {fieldErrors.email ? (
                          <p id={`${formId}-email-err`} className="text-xs font-semibold text-[#9B3B2E]">
                            {fieldErrors.email}
                          </p>
                        ) : (
                          <p id={`${formId}-email-hint`} className="text-xs text-[#9A8164]">
                            מענה יינתן לכתובת זו
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`${formId}-subject`} className={labelClass}>
                        נושא הפנייה
                      </label>
                      <input
                        id={`${formId}-subject`}
                        name="subject"
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className={fieldClass}
                        placeholder="לדוגמה: חבילות, אישורי הגעה, תשלום"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`${formId}-message`} className={labelClass}>
                        הודעה
                      </label>
                      <textarea
                        id={`${formId}-message`}
                        name="message"
                        rows={5}
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        aria-invalid={Boolean(fieldErrors.message)}
                        aria-describedby={fieldErrors.message ? `${formId}-message-err` : undefined}
                        className={`${fieldClass} resize-y min-h-[120px]`}
                        placeholder="כתבו כאן את הפנייה שלכם..."
                      />
                      {fieldErrors.message ? (
                        <p id={`${formId}-message-err`} className="text-xs font-semibold text-[#9B3B2E]">
                          {fieldErrors.message}
                        </p>
                      ) : null}
                    </div>

                    {error ? (
                      <div
                        role="alert"
                        className="rounded-lg border border-[#E8B4AC] bg-[#FDF2F0] px-4 py-3 text-sm font-semibold text-[#8B2E24]"
                      >
                        {error}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={loading}
                      className="group mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#3A2A1C] px-6 py-2.5 text-[15px] font-bold text-white transition hover:-translate-y-px hover:bg-[#4A3728] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4A46A] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
                    >
                      {loading ? (
                        "שולחים..."
                      ) : (
                        <>
                          שליחת הפנייה
                          <span className="transition-transform group-hover:-translate-x-0.5" aria-hidden>
                            <ArrowIcon />
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>

          {/* Direct contact rail — not stacked cards */}
          <motion.aside
            {...motionProps}
            transition={reduceMotion ? undefined : { duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="lg:sticky lg:top-28"
            aria-label="פרטי קשר ישירים"
          >
            <div className="border border-[#E4D4BC] bg-[#FFF9F2]/70 px-5 py-6 sm:px-6">
              {/* WhatsApp */}
              <div>
                <div className="flex items-center gap-2 text-[#25D366]">
                  <WhatsAppIcon className="h-4 w-4" />
                  <span className="text-[11px] font-black tracking-[0.14em] text-[#8A6A3E]">
                    WHATSAPP
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-black text-[#2C2118]">מעדיפים לדבר איתנו?</h2>
                <p className="mt-2 text-sm leading-6 text-[#6B5745]">
                  מענה מהיר לשאלות על חבילות, הרשמה, אישורי הגעה והושבה.
                </p>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-placement="contact_aside"
                  className="mt-4 inline-flex min-h-10 items-center gap-2 border-b border-[#2C2118] pb-0.5 text-sm font-bold text-[#2C2118] transition hover:border-[#C4A46A] hover:text-[#5A4330] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4A46A]"
                >
                  <span className="inline-flex text-[#25D366]">
                    <WhatsAppIcon className="h-3.5 w-3.5" />
                  </span>
                  פתיחת שיחה ב־WhatsApp
                </a>
              </div>

              <div className="my-6 h-px bg-[#E4D4BC]" role="separator" />

              {/* Email */}
              <div>
                <div className="flex items-center gap-2 text-[#8A6A3E]">
                  <MailIcon />
                  <span className="text-[11px] font-black tracking-[0.14em]">דוא״ל</span>
                </div>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="mt-3 block font-[family-name:var(--font-contact-display)] text-lg text-[#2C2118] underline-offset-4 transition hover:text-[#8A6A3E] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4A46A]"
                  dir="ltr"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>

              <div className="my-6 h-px bg-[#E4D4BC]" role="separator" />

              {/* Hours */}
              <div>
                <div className="flex items-center gap-2 text-[#8A6A3E]">
                  <ClockIcon />
                  <span className="text-[11px] font-black tracking-[0.14em]">שעות פעילות</span>
                </div>
                <dl className="mt-3 space-y-2.5">
                  {BUSINESS_HOURS.map((row) => (
                    <div key={row.label} className="flex items-baseline justify-between gap-4 text-sm">
                      <dt className="font-bold text-[#4A3728]">{row.label}</dt>
                      <dd className="font-[family-name:var(--font-contact-display)] text-[#6B5745]" dir="ltr">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs leading-5 text-[#9A8164]">
                  פניות מחוץ לשעות הפעילות ייענו בהקדם האפשרי.
                </p>
              </div>
            </div>
          </motion.aside>
        </div>
      </section>

      {/* ===== Quick help — editorial link list ===== */}
      <section className="border-t border-[#E2D2B8]/80 bg-[#F3EBE0]/55" aria-labelledby="quick-help-heading">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-14">
          <motion.div {...motionProps}>
            <p className="text-[11px] font-black tracking-[0.16em] text-[#8A6A3E]">QUICK HELP</p>
            <h2 id="quick-help-heading" className={`${display.className} mt-2 text-2xl font-medium text-[#2C2118] sm:text-[1.85rem]`}>
              אולי התשובה כבר מחכה לכם
            </h2>
            <ul className="mt-8 divide-y divide-[#E2D2B8]">
              {QUICK_HELP_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-center justify-between gap-4 py-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4A46A]"
                  >
                    <span>
                      <span className="block text-[15px] font-bold text-[#2C2118] transition group-hover:text-[#8A6A3E]">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-sm text-[#8A7660]">{item.hint}</span>
                    </span>
                    <span
                      className="text-[#C4A46A] transition-transform group-hover:-translate-x-1"
                      aria-hidden
                    >
                      <ArrowIcon />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ===== FAQ accordion ===== */}
      <section className="bg-[#F8F3EA]" aria-labelledby="contact-faq-heading">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <motion.div {...motionProps}>
            <p className="text-[11px] font-black tracking-[0.16em] text-[#8A6A3E]">FAQ</p>
            <h2
              id="contact-faq-heading"
              className={`${display.className} mt-2 max-w-2xl text-2xl font-medium text-[#2C2118] sm:text-[1.85rem]`}
            >
              לפני שפונים — כמה תשובות שימושיות
            </h2>

            <div className="mt-8 divide-y divide-[#E2D2B8] border-y border-[#E2D2B8]">
              {CONTACT_FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group py-1 open:bg-[#FFFDF8]/40"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-start text-[15px] font-bold text-[#2C2118] transition marker:content-none hover:text-[#8A6A3E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4A46A] [&::-webkit-details-marker]:hidden">
                    <span>{faq.q}</span>
                    <span
                      className="shrink-0 text-lg leading-none text-[#C4A46A] transition group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-5 pe-8 text-[15px] leading-7 text-[#6B5745]">{faq.a}</p>
                </details>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== AEO direct answer — visible, after contact actions ===== */}
      <section
        className="border-t border-[#E2D2B8]/80 bg-[#FFFDF8]/70"
        aria-labelledby="contact-aeo-heading"
      >
        <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-12">
          <h2 id="contact-aeo-heading" className="text-base font-black text-[#2C2118] sm:text-lg">
            איך יוצרים קשר עם Invistimo?
          </h2>
          <p className="mt-2 max-w-3xl text-[15px] leading-7 text-[#6B5745]">{CONTACT_DIRECT_ANSWER}</p>
        </div>
      </section>

      {/* Safe space above floating WhatsApp FAB */}
      <div className="h-20 md:h-16" aria-hidden />
    </main>
  );
}
