"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { WeddingTemplate } from "@/types/weddingWebsite";
import type { TemplateProps } from "../shared/weddingUtils";
import { DEMO, VIDEOS, formatHebrewDate } from "../shared/weddingUtils";
import LocationDisplay from "@/app/components/LocationDisplay";
import WeddingVenueNav from "../WeddingVenueNav";
import {
  useCountdownTimer,
  useRsvpDemo,
  useGuestbook,
  useGuestUpload,
  usePlaylistDemo,
  useFaqAccordion,
} from "../shared/useWeddingInteractions";
import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";

const GREEN = "#6B9E78";

const fadeUp = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
  transition: { duration: 0.7 },
};

function WavyDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div className={`relative h-16 w-full ${flip ? "rotate-180" : ""}`}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path
          d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z"
          fill={flip ? "#E8F3E8" : "#F4FAF4"}
        />
      </svg>
    </div>
  );
}

function FloatingPetals() {
  const petals = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${(i * 13 + 5) % 95}%`,
    delay: i * 0.7,
    duration: 10 + (i % 5),
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {petals.map((p) => (
        <motion.span
          key={p.id}
          className="absolute text-2xl opacity-40"
          style={{ left: p.left, top: "-5%" }}
          animate={{ y: ["0vh", "110vh"], rotate: [0, 360], x: [0, 30, -20, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "linear" }}
        >
          🌸
        </motion.span>
      ))}
    </div>
  );
}

function Section({ id, children, className = "", wavy = false }: { id: string; children: React.ReactNode; className?: string; wavy?: boolean }) {
  return (
    <>
      {wavy && <WavyDivider flip />}
      <motion.section id={id} {...fadeUp} className={`relative scroll-mt-24 ${className}`}>
        {children}
      </motion.section>
      {wavy && <WavyDivider />}
    </>
  );
}

function StickyNav() {
  return (
    <nav className="sticky top-0 z-50 bg-[#F4FAF4]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-3 scrollbar-none">
        {WEDDING_SECTIONS.filter((s) => s.id !== "footer").map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-[#5C7A62] transition hover:bg-[#6B9E78]/15 hover:text-[#1F3324]"
          >
            {s.navLabel}
          </a>
        ))}
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#6B9E78]/40 to-transparent" />
    </nav>
  );
}

function HeroSection({ template }: { template: WeddingTemplate }) {
  return (
    <section id="hero" className="relative min-h-screen overflow-hidden bg-[#F4FAF4]">
      <FloatingPetals />
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="relative h-[50vh] lg:h-auto"
        >
          <img src={template.heroImage} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#F4FAF4]/80 lg:to-[#F4FAF4]" />
        </motion.div>
        <div className="flex flex-col justify-center px-8 py-16 lg:px-16">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-xs font-bold uppercase tracking-[0.4em]" style={{ color: GREEN }}>
            Garden Bloom
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 font-['Libre_Baskerville'] text-5xl leading-tight text-[#1F3324] md:text-6xl"
          >
            {DEMO.coupleNames}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-6 text-lg leading-relaxed text-[#5C7A62]">
            {DEMO.heroSubtitle}
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-4 font-['Libre_Baskerville'] italic" style={{ color: GREEN }}>
            {formatHebrewDate(DEMO.weddingDate)} · {DEMO.weddingTime}
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-10 flex gap-4">
            <a href="#rsvp" className="rounded-full px-8 py-4 text-sm font-bold text-white shadow-lg" style={{ backgroundColor: GREEN }}>
              אישור הגעה
            </a>
            <a href="#gallery" className="rounded-full border-2 px-8 py-4 text-sm font-bold" style={{ borderColor: GREEN, color: GREEN }}>
              גלריה
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function CountdownSection() {
  const time = useCountdownTimer(DEMO.weddingDate, DEMO.weddingTime);
  const units = [
    { label: "ימים", value: time.days },
    { label: "שעות", value: time.hours },
    { label: "דקות", value: time.minutes },
    { label: "שניות", value: time.seconds },
  ];
  return (
    <Section id="countdown" className="bg-[#E8F3E8] py-24" wavy>
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="font-['Libre_Baskerville'] text-4xl text-[#1F3324]">הספירה לאחור</h2>
        <div className="mt-12 flex flex-wrap justify-center gap-6">
          {units.map((u, i) => (
            <motion.div
              key={u.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-lg"
              style={{ border: `3px solid ${GREEN}` }}
            >
              <span className="font-['Libre_Baskerville'] text-3xl" style={{ color: GREEN }}>{String(u.value).padStart(2, "0")}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#5C7A62]">{u.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function InvitationSection() {
  return (
    <Section id="invitation" className="bg-[#F4FAF4] py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <span className="text-4xl">🌿</span>
        <h2 className="mt-4 font-['Libre_Baskerville'] text-4xl text-[#1F3324]">הזמנה חמה</h2>
        <div className="mt-10 rounded-[2rem] bg-white p-10 shadow-[0_20px_60px_rgba(107,158,120,0.12)]">
          <p className="text-lg leading-loose text-[#5C7A62]">{DEMO.invitationText}</p>
        </div>
      </div>
    </Section>
  );
}

function OurStorySection() {
  return (
    <Section id="our-story" className="bg-[#E8F3E8] py-24" wavy>
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Libre_Baskerville'] text-4xl text-[#1F3324]">הסיפור שלנו</h2>
        <div className="mt-12 space-y-6">
          {DEMO.storyParagraphs.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="rounded-3xl bg-white/80 p-8 backdrop-blur-sm"
            >
              <p className="text-lg leading-relaxed text-[#5C7A62]">{p}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function HowWeMetSection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="how-we-met" className="bg-[#F4FAF4] py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, rotate: -3 }} whileInView={{ opacity: 1, rotate: 0 }} viewport={{ once: true }} className="overflow-hidden rounded-full shadow-xl" style={{ border: `4px solid ${GREEN}` }}>
          <img src={template.galleryImages[0]} alt="" className="aspect-square w-full object-cover" />
        </motion.div>
        <div>
          <h2 className="font-['Libre_Baskerville'] text-4xl text-[#1F3324]">איך נפגשנו</h2>
          <p className="mt-6 text-lg leading-relaxed text-[#5C7A62]">{DEMO.howWeMet}</p>
        </div>
      </div>
    </Section>
  );
}

function ProposalSection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="proposal" className="bg-[#E8F3E8] py-24" wavy>
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2">
        <div className="md:order-2">
          <motion.div initial={{ opacity: 0, rotate: 3 }} whileInView={{ opacity: 1, rotate: 0 }} viewport={{ once: true }} className="overflow-hidden rounded-full shadow-xl" style={{ border: `4px solid ${GREEN}` }}>
            <img src={template.galleryImages[1]} alt="" className="aspect-square w-full object-cover" />
          </motion.div>
        </div>
        <div className="md:order-1">
          <h2 className="font-['Libre_Baskerville'] text-4xl text-[#1F3324]">ההצעה</h2>
          <p className="mt-6 text-lg leading-relaxed text-[#5C7A62]">{DEMO.proposalStory}</p>
        </div>
      </div>
    </Section>
  );
}

function GallerySection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="gallery" className="bg-[#F4FAF4] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center font-['Libre_Baskerville'] text-4xl text-[#1F3324]">גלריה</h2>
        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {template.galleryImages.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="overflow-hidden rounded-full shadow-lg"
              style={{ border: `3px solid ${GREEN}` }}
            >
              <img src={src} alt="" loading="lazy" decoding="async" className="aspect-square w-full object-cover transition hover:scale-110" />
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function VideoSection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="video" className="bg-[#E8F3E8] py-24" wavy>
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Libre_Baskerville'] text-4xl text-[#1F3324]">סרטון</h2>
        <div className="mt-10 overflow-hidden rounded-[2rem] shadow-xl">
          <video src={VIDEOS.forest} poster={template.heroImage} controls className="aspect-video w-full object-cover" />
        </div>
      </div>
    </Section>
  );
}

function EventDetailsSection() {
  const items = [
    { label: "תאריך", value: formatHebrewDate(DEMO.weddingDate) },
    { label: "שעה", value: DEMO.weddingTime },
    { label: "מיקום", value: DEMO.venueName },
  ];
  return (
    <Section id="event-details" className="bg-[#F4FAF4] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Libre_Baskerville'] text-4xl text-[#1F3324]">פרטי האירוע</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="rounded-3xl bg-white p-8 text-center shadow-md">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GREEN }}>{item.label}</p>
              <p className="mt-3 font-['Libre_Baskerville'] text-lg text-[#1F3324]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function ScheduleSection() {
  return (
    <Section id="schedule" className="bg-[#E8F3E8] py-24" wavy>
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Libre_Baskerville'] text-4xl text-[#1F3324]">לוח זמנים</h2>
        <div className="mt-10 space-y-4">
          {DEMO.schedule.map((item, i) => (
            <motion.div
              key={item.time}
              initial={{ opacity: 0, x: i % 2 ? 20 : -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-4 rounded-full bg-white px-6 py-4 shadow-sm"
            >
              <span className="rounded-full px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: GREEN }}>{item.time}</span>
              <div>
                <h3 className="font-bold text-[#1F3324]">{item.title}</h3>
                <p className="text-sm text-[#5C7A62]">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function LocationSection() {
  return (
    <Section id="location" className="bg-[#F4FAF4] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center font-['Libre_Baskerville'] text-4xl text-[#1F3324]">מיקום</h2>
        <LocationDisplay
          name={DEMO.venueName}
          address={DEMO.venueAddress}
          align="center"
          className="mt-4"
          nameClassName="text-xl text-[#1F3324]"
          addressClassName="mt-2 text-[#5C7A62]"
          iconClassName="h-5 w-5 shrink-0 text-[#5C7A62]"
        />
        <WeddingVenueNav
          address={DEMO.venueAddress}
          className="mt-5 flex flex-wrap items-center justify-center gap-3"
          linkClassName="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#1F3324] px-5 py-2 text-sm font-bold text-white"
        />
        <div className="mt-10 overflow-hidden rounded-[2rem] shadow-lg">
          <iframe title="map" className="aspect-[16/9] w-full border-0" loading="lazy" src={`https://maps.google.com/maps?q=${encodeURIComponent(DEMO.venueAddress)}&z=14&output=embed`} />
        </div>
      </div>
    </Section>
  );
}

