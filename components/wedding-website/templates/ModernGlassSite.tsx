"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
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
const ACCENT = "#7C9CFF";
const DARK = "#0A0E17";

function GradientMeshBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-1/4 -top-1/4 h-[80vh] w-[80vh] rounded-full opacity-30 blur-[120px]"
        style={{ background: `radial-gradient(circle, ${ACCENT} 0%, transparent 70%)` }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 h-[70vh] w-[70vh] rounded-full opacity-20 blur-[100px]"
        style={{ background: "radial-gradient(circle, #A855F7 0%, transparent 70%)" }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[50vh] w-[50vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15 blur-[80px]"
        style={{ background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)" }}
      />
    </div>
  );
}

function TiltCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("perspective(800px) rotateX(0deg) rotateY(0deg)");

  const onMove = (e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTransform(`perspective(800px) rotateX(${-y * 12}deg) rotateY(${x * 12}deg) scale(1.02)`);
  };

  const onLeave = () => setTransform("perspective(800px) rotateX(0deg) rotateY(0deg)");

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transform, transition: "transform 0.15s ease-out" }}
      className={className}
    >
      {children}
    </div>
  );
}

function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

function GlassNav({ embed }: { embed?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  if (embed) return null;
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <GlassPanel
        className={`mx-auto flex max-w-6xl items-center justify-between px-6 py-3 transition ${
          scrolled ? "shadow-[0_8px_40px_rgba(124,156,255,0.15)]" : ""
        }`}
      >
        <Link href="/wedding-website" className="text-xs font-medium text-[#7C9CFF]">
          ← תבניות
        </Link>
        <nav className="hidden gap-1 md:flex">
          {NAV.slice(1, 10).map(({ id, navLabel }) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-lg px-3 py-1.5 text-xs text-[#8892A8] transition hover:bg-white/5 hover:text-white"
            >
              {navLabel}
            </a>
          ))}
        </nav>
        <a
          href="#rsvp"
          className="rounded-xl bg-[#7C9CFF]/20 px-4 py-2 text-xs font-bold text-[#7C9CFF] backdrop-blur hover:bg-[#7C9CFF]/30"
        >
          RSVP
        </a>
      </GlassPanel>
    </header>
  );
}

