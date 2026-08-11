"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { WeddingTemplate } from "@/types/weddingWebsite";
import type { TemplateProps } from "../shared/weddingUtils";
import { useWeddingContent } from "../shared/WeddingSiteContext";
import ShuttleRide from "../illustrations/ShuttleRide";
import { VIDEOS, formatHebrewDate } from "../shared/weddingUtils";
import {
  useCountdownTimer,
  useWeddingRsvp,
  useGuestbook,
  useGuestUpload,
  usePlaylistDemo,
  useFaqAccordion,
} from "../shared/useWeddingInteractions";
import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";

const fadeIn = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.8 },
};

function GoldParticles() {
  const particles = Array.from({ length: 35 }, (_, i) => ({
    id: i,
    left: `${(i * 17 + 7) % 100}%`,
    delay: (i * 0.3) % 5,
    size: 2 + (i % 4),
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-[#D4AF37]"
          style={{ left: p.left, width: p.size, height: p.size, bottom: "-10px" }}
          animate={{ y: [0, -800], opacity: [0, 0.9, 0] }}
          transition={{ duration: 8 + (p.id % 4), repeat: Infinity, delay: p.delay, ease: "linear" }}
        />
      ))}
    </div>
  );
}

function Glass({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[#D4AF37]/20 bg-white/5 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

function Section({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.section id={id} {...fadeIn} className={`relative scroll-mt-20 ${className}`}>
      {children}
    </motion.section>
  );
}

function StickyNav() {
  return (
    <nav className="sticky top-0 z-50 px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto rounded-full border border-[#D4AF37]/25 bg-black/60 px-4 py-2 backdrop-blur-2xl scrollbar-none">
        {WEDDING_SECTIONS.filter((s) => s.id !== "footer").map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-[#A89BB0] transition hover:bg-[#D4AF37]/15 hover:text-[#D4AF37]"
          >
            {s.navLabel}
          </a>
        ))}
      </div>
    </nav>
  );
}

function HeroSection() {
  const DEMO = useWeddingContent();
  return (
    <section id="hero" className="relative flex min-h-screen flex-col items-center justify-center bg-black px-6 py-16">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-sm shadow-[0_0_80px_rgba(212,175,55,0.15)]">
        <div className="relative aspect-[2.35/1] w-full bg-black">
          <video src={VIDEOS.rings} autoPlay muted loop playsInline className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />
          <GoldParticles />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, letterSpacing: "0.5em" }}
            transition={{ duration: 1.2 }}
            className="mb-4 text-[10px] font-bold uppercase text-[#D4AF37]"
          >
            Midnight Velvet
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="font-['Playfair_Display'] text-5xl font-semibold md:text-7xl"
            style={{ textShadow: "0 0 40px rgba(212,175,55,0.4)" }}
          >
            {DEMO.coupleNames}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-6 max-w-lg text-white/75">
            {DEMO.heroSubtitle}
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mt-4 text-sm text-[#D4AF37]">
            {formatHebrewDate(DEMO.weddingDate)}
          </motion.p>
        </div>
      </div>
      <div className="mt-8 h-1 w-32 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
    </section>
  );
}

function CountdownSection() {
  const DEMO = useWeddingContent();
  const time = useCountdownTimer(DEMO.weddingDate, DEMO.weddingTime);
  const units = [
    { label: "ימים", value: time.days },
    { label: "שעות", value: time.hours },
    { label: "דקות", value: time.minutes },
    { label: "שניות", value: time.seconds },
  ];
  return (
    <Section id="countdown" className="bg-[#0D0B10] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">הספירה לאחור</h2>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {units.map((u, i) => (
            <motion.div key={u.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Glass className="text-center">
                <span className="font-['Playfair_Display'] text-5xl text-[#D4AF37] md:text-6xl">{String(u.value).padStart(2, "0")}</span>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#A89BB0]">{u.label}</p>
              </Glass>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function InvitationSection() {
  const DEMO = useWeddingContent();
  return (
    <Section id="invitation" className="bg-[#16131C] py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-['Playfair_Display'] text-4xl text-[#F5F0E8]">הזמנה חמה</h2>
        <Glass className="mt-10">
          <p className="text-lg leading-loose text-[#A89BB0]">{DEMO.invitationText}</p>
        </Glass>
      </div>
    </Section>
  );
}

function OurStorySection() {
  const DEMO = useWeddingContent();
  return (
    <Section id="our-story" className="bg-[#0D0B10] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">הסיפור שלנו</h2>
        <div className="mt-12 space-y-8">
          {DEMO.storyParagraphs.map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: i % 2 ? 40 : -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}>
              <Glass>
                <p className="text-lg leading-relaxed text-[#A89BB0]">{p}</p>
              </Glass>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function HowWeMetSection({ template }: { template: WeddingTemplate }) {
  const DEMO = useWeddingContent();
  return (
    <Section id="how-we-met" className="bg-[#16131C] py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-2">
        <Glass className="overflow-hidden p-0">
          <img src={template.galleryImages[0]} alt="" className="aspect-[4/5] w-full object-cover" />
        </Glass>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#D4AF37]">Chapter I</p>
          <h2 className="mt-2 font-['Playfair_Display'] text-4xl text-[#F5F0E8]">איך נפגשנו</h2>
          <p className="mt-6 text-lg leading-relaxed text-[#A89BB0]">{DEMO.howWeMet}</p>
        </div>
      </div>
    </Section>
  );
}

function ProposalSection({ template }: { template: WeddingTemplate }) {
  const DEMO = useWeddingContent();
  return (
    <Section id="proposal" className="bg-[#0D0B10] py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-2">
        <div className="lg:order-2">
          <Glass className="overflow-hidden p-0">
            <img src={template.galleryImages[1]} alt="" className="aspect-[4/5] w-full object-cover" />
          </Glass>
        </div>
        <div className="lg:order-1">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#D4AF37]">Chapter II</p>
          <h2 className="mt-2 font-['Playfair_Display'] text-4xl text-[#F5F0E8]">ההצעה</h2>
          <p className="mt-6 text-lg leading-relaxed text-[#A89BB0]">{DEMO.proposalStory}</p>
        </div>
      </div>
    </Section>
  );
}

function GallerySection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="gallery" className="bg-[#16131C] py-24">
      <div className="px-6">
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">גלריה</h2>
        <div className="mt-10 flex gap-5 overflow-x-auto pb-6 scrollbar-none">
          {template.galleryImages.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="h-80 w-64 shrink-0 overflow-hidden rounded-xl border border-[#D4AF37]/30 shadow-[0_0_30px_rgba(212,175,55,0.1)]"
            >
              <img src={src} alt="" className="h-full w-full object-cover transition duration-500 hover:scale-110" />
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function VideoSection() {
  return (
    <Section id="video" className="bg-[#0D0B10] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">סרטון</h2>
        <Glass className="mt-10 overflow-hidden p-0">
          <div className="relative aspect-[2.35/1]">
            <video src={VIDEOS.couple} controls className="h-full w-full object-cover" />
          </div>
        </Glass>
      </div>
    </Section>
  );
}

function EventDetailsSection() {
  const DEMO = useWeddingContent();
  const items = [
    { label: "תאריך", value: formatHebrewDate(DEMO.weddingDate) },
    { label: "שעה", value: DEMO.weddingTime },
    { label: "מיקום", value: DEMO.venueName },
  ];
  return (
    <Section id="event-details" className="bg-[#16131C] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">פרטי האירוע</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <Glass key={item.label} className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">{item.label}</p>
              <p className="mt-3 font-bold text-[#F5F0E8]">{item.value}</p>
            </Glass>
          ))}
        </div>
      </div>
    </Section>
  );
}

function ScheduleSection() {
  const DEMO = useWeddingContent();
  return (
    <Section id="schedule" className="bg-[#0D0B10] py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">לוח זמנים</h2>
        <div className="mt-10 space-y-4">
          {DEMO.schedule.map((item, i) => (
            <motion.div key={item.time} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Glass className="flex items-center gap-6">
                <span className="font-['Playfair_Display'] text-2xl text-[#D4AF37]">{item.time}</span>
                <div>
                  <h3 className="font-bold text-[#F5F0E8]">{item.title}</h3>
                  <p className="text-sm text-[#A89BB0]">{item.description}</p>
                </div>
              </Glass>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function LocationSection() {
  const DEMO = useWeddingContent();
  return (
    <Section id="location" className="bg-[#16131C] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">מיקום</h2>
        <p className="mt-2 text-center text-[#A89BB0]">{DEMO.venueAddress}</p>
        <Glass className="mt-10 overflow-hidden p-0">
          <iframe
            title="map"
            className="aspect-[16/9] w-full border-0 grayscale"
            loading="lazy"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(DEMO.venueAddress)}&z=14&output=embed`}
          />
        </Glass>
      </div>
    </Section>
  );
}

function DressCodeSection() {
  const DEMO = useWeddingContent();
  return (
    <Section id="dress-code" className="bg-[#0D0B10] py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-['Playfair_Display'] text-4xl text-[#F5F0E8]">קוד לבוש</h2>
        <Glass className="mt-10">
          <p className="text-lg text-[#A89BB0]">{DEMO.dressCode}</p>
        </Glass>
      </div>
    </Section>
  );
}

function AccommodationsSection() {
  const DEMO = useWeddingContent();
  return (
    <Section id="accommodations" className="bg-[#16131C] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">לינה</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {DEMO.accommodations.map((item) => (
            <Glass key={item.name}>
              <h3 className="font-bold text-[#F5F0E8]">{item.name}</h3>
              <p className="mt-2 text-sm text-[#A89BB0]">{item.note}</p>
            </Glass>
          ))}
        </div>
      </div>
    </Section>
  );
}

function TransportationSection() {
  const DEMO = useWeddingContent();
  return (
    <Section id="transportation" className="bg-[#0D0B10] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <ShuttleRide accent="#D4AF37" className="mb-8 mt-6" />
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">הגעה</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {DEMO.transportation.map((item) => (
            <Glass key={item.title}>
              <h3 className="font-bold text-[#D4AF37]">{item.title}</h3>
              <p className="mt-2 text-sm text-[#A89BB0]">{item.description}</p>
            </Glass>
          ))}
        </div>
      </div>
    </Section>
  );
}

function FaqSection() {
  const DEMO = useWeddingContent();
  const { open, toggle } = useFaqAccordion(0);
  return (
    <Section id="faq" className="bg-[#16131C] py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">שאלות נפוצות</h2>
        <div className="mt-10 space-y-3">
          {DEMO.faq.map((item, i) => (
            <button key={item.question} type="button" onClick={() => toggle(i)} className="w-full text-right">
              <Glass className="transition hover:border-[#D4AF37]/50">
                <h3 className="font-bold text-[#F5F0E8]">{item.question}</h3>
                {open === i && <p className="mt-3 text-sm text-[#A89BB0]">{item.answer}</p>}
              </Glass>
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}

function RsvpSection() {
  const { rsvp, setRsvp, count, setCount, sent, submit, saving, error, guestName } = useWeddingRsvp();
  return (
    <Section id="rsvp" className="bg-[#0D0B10] py-24">
      <div className="mx-auto max-w-lg px-6">
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">אישור הגעה</h2>
        {sent ? (
          <p className="mt-10 text-center text-[#D4AF37]">תודה רבה!</p>
        ) : (
          <Glass className="mt-10 space-y-4">
            <div className="flex gap-3">
              {(["yes", "no"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRsvp(v)}
                  className={`flex-1 rounded-lg py-3 text-sm font-bold ${rsvp === v ? "bg-[#D4AF37] text-black" : "border border-[#D4AF37]/30 text-[#A89BB0]"}`}
                >
                  {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                </button>
              ))}
            </div>
            {rsvp === "yes" && (
              <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full rounded-lg border border-[#D4AF37]/30 bg-black/40 px-4 py-3 text-[#F5F0E8]" />
            )}
            <button type="button" onClick={() => void submit()} disabled={!rsvp || saving} className="w-full rounded-lg bg-[#D4AF37] py-4 font-bold text-black disabled:opacity-40">
              שליחה
            </button>
          </Glass>
        )}
      </div>
    </Section>
  );
}

function GiftsSection() {
  const DEMO = useWeddingContent();
  return (
    <Section id="gifts" className="bg-[#16131C] py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-['Playfair_Display'] text-4xl text-[#F5F0E8]">מתנות</h2>
        <Glass className="mt-10">
          <p className="text-[#A89BB0]">{DEMO.giftsNote}</p>
          <a href="#" className="mt-6 inline-block rounded-full border border-[#D4AF37] px-8 py-3 text-sm font-bold text-[#D4AF37]">
            Bit
          </a>
        </Glass>
      </div>
    </Section>
  );
}

function GuestbookSection() {
  const { message, setMessage, items, addMessage } = useGuestbook();
  return (
    <Section id="guestbook" className="bg-[#0D0B10] py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">ספר ברכות</h2>
        <Glass className="mt-10 mb-6 flex gap-3">
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ברכה..." className="flex-1 bg-transparent text-[#F5F0E8] outline-none placeholder:text-[#A89BB0]" />
          <button type="button" onClick={addMessage} className="rounded-lg bg-[#D4AF37] px-5 py-2 text-sm font-bold text-black">שליחה</button>
        </Glass>
        <div className="space-y-3">
          {items.map((item) => (
            <Glass key={`${item.name}-${item.date}`}>
              <p className="text-[#F5F0E8]">{item.message}</p>
              <p className="mt-2 text-xs text-[#A89BB0]">{item.name} · {item.date}</p>
            </Glass>
          ))}
        </div>
      </div>
    </Section>
  );
}

function GuestUploadSection() {
  const { items, dragging, setDragging, uploaderName, setUploaderName, onDrop, onFileChange } = useGuestUpload();
  return (
    <Section id="guest-upload" className="bg-[#16131C] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">זיכרונות</h2>
        <input value={uploaderName} onChange={(e) => setUploaderName(e.target.value)} placeholder="שמכם" className="mt-10 mb-4 w-full rounded-lg border border-[#D4AF37]/30 bg-black/40 px-4 py-3 text-[#F5F0E8]" />
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`mb-8 rounded-xl border-2 border-dashed p-12 text-center ${dragging ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-[#D4AF37]/30"}`}
        >
          <label className="cursor-pointer rounded-lg bg-[#D4AF37] px-6 py-3 text-sm font-bold text-black">
            העלאת קבצים
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={onFileChange} />
          </label>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {items.map((item) => (
            <div key={item.id} className="h-40 w-40 shrink-0 overflow-hidden rounded-xl border border-[#D4AF37]/20">
              <img src={item.url} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function PlaylistSection() {
  const DEMO = useWeddingContent();
  const { song, setSong, songs, addSong } = usePlaylistDemo();
  return (
    <Section id="playlist" className="bg-[#0D0B10] py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#F5F0E8]">מוזיקה</h2>
        <p className="mt-4 text-center text-[#A89BB0]">{DEMO.playlistNote}</p>
        <Glass className="mt-8 mb-6 flex gap-3">
          <input value={song} onChange={(e) => setSong(e.target.value)} placeholder="שיר..." className="flex-1 bg-transparent text-[#F5F0E8] outline-none" />
          <button type="button" onClick={addSong} className="rounded-lg bg-[#D4AF37] px-5 py-2 text-sm font-bold text-black">+</button>
        </Glass>
        <ul className="space-y-2">
          {songs.map((s) => (
            <li key={s} className="rounded-lg border border-[#D4AF37]/20 px-5 py-3 text-[#F5F0E8]">{s}</li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function FooterSection() {
  const DEMO = useWeddingContent();
  return (
    <Section id="footer" className="border-t border-[#D4AF37]/20 bg-black py-20 text-center">
      <h2 className="font-['Playfair_Display'] text-4xl text-[#D4AF37]" style={{ textShadow: "0 0 30px rgba(212,175,55,0.5)" }}>
        {DEMO.coupleNames}
      </h2>
      <p className="mt-4 text-[#A89BB0]">{DEMO.footerNote}</p>
    </Section>
  );
}

export default function MidnightVelvetSite({ template, embed, hideDemoBadge }: TemplateProps) {
  return (
    <div className="wedding-website-root min-h-screen bg-[#0D0B10] text-[#F5F0E8] scroll-smooth">
      {!embed && !hideDemoBadge && (
        <Link href="/wedding-website" className="fixed bottom-4 left-4 z-[55] rounded-full border border-[#D4AF37]/30 bg-black/80 px-4 py-2 text-xs font-bold text-[#D4AF37] backdrop-blur-md">
          ← כל התבניות
        </Link>
      )}
      {!embed && <StickyNav />}
      <HeroSection />
      <CountdownSection />
      <InvitationSection />
      <OurStorySection />
      <HowWeMetSection template={template} />
      <ProposalSection template={template} />
      <GallerySection template={template} />
      <VideoSection />
      <EventDetailsSection />
      <ScheduleSection />
      <LocationSection />
      <DressCodeSection />
      <AccommodationsSection />
      <TransportationSection />
      <FaqSection />
      <RsvpSection />
      <GiftsSection />
      <GuestbookSection />
      <GuestUploadSection />
      <PlaylistSection />
      <FooterSection />
    </div>
  );
}
