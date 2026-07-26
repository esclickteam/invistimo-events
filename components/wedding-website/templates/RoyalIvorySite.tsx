"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";
import {
  useCountdownTimer,
  useFaqAccordion,
  useGuestbook,
  useGuestUpload,
  usePlaylistDemo,
  useRsvpDemo,
} from "../shared/useWeddingInteractions";
import { DEMO, VIDEOS, formatHebrewDate, type TemplateProps } from "../shared/weddingUtils";

const NAV = WEDDING_SECTIONS.filter((s) => s.id !== "footer");
const CREAM = "#FDFBF7";

function LaceBg() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.07]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23B8956B' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}
    />
  );
}

function CrownOrnament({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 40" className={`h-8 w-24 text-[#B8956B] ${className}`} fill="currentColor">
      <path d="M10 30 L20 10 L30 22 L40 8 L50 22 L60 10 L70 22 L80 8 L90 22 L100 10 L110 30 Z M10 30 H110 V34 H10 Z" />
    </svg>
  );
}

function DoubleFrame({ src, alt = "" }: { src: string; alt?: string }) {
  return (
    <div className="relative">
      <div className="absolute -left-3 -top-3 h-full w-full border-2 border-[#B8956B]/40" />
      <div className="relative border-4 border-white shadow-[0_20px_60px_rgba(100,75,50,0.15)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="aspect-[4/5] w-full object-cover" />
      </div>
      <div className="absolute -bottom-3 -right-3 h-full w-full border-2 border-[#B8956B]/60" />
    </div>
  );
}

