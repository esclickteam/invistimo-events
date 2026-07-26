"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type DragEvent, type JSX } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Camera,
  Car,
  Clock,
  Gift,
  Heart,
  MapPin,
  MessageCircle,
  Music,
  Upload,
  Video,
  HelpCircle,
  Shirt,
  Hotel,
} from "lucide-react";
import AnimatedSection, { GlassCard, SectionHeading } from "./AnimatedSection";
import FloatingParticles, { HeroParallax, ScrollIndicator } from "./effects/WeddingEffects";
import { useWeddingTheme } from "./WeddingThemeProvider";
import { DEMO_GUEST_UPLOADS } from "@/config/weddingWebsite/demoContent";
import type { GuestUploadItem, WeddingSectionId } from "@/types/weddingWebsite";

function formatCountdown(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

function formatHebrewDate(dateStr: string) {
  try {
    return new Intl.DateTimeFormat("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function HeroSection() {
  const { template, content } = useWeddingTheme();

  return (
    <section id="hero" className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <HeroParallax image={template.heroImage} />
      <FloatingParticles count={template.mood === "dramatic" ? 40 : 20} />

      <div className="relative z-10 px-6 text-center text-white">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-4 text-xs font-bold uppercase tracking-[0.45em] text-white/75"
        >
          Save the Date
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9 }}
          className="ww-display text-5xl font-light leading-none md:text-8xl"
          style={{ fontFamily: "var(--ww-font-display)" }}
        >
          {content.coupleNames}
        </motion.h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mx-auto my-6 h-px w-24 bg-white/50"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mx-auto max-w-xl text-base text-white/85 md:text-xl"
        >
          {content.heroSubtitle}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="mt-6 text-sm font-bold tracking-widest text-white/70"
        >
          {formatHebrewDate(content.weddingDate)} · {content.weddingTime}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#rsvp"
            className="rounded-full bg-white px-8 py-4 text-sm font-black text-[var(--ww-text)] shadow-2xl transition hover:scale-105"
          >
            אישור הגעה
          </a>
          <a
            href="#our-story"
            className="rounded-full border border-white/50 px-8 py-4 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/10"
          >
            הסיפור שלנו
          </a>
        </motion.div>
      </div>

      <ScrollIndicator />
    </section>
  );
}

export function CountdownSection() {
  const { content } = useWeddingTheme();
  const target = `${content.weddingDate}T${content.weddingTime}:00`;
  const [time, setTime] = useState(formatCountdown(target));

  useEffect(() => {
    const t = setInterval(() => setTime(formatCountdown(target)), 1000);
    return () => clearInterval(t);
  }, [target]);

  const units = [
    { label: "ימים", value: time.days },
    { label: "שעות", value: time.hours },
    { label: "דקות", value: time.minutes },
    { label: "שניות", value: time.seconds },
  ];

  return (
    <AnimatedSection id="countdown" className="bg-[var(--ww-bg-alt)] py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeading eyebrow="Countdown" title="הספירה לאחור" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {units.map((u, i) => (
            <motion.div
              key={u.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <GlassCard className="text-center">
                <div
                  className="ww-display text-4xl font-light md:text-6xl"
                  style={{ fontFamily: "var(--ww-font-display)", color: "var(--ww-accent)" }}
                >
                  {String(u.value).padStart(2, "0")}
                </div>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-[var(--ww-text-muted)]">
                  {u.label}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

export function InvitationSection() {
  const { content } = useWeddingTheme();
  return (
    <AnimatedSection id="invitation" className="py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <SectionHeading eyebrow="You're Invited" title="הזמנה חמה" />
        <GlassCard>
          <Heart className="mx-auto mb-6 h-8 w-8 text-[var(--ww-accent)]" />
          <p className="text-lg leading-loose text-[var(--ww-text-muted)] md:text-xl">
            {content.invitationText}
          </p>
        </GlassCard>
      </div>
    </AnimatedSection>
  );
}

export function OurStorySection() {
  const { content } = useWeddingTheme();
  return (
    <AnimatedSection id="our-story" className="bg-[var(--ww-bg-alt)] py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading eyebrow="Our Story" title="הסיפור שלנו" />
        <div className="space-y-6">
          {content.storyParagraphs.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-lg leading-relaxed text-[var(--ww-text-muted)]"
            >
              {p}
            </motion.p>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

export function HowWeMetSection() {
  const { content, template } = useWeddingTheme();
  return (
    <AnimatedSection id="how-we-met" className="py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-[var(--ww-radius)] shadow-[var(--ww-shadow)]"
        >
          <img
            src={template.galleryImages[0]}
            alt=""
            className="aspect-[4/5] w-full object-cover"
          />
        </motion.div>
        <div>
          <SectionHeading center={false} eyebrow="Chapter I" title="איך נפגשנו" />
          <p className="text-lg leading-relaxed text-[var(--ww-text-muted)]">{content.howWeMet}</p>
        </div>
      </div>
    </AnimatedSection>
  );
}

export function ProposalSection() {
  const { content, template } = useWeddingTheme();
  return (
    <AnimatedSection id="proposal" className="bg-[var(--ww-bg-alt)] py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2">
        <div className="md:order-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="overflow-hidden rounded-[var(--ww-radius)] shadow-[var(--ww-shadow)]"
          >
            <img
              src={template.galleryImages[1]}
              alt=""
              className="aspect-[4/5] w-full object-cover"
            />
          </motion.div>
        </div>
        <div className="md:order-1">
          <SectionHeading center={false} eyebrow="Chapter II" title="ההצעה" />
          <p className="text-lg leading-relaxed text-[var(--ww-text-muted)]">{content.proposalStory}</p>
        </div>
      </div>
    </AnimatedSection>
  );
}

export function GallerySection() {
  const { template } = useWeddingTheme();
  return (
    <AnimatedSection id="gallery" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Gallery" title="רגעים מהדרך" subtitle="תמונות שאנחנו אוהבים במיוחד" />
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {template.galleryImages.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="mb-4 break-inside-avoid overflow-hidden rounded-[var(--ww-radius)]"
            >
              <img src={src} alt="" className="w-full object-cover transition duration-700 hover:scale-105" />
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

export function VideoSection() {
  const { template } = useWeddingTheme();
  return (
    <AnimatedSection id="video" className="bg-[var(--ww-bg-alt)] py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeading eyebrow="Video" title="סרטון Save the Date" />
        <GlassCard className="overflow-hidden p-0">
          <div className="relative aspect-video overflow-hidden">
            <img src={template.heroImage} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                className="flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-[var(--ww-text)] shadow-2xl"
              >
                <Video className="mr-[-2px] h-8 w-8" />
              </motion.button>
            </div>
          </div>
          <p className="p-6 text-center text-sm text-[var(--ww-text-muted)]">
            תצוגה מקדימה — בגרסה המלאה יוטמע סרטון Save the Date
          </p>
        </GlassCard>
      </div>
    </AnimatedSection>
  );
}

export function EventDetailsSection() {
  const { content } = useWeddingTheme();
  return (
    <AnimatedSection id="event-details" className="py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading eyebrow="Details" title="פרטי האירוע" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Calendar, label: "תאריך", value: formatHebrewDate(content.weddingDate) },
            { icon: Clock, label: "שעה", value: content.weddingTime },
            { icon: MapPin, label: "מיקום", value: content.venueName },
          ].map(({ icon: Icon, label, value }) => (
            <GlassCard key={label} className="text-center">
              <Icon className="mx-auto mb-4 h-7 w-7 text-[var(--ww-accent)]" />
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--ww-text-muted)]">{label}</p>
              <p className="mt-2 font-bold text-[var(--ww-text)]">{value}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

export function ScheduleSection() {
  const { content } = useWeddingTheme();
  return (
    <AnimatedSection id="schedule" className="bg-[var(--ww-bg-alt)] py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading eyebrow="Timeline" title="לוח זמנים" />
        <div className="relative space-y-0">
          {content.schedule.map((item, i) => (
            <motion.div
              key={item.time}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative flex gap-6 pb-10 last:pb-0"
            >
              <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ww-accent)] text-sm font-black text-white">
                  {item.time}
                </div>
                {i < content.schedule.length - 1 ? (
                  <div className="mt-2 w-px flex-1 bg-[var(--ww-border)]" />
                ) : null}
              </div>
              <GlassCard className="flex-1">
                <h3 className="text-lg font-black">{item.title}</h3>
                <p className="mt-1 text-sm text-[var(--ww-text-muted)]">{item.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

export function LocationSection() {
  const { content } = useWeddingTheme();
  return (
    <AnimatedSection id="location" className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeading eyebrow="Location" title="איך מגיעים" subtitle={content.venueAddress} />
        <GlassCard className="overflow-hidden p-0">
          <div className="relative aspect-[16/9] bg-[var(--ww-bg-alt)]">
            <iframe
              title="map"
              className="absolute inset-0 h-full w-full border-0 grayscale-[30%]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(content.venueAddress)}&z=14&output=embed`}
            />
          </div>
          <div className="flex flex-wrap gap-3 p-6">
            <a
              href={`https://waze.com/ul?q=${encodeURIComponent(content.venueAddress)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[var(--ww-accent)] px-6 py-3 text-sm font-black text-white"
            >
              Waze
            </a>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(content.venueAddress)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[var(--ww-border)] px-6 py-3 text-sm font-bold"
            >
              Google Maps
            </a>
          </div>
        </GlassCard>
      </div>
    </AnimatedSection>
  );
}

export function DressCodeSection() {
  const { content } = useWeddingTheme();
  return (
    <AnimatedSection id="dress-code" className="bg-[var(--ww-bg-alt)] py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <SectionHeading eyebrow="Dress Code" title="קוד לבוש" />
        <GlassCard>
          <Shirt className="mx-auto mb-4 h-8 w-8 text-[var(--ww-accent)]" />
          <p className="text-lg leading-relaxed text-[var(--ww-text-muted)]">{content.dressCode}</p>
        </GlassCard>
      </div>
    </AnimatedSection>
  );
}

export function AccommodationsSection() {
  const { content } = useWeddingTheme();
  return (
    <AnimatedSection id="accommodations" className="py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading eyebrow="Stay" title="לינה באזור" />
        <div className="grid gap-4 md:grid-cols-3">
          {content.accommodations.map((item) => (
            <GlassCard key={item.name}>
              <Hotel className="mb-3 h-6 w-6 text-[var(--ww-accent)]" />
              <h3 className="font-black">{item.name}</h3>
              <p className="mt-2 text-sm text-[var(--ww-text-muted)]">{item.note}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

export function TransportationSection() {
  const { content } = useWeddingTheme();
  return (
    <AnimatedSection id="transportation" className="bg-[var(--ww-bg-alt)] py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading eyebrow="Getting There" title="הגעה וחנייה" />
        <div className="grid gap-4 md:grid-cols-3">
          {content.transportation.map((item) => (
            <GlassCard key={item.title}>
              <Car className="mb-3 h-6 w-6 text-[var(--ww-accent)]" />
              <h3 className="font-black">{item.title}</h3>
              <p className="mt-2 text-sm text-[var(--ww-text-muted)]">{item.description}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

export function FaqSection() {
  const { content } = useWeddingTheme();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <AnimatedSection id="faq" className="py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading eyebrow="FAQ" title="שאלות נפוצות" />
        <div className="space-y-3">
          {content.faq.map((item, i) => (
            <GlassCard key={item.question} onClick={() => setOpen(open === i ? null : i)}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <HelpCircle className="mb-2 h-5 w-5 text-[var(--ww-accent)]" />
                  <h3 className="font-black">{item.question}</h3>
                  {open === i ? (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 text-sm leading-relaxed text-[var(--ww-text-muted)]"
                    >
                      {item.answer}
                    </motion.p>
                  ) : null}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

export function RsvpSection() {
  const [rsvp, setRsvp] = useState<"yes" | "no" | "">("");
  const [count, setCount] = useState(1);
  const [sent, setSent] = useState(false);
  const { content } = useWeddingTheme();

  return (
    <AnimatedSection id="rsvp" className="bg-[var(--ww-bg-alt)] py-20 md:py-28">
      <div className="mx-auto max-w-xl px-6">
        <SectionHeading eyebrow="RSVP" title="אישור הגעה" subtitle="נשמח לדעת אם תוכלו להגיע" />
        {sent ? (
          <GlassCard className="text-center">
            <Heart className="mx-auto mb-4 h-10 w-10 text-[var(--ww-accent)]" />
            <p className="text-xl font-black">תודה! התשובה נשמרה (דמו)</p>
          </GlassCard>
        ) : (
          <GlassCard>
            <p className="mb-6 text-center text-sm text-[var(--ww-text-muted)]">
              שלום! אתם מוזמנים לחתונה של {content.coupleNames}
            </p>
            <div className="mb-6 grid grid-cols-2 gap-3">
              {(["yes", "no"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRsvp(v)}
                  className={`rounded-2xl border py-4 text-sm font-black transition ${
                    rsvp === v
                      ? "border-[var(--ww-accent)] bg-[var(--ww-accent-soft)] text-[var(--ww-accent)]"
                      : "border-[var(--ww-border)]"
                  }`}
                >
                  {v === "yes" ? "מגיעים" : "לא מגיעים"}
                </button>
              ))}
            </div>
            {rsvp === "yes" ? (
              <div className="mb-6">
                <label className="mb-2 block text-sm font-bold">כמה תגיעו?</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[var(--ww-border)] bg-transparent px-4 py-3"
                />
              </div>
            ) : null}
            <button
              type="button"
              disabled={!rsvp}
              onClick={() => setSent(true)}
              className="w-full rounded-2xl bg-[var(--ww-accent)] py-4 text-sm font-black text-white disabled:opacity-40"
            >
              שליחת אישור
            </button>
            <p className="mt-4 text-center text-xs text-[var(--ww-text-muted)]">
              תצוגה מקדימה — לא מחובר למערכת הקיימת
            </p>
          </GlassCard>
        )}
      </div>
    </AnimatedSection>
  );
}

export function GiftsSection() {
  const { content } = useWeddingTheme();
  return (
    <AnimatedSection id="gifts" className="py-20 md:py-28">
      <div className="mx-auto max-w-xl px-6 text-center">
        <SectionHeading eyebrow="Gifts" title="מתנות" />
        <GlassCard>
          <Gift className="mx-auto mb-4 h-8 w-8 text-[var(--ww-accent)]" />
          <p className="leading-relaxed text-[var(--ww-text-muted)]">{content.giftsNote}</p>
          <button
            type="button"
            className="mt-6 rounded-full bg-[var(--ww-accent)] px-8 py-3 text-sm font-black text-white"
          >
            מתנה דיגיטלית
          </button>
        </GlassCard>
      </div>
    </AnimatedSection>
  );
}

export function GuestbookSection() {
  const { content } = useWeddingTheme();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(content.guestbookMessages);

  return (
    <AnimatedSection id="guestbook" className="bg-[var(--ww-bg-alt)] py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading eyebrow="Guestbook" title="ברכות ומילים חמות" />
        <GlassCard className="mb-6">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="כתבו ברכה..."
            rows={3}
            className="w-full resize-none rounded-2xl border border-[var(--ww-border)] bg-transparent p-4 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (!message.trim()) return;
              setMessages([
                { name: "אורח", message: message.trim(), date: new Date().toLocaleDateString("he-IL") },
                ...messages,
              ]);
              setMessage("");
            }}
            className="mt-3 rounded-full bg-[var(--ww-accent)] px-6 py-2.5 text-sm font-black text-white"
          >
            שליחת ברכה
          </button>
        </GlassCard>
        <div className="space-y-3">
          {messages.map((m) => (
            <GlassCard key={`${m.name}-${m.date}-${m.message.slice(0, 12)}`}>
              <MessageCircle className="mb-2 h-5 w-5 text-[var(--ww-accent)]" />
              <p className="text-sm leading-relaxed">{m.message}</p>
              <p className="mt-2 text-xs font-bold text-[var(--ww-text-muted)]">
                {m.name} · {m.date}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

export function GuestUploadSection() {
  const [items, setItems] = useState<GuestUploadItem[]>(DEMO_GUEST_UPLOADS);
  const [dragging, setDragging] = useState(false);
  const [uploaderName, setUploaderName] = useState("");

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      const next: GuestUploadItem[] = list.map((file, i) => ({
        id: `local-${Date.now()}-${i}`,
        type: file.type.startsWith("video/") ? "video" : "image",
        url: URL.createObjectURL(file),
        name: file.name,
        uploadedBy: uploaderName.trim() || "אורח",
        createdAt: new Date().toLocaleDateString("he-IL"),
      }));
      setItems((prev) => [...next, ...prev]);
    },
    [uploaderName]
  );

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) processFiles(e.target.files);
  }

  return (
    <AnimatedSection id="guest-upload" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Memories"
          title="זיכרונות מהאירוע"
          subtitle="העלו תמונות וסרטונים — שתפו את הרגעים שלכם (דמו מקומי)"
        />

        <GlassCard className="mb-8">
          <input
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            placeholder="השם שלכם"
            className="mb-4 w-full rounded-2xl border border-[var(--ww-border)] bg-transparent px-4 py-3 text-sm"
          />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center rounded-[var(--ww-radius)] border-2 border-dashed px-6 py-14 transition ${
              dragging
                ? "border-[var(--ww-accent)] bg-[var(--ww-accent-soft)]"
                : "border-[var(--ww-border)]"
            }`}
          >
            <Upload className="mb-4 h-10 w-10 text-[var(--ww-accent)]" />
            <p className="font-black">גררו תמונות או סרטונים לכאן</p>
            <p className="mt-1 text-sm text-[var(--ww-text-muted)]">JPG, PNG, MP4, MOV</p>
            <label className="mt-6 cursor-pointer rounded-full bg-[var(--ww-accent)] px-6 py-3 text-sm font-black text-white">
              בחירת קבצים
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={onFileChange}
              />
            </label>
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative overflow-hidden rounded-[var(--ww-radius)]"
            >
              {item.type === "video" ? (
                <div className="relative aspect-square bg-black">
                  <video src={item.url} className="h-full w-full object-cover" muted />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Video className="h-10 w-10 text-white" />
                  </div>
                </div>
              ) : (
                <img src={item.url} alt={item.name} className="aspect-square w-full object-cover" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                <p className="truncate text-xs font-bold text-white">{item.uploadedBy}</p>
                <p className="text-[10px] text-white/70">{item.createdAt}</p>
              </div>
              {item.type === "video" ? (
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                  וידאו
                </span>
              ) : (
                <Camera className="absolute left-2 top-2 h-4 w-4 text-white drop-shadow" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

export function PlaylistSection() {
  const { content } = useWeddingTheme();
  const [song, setSong] = useState("");
  const [songs, setSongs] = useState(["אהבתיה — Static", "עוד יהיה — Noa Kirel"]);

  return (
    <AnimatedSection id="playlist" className="bg-[var(--ww-bg-alt)] py-20 md:py-28">
      <div className="mx-auto max-w-xl px-6">
        <SectionHeading eyebrow="Playlist" title="רשימת השמעה" />
        <GlassCard>
          <Music className="mx-auto mb-4 h-8 w-8 text-[var(--ww-accent)]" />
          <p className="mb-6 text-center text-sm text-[var(--ww-text-muted)]">{content.playlistNote}</p>
          <div className="mb-4 flex gap-2">
            <input
              value={song}
              onChange={(e) => setSong(e.target.value)}
              placeholder="שם השיר + אמן"
              className="flex-1 rounded-2xl border border-[var(--ww-border)] bg-transparent px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (!song.trim()) return;
                setSongs([song.trim(), ...songs]);
                setSong("");
              }}
              className="rounded-2xl bg-[var(--ww-accent)] px-5 font-black text-white"
            >
              +
            </button>
          </div>
          <ul className="space-y-2">
            {songs.map((s) => (
              <li
                key={s}
                className="rounded-xl border border-[var(--ww-border)] px-4 py-3 text-sm font-semibold"
              >
                {s}
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </AnimatedSection>
  );
}

export function FooterSection() {
  const { content } = useWeddingTheme();
  return (
    <footer id="footer" className="border-t border-[var(--ww-border)] py-16 text-center">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="px-6"
      >
        <Heart className="mx-auto mb-4 h-6 w-6 text-[var(--ww-accent)]" />
        <p
          className="ww-display text-3xl font-light md:text-4xl"
          style={{ fontFamily: "var(--ww-font-display)" }}
        >
          {content.coupleNames}
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm text-[var(--ww-text-muted)]">{content.footerNote}</p>
        <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--ww-text-muted)]">
          Invistimo Wedding · Preview
        </p>
      </motion.div>
    </footer>
  );
}

export const WEDDING_SECTION_COMPONENTS: Record<
  WeddingSectionId,
  () => React.JSX.Element
> = {
  hero: HeroSection,
  countdown: CountdownSection,
  invitation: InvitationSection,
  "our-story": OurStorySection,
  "how-we-met": HowWeMetSection,
  proposal: ProposalSection,
  gallery: GallerySection,
  video: VideoSection,
  "event-details": EventDetailsSection,
  schedule: ScheduleSection,
  location: LocationSection,
  "dress-code": DressCodeSection,
  accommodations: AccommodationsSection,
  transportation: TransportationSection,
  faq: FaqSection,
  rsvp: RsvpSection,
  gifts: GiftsSection,
  guestbook: GuestbookSection,
  "guest-upload": GuestUploadSection,
  playlist: PlaylistSection,
  footer: FooterSection,
};