export default function ModernGlassSite({ template, embed }: TemplateProps) {
  const countdown = useCountdownTimer(DEMO.weddingDate, DEMO.weddingTime);
  const rsvp = useRsvpDemo();
  const guestbook = useGuestbook();
  const upload = useGuestUpload();
  const playlist = usePlaylistDemo();
  const faq = useFaqAccordion(0);

  return (
    <div className="min-h-screen font-['Montserrat']" style={{ backgroundColor: DARK, color: "#F0F4FF" }}>
      <GradientMeshBg />
      <GlassNav embed={embed} />

      {/* HERO — bento grid with video cell */}
      <section id="hero" className={`relative px-4 ${embed ? "pt-4" : "pt-24"} md:px-8`}>
        <div className="mx-auto grid max-w-6xl gap-3 md:grid-cols-4 md:grid-rows-2 md:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-2 md:row-span-2"
          >
            <TiltCard className="h-full">
              <GlassPanel className="flex h-full min-h-[320px] flex-col justify-end overflow-hidden p-8 md:min-h-[480px]">
                <div className="absolute inset-0 -z-10">
                  <video
                    src={VIDEOS.couple}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E17] via-[#0A0E17]/50 to-transparent" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#7C9CFF]">Wedding</p>
                <h1 className="mt-4 text-4xl font-bold md:text-6xl">{DEMO.coupleNames}</h1>
                <p className="mt-4 max-w-md text-sm text-[#8892A8]">{DEMO.heroSubtitle}</p>
              </GlassPanel>
            </TiltCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <TiltCard>
              <GlassPanel className="flex h-full min-h-[140px] flex-col justify-center p-6">
                <p className="text-xs text-[#8892A8]">תאריך</p>
                <p className="mt-2 text-lg font-bold">{formatHebrewDate(DEMO.weddingDate)}</p>
                <p className="mt-1 text-[#7C9CFF]">{DEMO.weddingTime}</p>
              </GlassPanel>
            </TiltCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <TiltCard>
              <GlassPanel className="relative h-full min-h-[140px] overflow-hidden p-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={template.heroImage} alt="" className="h-full w-full object-cover opacity-70" />
              </GlassPanel>
            </TiltCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2"
          >
            <TiltCard>
              <GlassPanel className="flex min-h-[120px] items-center justify-between gap-4 p-6">
                <div>
                  <p className="text-xs text-[#8892A8]">{DEMO.venueName}</p>
                  <p className="mt-1 text-sm">{DEMO.venueAddress}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href="#rsvp"
                    className="rounded-xl bg-[#7C9CFF] px-5 py-2.5 text-xs font-bold text-[#0A0E17]"
                  >
                    RSVP
                  </a>
                  <a
                    href="#gallery"
                    className="rounded-xl border border-white/20 px-5 py-2.5 text-xs font-bold backdrop-blur"
                  >
                    Gallery
                  </a>
                </div>
              </GlassPanel>
            </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* COUNTDOWN — glass tiles */}
      <section id="countdown" className="px-4 py-20 md:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold">הספירה לאחור</h2>
          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
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
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <TiltCard>
                  <GlassPanel className="p-6 text-center">
                    <span className="text-4xl font-bold tabular-nums text-[#7C9CFF] md:text-5xl">
                      {String(val).padStart(2, "0")}
                    </span>
                    <p className="mt-2 text-xs text-[#8892A8]">{label}</p>
                  </GlassPanel>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* INVITATION */}
      <section id="invitation" className="px-4 py-20 md:px-8">
        <TiltCard className="mx-auto max-w-3xl">
          <GlassPanel className="p-10 text-center md:p-16">
            <h2 className="text-3xl font-bold">הזמנה</h2>
            <p className="mt-8 leading-relaxed text-[#8892A8]">{DEMO.invitationText}</p>
          </GlassPanel>
        </TiltCard>
      </section>

      {/* OUR STORY — bento cards */}
      <section id="our-story" className="px-4 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">הסיפור שלנו</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {DEMO.storyParagraphs.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <TiltCard className="h-full">
                  <GlassPanel className="h-full p-8">
                    <span className="text-3xl font-bold text-[#7C9CFF]/40">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-4 text-sm leading-relaxed text-[#8892A8]">{p}</p>
                  </GlassPanel>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE MET */}
      <section id="how-we-met" className="px-4 py-20 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          <TiltCard>
            <GlassPanel className="overflow-hidden p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={template.galleryImages[0]} alt="" className="aspect-[4/5] w-full object-cover" />
            </GlassPanel>
          </TiltCard>
          <TiltCard>
            <GlassPanel className="flex h-full flex-col justify-center p-10">
              <h2 className="text-3xl font-bold">איך נפגשנו</h2>
              <p className="mt-6 leading-relaxed text-[#8892A8]">{DEMO.howWeMet}</p>
            </GlassPanel>
          </TiltCard>
        </div>
      </section>

      {/* PROPOSAL */}
      <section id="proposal" className="px-4 py-20 md:px-8">
        <TiltCard className="mx-auto max-w-3xl">
          <GlassPanel className="border-[#7C9CFF]/20 bg-[#7C9CFF]/10 p-12 text-center">
            <h2 className="text-3xl font-bold text-[#7C9CFF]">ההצעה</h2>
            <blockquote className="mt-8 text-xl leading-relaxed text-[#F0F4FF]">
              &ldquo;{DEMO.proposalStory}&rdquo;
            </blockquote>
          </GlassPanel>
        </TiltCard>
      </section>

      {/* GALLERY — glass grid */}
      <section id="gallery" className="px-4 py-20 md:px-8">
        <h2 className="mb-12 text-center text-3xl font-bold">גלריה</h2>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {template.galleryImages.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={i === 0 ? "col-span-2 row-span-2" : ""}
            >
              <TiltCard>
                <GlassPanel className="overflow-hidden p-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="aspect-square w-full object-cover" />
                </GlassPanel>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* VIDEO */}
      <section id="video" className="px-4 py-20 md:px-8">
        <TiltCard className="mx-auto max-w-4xl">
          <GlassPanel className="overflow-hidden p-0">
            <h2 className="p-6 text-2xl font-bold">סרטון</h2>
            <video src={VIDEOS.party} autoPlay muted loop playsInline className="aspect-video w-full object-cover" />
          </GlassPanel>
        </TiltCard>
      </section>

      {/* EVENT DETAILS */}
      <section id="event-details" className="px-4 py-20 md:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold">פרטי האירוע</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "תאריך", value: formatHebrewDate(DEMO.weddingDate) },
              { label: "שעה", value: DEMO.weddingTime },
              { label: "מקום", value: DEMO.venueName },
            ].map(({ label, value }) => (
              <TiltCard key={label}>
                <GlassPanel className="p-6 text-center">
                  <p className="text-xs text-[#7C9CFF]">{label}</p>
                  <p className="mt-2 font-bold">{value}</p>
                </GlassPanel>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* SCHEDULE */}
      <section id="schedule" className="px-4 py-20 md:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-12 text-center text-3xl font-bold">לוח זמנים</h2>
          <div className="space-y-3">
            {DEMO.schedule.map((item, i) => (
              <motion.div
                key={item.time}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <TiltCard>
                  <GlassPanel className="flex gap-4 p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#7C9CFF]/20 text-xs font-bold text-[#7C9CFF]">
                      {item.time}
                    </div>
                    <div>
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="mt-1 text-sm text-[#8892A8]">{item.description}</p>
                    </div>
                  </GlassPanel>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCATION */}
      <section id="location" className="px-4 py-20 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          <TiltCard>
            <GlassPanel className="p-10">
              <h2 className="text-3xl font-bold">מיקום</h2>
              <p className="mt-6 text-xl">{DEMO.venueName}</p>
              <p className="mt-2 text-[#8892A8]">{DEMO.venueAddress}</p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(DEMO.venueAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-block rounded-xl bg-[#7C9CFF] px-6 py-3 text-sm font-bold text-[#0A0E17]"
              >
                ניווט
              </a>
            </GlassPanel>
          </TiltCard>
          <TiltCard>
            <GlassPanel className="overflow-hidden p-0">
              <iframe
                title="map"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(DEMO.venueAddress)}&output=embed`}
                className="h-72 w-full opacity-80"
                loading="lazy"
              />
            </GlassPanel>
          </TiltCard>
        </div>
      </section>

      {/* DRESS CODE */}
      <section id="dress-code" className="px-4 py-20 md:px-8">
        <TiltCard className="mx-auto max-w-2xl">
          <GlassPanel className="p-10 text-center">
            <h2 className="text-3xl font-bold">קוד לבוש</h2>
            <p className="mt-6 text-[#8892A8]">{DEMO.dressCode}</p>
          </GlassPanel>
        </TiltCard>
      </section>

      {/* ACCOMMODATIONS */}
      <section id="accommodations" className="px-4 py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold">לינה</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {DEMO.accommodations.map((h) => (
              <TiltCard key={h.name}>
                <GlassPanel className="p-6">
                  <h3 className="font-bold text-[#7C9CFF]">{h.name}</h3>
                  <p className="mt-2 text-sm text-[#8892A8]">{h.note}</p>
                </GlassPanel>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* TRANSPORTATION */}
      <section id="transportation" className="px-4 py-20 md:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-3xl font-bold">הגעה</h2>
          <div className="space-y-3">
            {DEMO.transportation.map((t) => (
              <TiltCard key={t.title}>
                <GlassPanel className="p-5">
                  <h3 className="text-sm font-bold text-[#7C9CFF]">{t.title}</h3>
                  <p className="mt-2 text-sm text-[#8892A8]">{t.description}</p>
                </GlassPanel>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-4 py-20 md:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-10 text-center text-3xl font-bold">שאלות נפוצות</h2>
          <div className="space-y-3">
            {DEMO.faq.map((item, i) => (
              <TiltCard key={item.question}>
                <GlassPanel className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => faq.toggle(i)}
                    className="flex w-full items-center justify-between p-5 text-right"
                  >
                    <span className="text-[#7C9CFF]">{faq.open === i ? "−" : "+"}</span>
                    <span className="font-medium">{item.question}</span>
                  </button>
                  {faq.open === i && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-t border-white/10 px-5 pb-5 text-sm text-[#8892A8]"
                    >
                      {item.answer}
                    </motion.p>
                  )}
                </GlassPanel>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* RSVP */}
      <section id="rsvp" className="px-4 py-24 md:px-8">
        <TiltCard className="mx-auto max-w-md">
          <GlassPanel className="border-[#7C9CFF]/30 p-8">
            <h2 className="text-center text-3xl font-bold">אישור הגעה</h2>
            {rsvp.sent ? (
              <p className="mt-10 text-center text-[#7C9CFF]">✓ תודה! נתראה בחתונה.</p>
            ) : (
              <div className="mt-8 space-y-4">
                <div className="flex gap-2">
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => rsvp.setRsvp(v)}
                      className={`flex-1 rounded-xl py-3 text-sm font-bold transition ${
                        rsvp.rsvp === v
                          ? "bg-[#7C9CFF] text-[#0A0E17]"
                          : "border border-white/15 text-[#8892A8] hover:border-[#7C9CFF]/50"
                      }`}
                    >
                      {v === "yes" ? "מגיעים" : "לא מגיעים"}
                    </button>
                  ))}
                </div>
                {rsvp.rsvp === "yes" && (
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rsvp.count}
                    onChange={(e) => rsvp.setCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-center outline-none backdrop-blur"
                  />
                )}
                <button
                  type="button"
                  onClick={() => rsvp.rsvp && rsvp.setSent(true)}
                  disabled={!rsvp.rsvp}
                  className="w-full rounded-xl bg-[#7C9CFF] py-3 font-bold text-[#0A0E17] disabled:opacity-40"
                >
                  שליחה
                </button>
              </div>
            )}
          </GlassPanel>
        </TiltCard>
      </section>

      {/* GIFTS */}
      <section id="gifts" className="px-4 py-20 md:px-8">
        <TiltCard className="mx-auto max-w-lg">
          <GlassPanel className="p-10 text-center">
            <h2 className="text-3xl font-bold">מתנות</h2>
            <p className="mt-6 text-[#8892A8]">{DEMO.giftsNote}</p>
            <button
              type="button"
              className="mt-8 rounded-xl border border-[#7C9CFF]/40 px-8 py-3 text-sm font-bold text-[#7C9CFF]"
            >
              Bit / PayBox
            </button>
          </GlassPanel>
        </TiltCard>
      </section>

      {/* GUESTBOOK */}
      <section id="guestbook" className="px-4 py-20 md:px-8">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-10 text-center text-3xl font-bold">ספר ברכות</h2>
          <TiltCard>
            <GlassPanel className="p-6">
              <textarea
                value={guestbook.message}
                onChange={(e) => guestbook.setMessage(e.target.value)}
                placeholder="ברכה..."
                rows={3}
                className="w-full resize-none bg-transparent outline-none placeholder:text-[#8892A8]"
              />
              <button
                type="button"
                onClick={guestbook.addMessage}
                className="mt-4 rounded-xl bg-[#7C9CFF] px-6 py-2 text-sm font-bold text-[#0A0E17]"
              >
                שליחה
              </button>
            </GlassPanel>
          </TiltCard>
          <div className="mt-6 space-y-3">
            {guestbook.items.map((m) => (
              <TiltCard key={`${m.name}-${m.date}`}>
                <GlassPanel className="p-5">
                  <div className="flex justify-between text-xs text-[#7C9CFF]">
                    <span>{m.date}</span>
                    <span>{m.name}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#8892A8]">{m.message}</p>
                </GlassPanel>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* GUEST UPLOAD */}
      <section id="guest-upload" className="px-4 py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-3xl font-bold">זיכרונות</h2>
          <TiltCard>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                upload.setDragging(true);
              }}
              onDragLeave={() => upload.setDragging(false)}
              onDrop={upload.onDrop}
            >
              <GlassPanel
                className={`p-12 text-center transition ${
                  upload.dragging ? "border-[#7C9CFF]/50 bg-[#7C9CFF]/10" : ""
                }`}
              >
                <p className="text-[#8892A8]">גררו קבצים לכאן</p>
                <label className="mt-4 inline-block cursor-pointer rounded-xl bg-[#7C9CFF] px-6 py-2 text-sm font-bold text-[#0A0E17]">
                  העלאה
                  <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={upload.onFileChange} />
                </label>
              </GlassPanel>
            </div>
          </TiltCard>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {upload.items.map((item) => (
              <TiltCard key={item.id}>
                <GlassPanel className="overflow-hidden p-0">
                  {item.type === "video" ? (
                    <video src={item.url} className="aspect-square w-full object-cover" muted />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.url} alt="" className="aspect-square w-full object-cover" />
                  )}
                </GlassPanel>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* PLAYLIST */}
      <section id="playlist" className="px-4 py-20 md:px-8">
        <TiltCard className="mx-auto max-w-lg">
          <GlassPanel className="border-[#7C9CFF]/20 p-8">
            <h2 className="text-center text-3xl font-bold">מוזיקה</h2>
            <p className="mt-4 text-center text-sm text-[#8892A8]">{DEMO.playlistNote}</p>
            <div className="mt-6 flex gap-2">
              <input
                value={playlist.song}
                onChange={(e) => playlist.setSong(e.target.value)}
                placeholder="שיר..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none backdrop-blur"
              />
              <button
                type="button"
                onClick={playlist.addSong}
                className="rounded-xl bg-[#7C9CFF] px-4 font-bold text-[#0A0E17]"
              >
                +
              </button>
            </div>
            <ul className="mt-6 space-y-2">
              {playlist.songs.map((s) => (
                <li key={s} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm backdrop-blur">
                  ♪ {s}
                </li>
              ))}
            </ul>
          </GlassPanel>
        </TiltCard>
      </section>

      {/* FOOTER */}
      <footer id="footer" className="px-4 py-16 md:px-8">
        <GlassPanel className="mx-auto max-w-4xl p-10 text-center">
          <p className="text-3xl font-bold">{DEMO.coupleNames}</p>
          <p className="mt-4 text-sm text-[#7C9CFF]">{formatHebrewDate(DEMO.weddingDate)}</p>
          <p className="mx-auto mt-6 max-w-md text-sm text-[#8892A8]">{DEMO.footerNote}</p>
        </GlassPanel>
      </footer>
    </div>
  );
}