function RoyalNav({ embed }: { embed?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  if (embed) return null;
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-[#FDFBF7]/95 shadow-sm backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/wedding-website"
          className="font-['Playfair_Display'] text-sm italic text-[#8C7B68] hover:text-[#B8956B]"
        >
          ← כל התבניות
        </Link>
        <nav className="hidden gap-6 lg:flex">
          {NAV.slice(1, 9).map(({ id, navLabel }) => (
            <a
              key={id}
              href={`#${id}`}
              className="font-['Playfair_Display'] text-xs tracking-wide text-[#2C2419]/70 transition hover:text-[#B8956B]"
            >
              {navLabel}
            </a>
          ))}
        </nav>
        <a
          href="#rsvp"
          className="rounded-full border border-[#B8956B] px-5 py-2 font-['Playfair_Display'] text-xs text-[#B8956B] transition hover:bg-[#B8956B] hover:text-white"
        >
          אישור הגעה
        </a>
      </div>
    </header>
  );
}

export default function RoyalIvorySite({ template, embed }: TemplateProps) {
  const countdown = useCountdownTimer(DEMO.weddingDate, DEMO.weddingTime);
  const rsvp = useRsvpDemo();
  const guestbook = useGuestbook();
  const upload = useGuestUpload();
  const playlist = usePlaylistDemo();
  const faq = useFaqAccordion(0);

  return (
    <div className="min-h-screen font-['Heebo']" style={{ backgroundColor: CREAM, color: "#2C2419" }}>
      <RoyalNav embed={embed} />

      {/* HERO — overlapping double frames */}
      <section id="hero" className={`relative overflow-hidden ${embed ? "pt-0" : "pt-20"}`}>
        <LaceBg />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-32">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
          >
            <CrownOrnament className="mb-6" />
            <p className="font-['Playfair_Display'] text-sm italic tracking-[0.3em] text-[#B8956B]">
              Save the Date
            </p>
            <h1 className="mt-4 font-['Playfair_Display'] text-5xl font-semibold leading-tight md:text-7xl">
              {DEMO.coupleNames}
            </h1>
            <div className="my-8 h-px w-32 bg-gradient-to-r from-[#B8956B] to-transparent" />
            <p className="max-w-md text-lg leading-relaxed text-[#8C7B68]">{DEMO.heroSubtitle}</p>
            <p className="mt-6 font-['Playfair_Display'] text-sm text-[#B8956B]">
              {formatHebrewDate(DEMO.weddingDate)} · {DEMO.weddingTime}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#rsvp"
                className="rounded-full bg-[#B8956B] px-8 py-3 font-['Playfair_Display'] text-sm text-white shadow-lg transition hover:scale-105"
              >
                אישור הגעה
              </a>
              <a
                href="#our-story"
                className="rounded-full border border-[#B8956B]/40 px-8 py-3 font-['Playfair_Display'] text-sm text-[#B8956B]"
              >
                הסיפור שלנו
              </a>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative mx-auto w-full max-w-sm md:max-w-md"
          >
            <DoubleFrame src={template.heroImage} alt="couple" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -bottom-8 -left-8 hidden w-40 md:block"
            >
              <DoubleFrame src={template.galleryImages[1] ?? template.galleryImages[0]} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* COUNTDOWN — ornate cards */}
      <section id="countdown" className="relative py-20">
        <LaceBg />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <CrownOrnament className="mx-auto mb-4" />
          <h2 className="font-['Playfair_Display'] text-4xl">הספירה לאחור</h2>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {(
              [
                ["ימים", countdown.days],
                ["שעות", countdown.hours],
                ["דקות", countdown.minutes],
                ["שניות", countdown.seconds],
              ] as const
            ).map(([label, val], i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-3xl border border-[#B8956B]/25 bg-white p-6 shadow-[0_12px_40px_rgba(100,75,50,0.08)]"
              >
                <span className="font-['Playfair_Display'] text-4xl font-semibold text-[#B8956B] md:text-5xl">
                  {String(val).padStart(2, "0")}
                </span>
                <p className="mt-2 font-['Playfair_Display'] text-xs italic text-[#8C7B68]">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* INVITATION */}
      <section id="invitation" className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <CrownOrnament className="mx-auto mb-6" />
          <h2 className="font-['Playfair_Display'] text-4xl">הזמנה רשמית</h2>
          <p className="mt-10 font-['Playfair_Display'] text-xl italic leading-[2] text-[#5C4A38]">
            {DEMO.invitationText}
          </p>
          <p className="mt-8 text-sm text-[#B8956B]">{DEMO.venueName}</p>
        </div>
      </section>

      {/* OUR STORY */}
      <section id="our-story" className="relative py-20">
        <LaceBg />
        <div className="relative mx-auto max-w-5xl px-6">
          <h2 className="text-center font-['Playfair_Display'] text-4xl">הסיפור שלנו</h2>
          <div className="mt-16 space-y-12">
            {DEMO.storyParagraphs.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 ? 30 : -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className={`flex gap-8 ${i % 2 ? "md:flex-row-reverse" : ""}`}
              >
                <div className="hidden w-32 shrink-0 md:block">
                  <div className="font-['Playfair_Display'] text-6xl font-light text-[#B8956B]/30">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                </div>
                <div className="flex-1 rounded-3xl border border-[#B8956B]/20 bg-white p-8 shadow-sm">
                  <p className="leading-relaxed text-[#5C4A38]">{p}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE MET */}
      <section id="how-we-met" className="bg-white py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <DoubleFrame src={template.galleryImages[0]} />
          <div>
            <h2 className="font-['Playfair_Display'] text-4xl">איך נפגשנו</h2>
            <div className="my-6 h-px w-20 bg-[#B8956B]" />
            <p className="leading-relaxed text-[#8C7B68]">{DEMO.howWeMet}</p>
          </div>
        </div>
      </section>

      {/* PROPOSAL */}
      <section id="proposal" className="relative py-24">
        <LaceBg />
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-3xl px-6 text-center"
        >
          <CrownOrnament className="mx-auto mb-8" />
          <h2 className="font-['Playfair_Display'] text-4xl">ההצעה</h2>
          <blockquote className="mt-10 font-['Playfair_Display'] text-2xl italic leading-relaxed text-[#5C4A38] md:text-3xl">
            &ldquo;{DEMO.proposalStory}&rdquo;
          </blockquote>
        </motion.div>
      </section>

      {/* GALLERY — scroll snap carousel */}
      <section id="gallery" className="bg-white py-20">
        <div className="mb-10 px-6 text-center">
          <h2 className="font-['Playfair_Display'] text-4xl">גלריה</h2>
        </div>
        <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-6 scrollbar-hide md:px-12">
          {template.galleryImages.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="w-[280px] shrink-0 snap-center md:w-[360px]"
            >
              <div className="relative">
                <div className="absolute -inset-2 rounded-2xl border border-[#B8956B]/30" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="relative aspect-[3/4] w-full rounded-xl object-cover shadow-lg"
                />
                <span className="absolute bottom-4 right-4 font-['Playfair_Display'] text-sm italic text-white drop-shadow">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* VIDEO */}
      <section id="video" className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-10 text-center font-['Playfair_Display'] text-4xl">סרטון</h2>
          <div className="relative overflow-hidden rounded-3xl border-4 border-white shadow-[0_30px_80px_rgba(100,75,50,0.15)]">
            <video src={VIDEOS.romantic} autoPlay muted loop playsInline className="aspect-video w-full object-cover" />
          </div>
        </div>
      </section>

      {/* EVENT DETAILS */}
      <section id="event-details" className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <CrownOrnament className="mx-auto mb-6" />
          <h2 className="text-center font-['Playfair_Display'] text-4xl">פרטי האירוע</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { label: "תאריך", value: formatHebrewDate(DEMO.weddingDate) },
              { label: "שעה", value: DEMO.weddingTime },
              { label: "מקום", value: DEMO.venueName },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-3xl border border-[#B8956B]/20 p-8 text-center"
                style={{ backgroundColor: CREAM }}
              >
                <p className="font-['Playfair_Display'] text-xs italic text-[#B8956B]">{label}</p>
                <p className="mt-3 font-['Playfair_Display'] text-lg">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCHEDULE */}
      <section id="schedule" className="relative py-20">
        <LaceBg />
        <div className="relative mx-auto max-w-3xl px-6">
          <h2 className="text-center font-['Playfair_Display'] text-4xl">לוח זמנים</h2>
          <div className="relative mt-16">
            <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-[#B8956B]/30 md:block" />
            {DEMO.schedule.map((item, i) => (
              <motion.div
                key={item.time}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`relative mb-10 flex ${i % 2 ? "md:justify-start" : "md:justify-end"}`}
              >
                <div className="w-full rounded-2xl border border-[#B8956B]/20 bg-white p-6 shadow-sm md:w-[45%]">
                  <span className="font-['Playfair_Display'] text-sm text-[#B8956B]">{item.time}</span>
                  <h3 className="mt-1 font-['Playfair_Display'] text-xl">{item.title}</h3>
                  <p className="mt-2 text-sm text-[#8C7B68]">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCATION */}
      <section id="location" className="bg-white py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
          <div>
            <h2 className="font-['Playfair_Display'] text-4xl">מיקום</h2>
            <p className="mt-6 font-['Playfair_Display'] text-xl">{DEMO.venueName}</p>
            <p className="mt-2 text-[#8C7B68]">{DEMO.venueAddress}</p>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(DEMO.venueAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-block rounded-full border border-[#B8956B] px-8 py-3 font-['Playfair_Display'] text-sm text-[#B8956B]"
            >
              ניווט
            </a>
          </div>
          <div className="overflow-hidden rounded-3xl border border-[#B8956B]/20 shadow-lg">
            <iframe
              title="map"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(DEMO.venueAddress)}&output=embed`}
              className="h-72 w-full"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* DRESS CODE */}
      <section id="dress-code" className="py-20 text-center">
        <CrownOrnament className="mx-auto mb-6" />
        <h2 className="font-['Playfair_Display'] text-4xl">קוד לבוש</h2>
        <p className="mx-auto mt-8 max-w-xl leading-relaxed text-[#8C7B68]">{DEMO.dressCode}</p>
      </section>

      {/* ACCOMMODATIONS */}
      <section id="accommodations" className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-['Playfair_Display'] text-4xl">לינה</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {DEMO.accommodations.map((h) => (
              <div
                key={h.name}
                className="rounded-3xl border border-[#B8956B]/20 p-6"
                style={{ backgroundColor: CREAM }}
              >
                <h3 className="font-['Playfair_Display'] text-lg">{h.name}</h3>
                <p className="mt-2 text-sm text-[#8C7B68]">{h.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRANSPORTATION */}
      <section id="transportation" className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-['Playfair_Display'] text-4xl">הגעה</h2>
          <div className="mt-12 space-y-4">
            {DEMO.transportation.map((t) => (
              <div key={t.title} className="rounded-2xl border border-[#B8956B]/20 bg-white p-6">
                <h3 className="font-['Playfair_Display'] text-[#B8956B]">{t.title}</h3>
                <p className="mt-2 text-sm text-[#8C7B68]">{t.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center font-['Playfair_Display'] text-4xl">שאלות נפוצות</h2>
          <div className="mt-10 space-y-3">
            {DEMO.faq.map((item, i) => (
              <div key={item.question} className="overflow-hidden rounded-2xl border border-[#B8956B]/20">
                <button
                  type="button"
                  onClick={() => faq.toggle(i)}
                  className="flex w-full items-center justify-between p-5 text-right"
                >
                  <span className="text-[#B8956B]">{faq.open === i ? "−" : "+"}</span>
                  <span className="font-['Playfair_Display']">{item.question}</span>
                </button>
                {faq.open === i && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t border-[#B8956B]/10 px-5 pb-5 text-sm text-[#8C7B68]"
                  >
                    {item.answer}
                  </motion.p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RSVP */}
      <section id="rsvp" className="relative py-24">
        <LaceBg />
        <div className="relative mx-auto max-w-lg px-6">
          <CrownOrnament className="mx-auto mb-6" />
          <h2 className="text-center font-['Playfair_Display'] text-4xl">אישור הגעה</h2>
          {rsvp.sent ? (
            <p className="mt-10 text-center font-['Playfair_Display'] italic text-[#B8956B]">
              תודה רבה! נשמח לראותכם.
            </p>
          ) : (
            <div className="mt-10 rounded-3xl border border-[#B8956B]/25 bg-white p-8 shadow-lg">
              <div className="flex gap-3">
                {(["yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => rsvp.setRsvp(v)}
                    className={`flex-1 rounded-full py-3 font-['Playfair_Display'] text-sm transition ${
                      rsvp.rsvp === v
                        ? "bg-[#B8956B] text-white"
                        : "border border-[#B8956B]/30 text-[#B8956B]"
                    }`}
                  >
                    {v === "yes" ? "מגיעים" : "לא מגיעים"}
                  </button>
                ))}
              </div>
              {rsvp.rsvp === "yes" && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <span className="text-sm">מספר אורחים</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rsvp.count}
                    onChange={(e) => rsvp.setCount(Number(e.target.value))}
                    className="w-16 rounded-full border border-[#B8956B]/30 px-3 py-2 text-center"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => rsvp.rsvp && rsvp.setSent(true)}
                disabled={!rsvp.rsvp}
                className="mt-6 w-full rounded-full bg-[#B8956B] py-3 font-['Playfair_Display'] text-white disabled:opacity-40"
              >
                שליחה
              </button>
            </div>
          )}
        </div>
      </section>

      {/* GIFTS */}
      <section id="gifts" className="bg-white py-20 text-center">
        <h2 className="font-['Playfair_Display'] text-4xl">מתנות</h2>
        <p className="mx-auto mt-8 max-w-lg text-[#8C7B68]">{DEMO.giftsNote}</p>
        <button
          type="button"
          className="mt-8 rounded-full border border-[#B8956B] px-8 py-3 font-['Playfair_Display'] text-[#B8956B]"
        >
          Bit / PayBox
        </button>
      </section>

      {/* GUESTBOOK */}
      <section id="guestbook" className="py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center font-['Playfair_Display'] text-4xl">ספר ברכות</h2>
          <div className="mt-10 rounded-3xl border border-[#B8956B]/20 bg-white p-6 shadow-sm">
            <textarea
              value={guestbook.message}
              onChange={(e) => guestbook.setMessage(e.target.value)}
              placeholder="כתבו ברכה חמה..."
              rows={3}
              className="w-full resize-none bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={guestbook.addMessage}
              className="mt-4 rounded-full bg-[#B8956B] px-6 py-2 font-['Playfair_Display'] text-sm text-white"
            >
              שליחה
            </button>
          </div>
          <div className="mt-8 space-y-4">
            {guestbook.items.map((m) => (
              <div key={`${m.name}-${m.date}`} className="rounded-2xl border border-[#B8956B]/15 bg-white/80 p-5">
                <div className="flex justify-between text-xs text-[#B8956B]">
                  <span>{m.date}</span>
                  <span className="font-['Playfair_Display']">{m.name}</span>
                </div>
                <p className="mt-2 text-sm text-[#5C4A38]">{m.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GUEST UPLOAD */}
      <section id="guest-upload" className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-['Playfair_Display'] text-4xl">זיכרונות מהאירוע</h2>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              upload.setDragging(true);
            }}
            onDragLeave={() => upload.setDragging(false)}
            onDrop={upload.onDrop}
            className={`mt-10 rounded-3xl border-2 border-dashed p-12 text-center transition ${
              upload.dragging ? "border-[#B8956B] bg-[#FDFBF7]" : "border-[#B8956B]/30"
            }`}
          >
            <p className="font-['Playfair_Display'] italic text-[#8C7B68]">גררו תמונות לכאן</p>
            <label className="mt-4 inline-block cursor-pointer rounded-full bg-[#B8956B] px-6 py-2 text-sm text-white">
              העלאת קובץ
              <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={upload.onFileChange} />
            </label>
          </div>
          <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
            {upload.items.map((item) => (
              <div key={item.id} className="w-40 shrink-0 snap-center overflow-hidden rounded-xl border border-[#B8956B]/20">
                {item.type === "video" ? (
                  <video src={item.url} className="aspect-square w-full object-cover" muted />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.url} alt="" className="aspect-square w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLAYLIST */}
      <section id="playlist" className="py-20">
        <div className="mx-auto max-w-lg px-6">
          <h2 className="text-center font-['Playfair_Display'] text-4xl">מוזיקה</h2>
          <p className="mt-4 text-center text-sm text-[#8C7B68]">{DEMO.playlistNote}</p>
          <div className="mt-8 flex gap-2">
            <input
              value={playlist.song}
              onChange={(e) => playlist.setSong(e.target.value)}
              placeholder="הציעו שיר..."
              className="flex-1 rounded-full border border-[#B8956B]/30 px-5 py-3 outline-none"
            />
            <button
              type="button"
              onClick={playlist.addSong}
              className="rounded-full bg-[#B8956B] px-5 text-white"
            >
              +
            </button>
          </div>
          <ul className="mt-6 space-y-2">
            {playlist.songs.map((s) => (
              <li key={s} className="rounded-xl border border-[#B8956B]/15 bg-white px-5 py-3 font-['Playfair_Display'] text-sm">
                ♪ {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="footer" className="border-t border-[#B8956B]/20 bg-white py-16 text-center">
        <CrownOrnament className="mx-auto mb-6" />
        <p className="font-['Playfair_Display'] text-3xl">{DEMO.coupleNames}</p>
        <p className="mt-4 text-sm text-[#B8956B]">{formatHebrewDate(DEMO.weddingDate)}</p>
        <p className="mx-auto mt-8 max-w-md text-sm text-[#8C7B68]">{DEMO.footerNote}</p>
      </footer>
    </div>
  );
}