function DressCodeSection() {
  return (
    <Section id="dress-code" className="bg-[#E8F3E8] py-24" wavy>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-['Libre_Baskerville'] text-4xl text-[#1F3324]">קוד לבוש</h2>
        <p className="mt-8 text-lg text-[#5C7A62]">{DEMO.dressCode}</p>
      </div>
    </Section>
  );
}

function AccommodationsSection() {
  return (
    <Section id="accommodations" className="bg-[#F4FAF4] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Libre_Baskerville'] text-4xl text-[#1F3324]">לינה</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {DEMO.accommodations.map((item) => (
            <div key={item.name} className="rounded-3xl bg-white p-6 shadow-md">
              <h3 className="font-bold text-[#1F3324]">{item.name}</h3>
              <p className="mt-2 text-sm text-[#5C7A62]">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function TransportationSection() {
  return (
    <Section id="transportation" className="bg-[#E8F3E8] py-24" wavy>
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Libre_Baskerville'] text-4xl text-[#1F3324]">הגעה</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {DEMO.transportation.map((item) => (
            <div key={item.title} className="rounded-3xl bg-white p-6 shadow-md">
              <h3 className="font-bold" style={{ color: GREEN }}>{item.title}</h3>
              <p className="mt-2 text-sm text-[#5C7A62]">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function FaqSection() {
  const { open, toggle } = useFaqAccordion(0);
  return (
    <Section id="faq" className="bg-[#F4FAF4] py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Libre_Baskerville'] text-4xl text-[#1F3324]">שאלות נפוצות</h2>
        <div className="mt-10 space-y-3">
          {DEMO.faq.map((item, i) => (
            <button key={item.question} type="button" onClick={() => toggle(i)} className="w-full rounded-2xl bg-white p-5 text-right shadow-sm transition hover:shadow-md">
              <h3 className="font-bold text-[#1F3324]">{item.question}</h3>
              {open === i && <p className="mt-3 text-sm text-[#5C7A62]">{item.answer}</p>}
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}

function RsvpSection() {
  const { rsvp, setRsvp, count, setCount, sent, setSent } = useRsvpDemo();
  return (
    <Section id="rsvp" className="bg-[#E8F3E8] py-24" wavy>
      <div className="mx-auto max-w-lg px-6">
        <h2 className="text-center font-['Libre_Baskerville'] text-4xl text-[#1F3324]">אישור הגעה</h2>
        {sent ? (
          <p className="mt-10 text-center text-xl" style={{ color: GREEN }}>🌸 תודה רבה!</p>
        ) : (
          <div className="mt-10 space-y-4 rounded-3xl bg-white p-8 shadow-lg">
            <div className="flex gap-3">
              {(["yes", "no"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setRsvp(v)} className={`flex-1 rounded-full py-3 text-sm font-bold ${rsvp === v ? "text-white" : "border-2"}`} style={rsvp === v ? { backgroundColor: GREEN } : { borderColor: GREEN, color: GREEN }}>
                  {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                </button>
              ))}
            </div>
            {rsvp === "yes" && <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full rounded-full border px-4 py-3 text-center" style={{ borderColor: GREEN }} />}
            <button type="button" onClick={() => rsvp && setSent(true)} disabled={!rsvp} className="w-full rounded-full py-4 text-sm font-bold text-white disabled:opacity-40" style={{ backgroundColor: GREEN }}>
              שליחה
            </button>
          </div>
        )}
      </div>
    </Section>
  );
}

function GiftsSection() {
  return (
    <Section id="gifts" className="bg-[#F4FAF4] py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-['Libre_Baskerville'] text-4xl text-[#1F3324]">מתנות</h2>
        <p className="mt-8 text-[#5C7A62]">{DEMO.giftsNote}</p>
        <a href="#" className="mt-6 inline-block rounded-full px-8 py-3 text-sm font-bold text-white" style={{ backgroundColor: GREEN }}>Bit</a>
      </div>
    </Section>
  );
}

function GuestbookSection() {
  const { message, setMessage, items, addMessage } = useGuestbook();
  return (
    <Section id="guestbook" className="bg-[#E8F3E8] py-24" wavy>
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Libre_Baskerville'] text-4xl text-[#1F3324]">ספר ברכות</h2>
        <div className="mt-10 mb-6 flex gap-3">
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ברכה..." className="flex-1 rounded-full border bg-white px-5 py-3 text-sm" style={{ borderColor: GREEN }} />
          <button type="button" onClick={addMessage} className="rounded-full px-6 py-3 text-sm font-bold text-white" style={{ backgroundColor: GREEN }}>שליחה</button>
        </div>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={`${item.name}-${item.date}`} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-[#1F3324]">{item.message}</p>
              <p className="mt-2 text-xs text-[#5C7A62]">{item.name} · {item.date}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function GuestUploadSection() {
  const { items, dragging, setDragging, uploaderName, setUploaderName, onDrop, onFileChange } = useGuestUpload();
  return (
    <Section id="guest-upload" className="bg-[#F4FAF4] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Libre_Baskerville'] text-4xl text-[#1F3324]">זיכרונות</h2>
        <input value={uploaderName} onChange={(e) => setUploaderName(e.target.value)} placeholder="שמכם" className="mt-10 mb-4 w-full rounded-full border bg-white px-5 py-3 text-sm" style={{ borderColor: GREEN }} />
        <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} className={`mb-8 rounded-3xl border-2 border-dashed p-12 text-center ${dragging ? "bg-[#E8F3E8]" : ""}`} style={{ borderColor: GREEN }}>
          <label className="cursor-pointer rounded-full px-6 py-3 text-sm font-bold text-white" style={{ backgroundColor: GREEN }}>
            העלאת קבצים
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={onFileChange} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-full shadow-md">
              <img src={item.url} alt="" className="aspect-square w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function PlaylistSection() {
  const { song, setSong, songs, addSong } = usePlaylistDemo();
  return (
    <Section id="playlist" className="bg-[#E8F3E8] py-24" wavy>
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Libre_Baskerville'] text-4xl text-[#1F3324]">מוזיקה</h2>
        <p className="mt-4 text-center text-[#5C7A62]">{DEMO.playlistNote}</p>
        <div className="mt-8 mb-6 flex gap-3">
          <input value={song} onChange={(e) => setSong(e.target.value)} placeholder="שיר..." className="flex-1 rounded-full border bg-white px-5 py-3 text-sm" style={{ borderColor: GREEN }} />
          <button type="button" onClick={addSong} className="rounded-full px-6 py-3 text-sm font-bold text-white" style={{ backgroundColor: GREEN }}>+</button>
        </div>
        <ul className="space-y-2">
          {songs.map((s) => (
            <li key={s} className="rounded-full bg-white px-6 py-3 shadow-sm">{s}</li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function FooterSection() {
  return (
    <Section id="footer" className="bg-[#6B9E78] py-20 text-center">
      <p className="font-['Libre_Baskerville'] text-3xl text-white">{DEMO.coupleNames}</p>
      <p className="mt-4 text-white/80">{DEMO.footerNote}</p>
    </Section>
  );
}

export default function GardenBloomSite({ template, embed }: TemplateProps) {
  return (
    <div className="wedding-website-root bg-[#F4FAF4] text-[#1F3324] scroll-smooth">
      {!embed && (
        <Link href="/wedding-website" className="fixed bottom-4 left-4 z-[55] rounded-full bg-white px-4 py-2 text-xs font-bold shadow-lg" style={{ color: GREEN }}>
          ← כל התבניות
        </Link>
      )}
      {!embed && <StickyNav />}
      <HeroSection template={template} />
      <CountdownSection />
      <InvitationSection />
      <OurStorySection />
      <HowWeMetSection template={template} />
      <ProposalSection template={template} />
      <GallerySection template={template} />
      <VideoSection template={template} />
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
