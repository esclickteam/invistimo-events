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

const TERRACOTTA = "#C4705A";
const BLUSH = "#FBF5F0";

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
  transition: { duration: 0.75 },
};

function SandShimmer() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-20"
      style={{
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
        animation: "ww-shimmer 4s infinite",
      }}
    />
  );
}

function ArchMask({ src, className = "" }: { src: string; className?: string }) {
  return (
    <div
      className={`overflow-hidden shadow-xl ${className}`}
      style={{ borderRadius: "50% 50% 20% 20% / 60% 60% 40% 40%" }}
    >
      <img src={src} alt="" className="aspect-[3/4] w-full object-cover" />
    </div>
  );
}

function Section({ id, children, className = "", diagonal = false }: { id: string; children: React.ReactNode; className?: string; diagonal?: boolean }) {
  return (
    <motion.section
      id={id}
      {...fadeUp}
      className={`relative scroll-mt-24 overflow-hidden ${className}`}
      style={diagonal ? { clipPath: "polygon(0 3%, 100% 0, 100% 97%, 0 100%)" } : undefined}
    >
      {children}
    </motion.section>
  );
}

function StickyNav() {
  return (
    <nav className="sticky top-0 z-50">
      <div
        className="mx-4 mt-2 flex items-center gap-1 overflow-x-auto px-4 py-3 backdrop-blur-md scrollbar-none"
        style={{
          background: "linear-gradient(135deg, rgba(251,245,240,0.95), rgba(245,232,222,0.95))",
          clipPath: "polygon(2% 0, 100% 0, 98% 100%, 0 100%)",
          borderBottom: `2px solid ${TERRACOTTA}`,
        }}
      >
        {WEDDING_SECTIONS.filter((s) => s.id !== "footer").map((s) => (
          <a key={s.id} href={`#${s.id}`} className="shrink-0 px-3 py-1.5 font-['Cormorant_Garamond'] text-sm font-semibold text-[#9A7060] transition hover:text-[#C4705A]">
            {s.navLabel}
          </a>
        ))}
      </div>
    </nav>
  );
}

function HeroSection({ template }: { template: WeddingTemplate }) {
  return (
    <section id="hero" className="relative min-h-screen overflow-hidden" style={{ backgroundColor: BLUSH }}>
      <SandShimmer />
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, x: -60, rotate: -2 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 1.2 }}
          className="relative z-10 flex flex-col justify-center px-8 py-20 lg:col-span-5 lg:px-12"
        >
          <p className="text-xs font-bold uppercase tracking-[0.5em]" style={{ color: TERRACOTTA }}>Desert Rose</p>
          <h1 className="mt-4 font-['Cormorant_Garamond'] text-6xl font-light leading-none text-[#3D2518] md:text-7xl">{DEMO.coupleNames}</h1>
          <p className="mt-8 max-w-md text-lg leading-relaxed text-[#9A7060]">{DEMO.heroSubtitle}</p>
          <p className="mt-6 font-['Cormorant_Garamond'] text-xl italic" style={{ color: TERRACOTTA }}>
            {formatHebrewDate(DEMO.weddingDate)} · {DEMO.weddingTime}
          </p>
          <a href="#rsvp" className="mt-10 inline-block w-fit px-10 py-4 text-sm font-bold text-white shadow-lg" style={{ backgroundColor: TERRACOTTA, clipPath: "polygon(5% 0, 100% 0, 95% 100%, 0 100%)" }}>
            אישור הגעה
          </a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: 3 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative flex items-center justify-center p-8 lg:col-span-7"
        >
          <ArchMask src={template.heroImage} className="w-full max-w-lg" />
        </motion.div>
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
    <Section id="countdown" className="bg-[#F5E8DE] py-24" diagonal>
      <SandShimmer />
      <div className="relative mx-auto max-w-5xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">הספירה לאחור</h2>
        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {units.map((u, i) => (
            <motion.div
              key={u.label}
              initial={{ opacity: 0, y: 20, rotate: i % 2 ? 2 : -2 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative bg-[#FBF5F0] p-8 text-center shadow-lg"
              style={{ clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0 100%)" }}
            >
              <span className="font-['Cormorant_Garamond'] text-5xl" style={{ color: TERRACOTTA }}>{String(u.value).padStart(2, "0")}</span>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-[#9A7060]">{u.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function InvitationSection() {
  return (
    <Section id="invitation" className="bg-[#FBF5F0] py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">הזמנה חמה</h2>
        <div className="relative mt-10 p-10" style={{ backgroundColor: "#F5E8DE", clipPath: "polygon(0 5%, 100% 0, 100% 95%, 0 100%)" }}>
          <SandShimmer />
          <p className="relative text-lg leading-loose text-[#9A7060]">{DEMO.invitationText}</p>
        </div>
      </div>
    </Section>
  );
}

function OurStorySection() {
  return (
    <Section id="our-story" className="bg-[#F5E8DE] py-24" diagonal>
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">הסיפור שלנו</h2>
        <div className="mt-12 space-y-8">
          {DEMO.storyParagraphs.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: i % 2 ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="text-lg leading-relaxed text-[#9A7060]"
              style={{ marginRight: i % 2 ? 0 : "10%", marginLeft: i % 2 ? "10%" : 0 }}
            >
              {p}
            </motion.p>
          ))}
        </div>
      </div>
    </Section>
  );
}

function HowWeMetSection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="how-we-met" className="bg-[#FBF5F0] py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-12">
        <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="lg:col-span-5 lg:-rotate-2">
          <ArchMask src={template.galleryImages[0]} />
        </motion.div>
        <div className="lg:col-span-7 lg:pl-8">
          <h2 className="font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">איך נפגשנו</h2>
          <p className="mt-6 text-lg leading-relaxed text-[#9A7060]">{DEMO.howWeMet}</p>
        </div>
      </div>
    </Section>
  );
}

function ProposalSection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="proposal" className="bg-[#F5E8DE] py-24" diagonal>
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-12">
        <div className="lg:order-2 lg:col-span-5 lg:rotate-2">
          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <ArchMask src={template.galleryImages[1]} />
          </motion.div>
        </div>
        <div className="lg:order-1 lg:col-span-7">
          <h2 className="font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">ההצעה</h2>
          <p className="mt-6 text-lg leading-relaxed text-[#9A7060]">{DEMO.proposalStory}</p>
        </div>
      </div>
    </Section>
  );
}

function GallerySection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="gallery" className="bg-[#FBF5F0] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">גלריה</h2>
        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {template.galleryImages.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, rotate: i % 2 ? 5 : -5 }}
              whileInView={{ opacity: 1, rotate: i % 2 ? 2 : -2 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={i % 2 === 1 ? "mt-8" : ""}
            >
              <ArchMask src={src} />
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function VideoSection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="video" className="bg-[#F5E8DE] py-24" diagonal>
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">סרטון</h2>
        <div className="relative mt-10 overflow-hidden shadow-2xl" style={{ clipPath: "polygon(3% 0, 100% 0, 97% 100%, 0 100%)" }}>
          <video src={VIDEOS.romantic} poster={template.heroImage} controls className="aspect-video w-full object-cover" />
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
    <Section id="event-details" className="bg-[#FBF5F0] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">פרטי האירוע</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map((item, i) => (
            <div key={item.label} className="bg-[#F5E8DE] p-8 text-center" style={{ transform: `rotate(${i === 1 ? 0 : i === 0 ? -1 : 1}deg)` }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: TERRACOTTA }}>{item.label}</p>
              <p className="mt-3 font-['Cormorant_Garamond'] text-xl text-[#3D2518]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function ScheduleSection() {
  return (
    <Section id="schedule" className="bg-[#F5E8DE] py-24" diagonal>
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">לוח זמנים</h2>
        <div className="mt-10 space-y-4">
          {DEMO.schedule.map((item, i) => (
            <motion.div
              key={item.time}
              initial={{ opacity: 0, x: i % 2 ? 30 : -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-start gap-4 bg-[#FBF5F0] p-5 shadow-md"
              style={{ marginRight: i % 2 ? "5%" : "0", marginLeft: i % 2 ? "0" : "5%", clipPath: "polygon(2% 0, 100% 0, 98% 100%, 0 100%)" }}
            >
              <span className="font-['Cormorant_Garamond'] text-2xl" style={{ color: TERRACOTTA }}>{item.time}</span>
              <div>
                <h3 className="font-semibold text-[#3D2518]">{item.title}</h3>
                <p className="text-sm text-[#9A7060]">{item.description}</p>
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
    <Section id="location" className="bg-[#FBF5F0] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">מיקום</h2>
        <LocationDisplay
          name={DEMO.venueName}
          address={DEMO.venueAddress}
          align="center"
          className="mt-4"
          nameClassName="text-xl text-[#3D2518]"
          addressClassName="mt-2 text-[#9A7060]"
          iconClassName="h-5 w-5 shrink-0 text-[#C4785A]"
        />
        <WeddingVenueNav
          address={DEMO.venueAddress}
          className="mt-5 flex flex-wrap items-center justify-center gap-3"
          linkClassName="inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-[#3D2518]"
        />
        <div className="relative mx-auto mt-10 max-w-2xl overflow-hidden shadow-xl" style={{ borderRadius: "50% 50% 25% 25% / 40% 40% 60% 60%", border: `3px solid ${TERRACOTTA}` }}>
          <iframe title="map" className="aspect-[4/3] w-full border-0 sepia-[20%]" loading="lazy" src={`https://maps.google.com/maps?q=${encodeURIComponent(DEMO.venueAddress)}&z=14&output=embed`} />
        </div>
      </div>
    </Section>
  );
}

function DressCodeSection() {
  return (
    <Section id="dress-code" className="bg-[#F5E8DE] py-24" diagonal>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">קוד לבוש</h2>
        <p className="mt-8 text-lg text-[#9A7060]">{DEMO.dressCode}</p>
      </div>
    </Section>
  );
}

function AccommodationsSection() {
  return (
    <Section id="accommodations" className="bg-[#FBF5F0] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">לינה</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {DEMO.accommodations.map((item, i) => (
            <div key={item.name} className="bg-[#F5E8DE] p-6" style={{ transform: `rotate(${i === 1 ? 0 : i === 0 ? -2 : 2}deg)` }}>
              <h3 className="font-['Cormorant_Garamond'] text-xl text-[#3D2518]">{item.name}</h3>
              <p className="mt-2 text-sm text-[#9A7060]">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function TransportationSection() {
  return (
    <Section id="transportation" className="bg-[#F5E8DE] py-24" diagonal>
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">הגעה</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {DEMO.transportation.map((item) => (
            <div key={item.title} className="bg-[#FBF5F0] p-6 shadow-md">
              <h3 className="font-semibold" style={{ color: TERRACOTTA }}>{item.title}</h3>
              <p className="mt-2 text-sm text-[#9A7060]">{item.description}</p>
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
    <Section id="faq" className="bg-[#FBF5F0] py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">שאלות נפוצות</h2>
        <div className="mt-10 space-y-3">
          {DEMO.faq.map((item, i) => (
            <button key={item.question} type="button" onClick={() => toggle(i)} className="w-full bg-[#F5E8DE] p-5 text-right transition hover:shadow-md" style={{ clipPath: "polygon(1% 0, 100% 0, 99% 100%, 0 100%)" }}>
              <h3 className="font-['Cormorant_Garamond'] text-lg text-[#3D2518]">{item.question}</h3>
              {open === i && <p className="mt-3 text-sm text-[#9A7060]">{item.answer}</p>}
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
    <Section id="rsvp" className="bg-[#F5E8DE] py-24" diagonal>
      <div className="mx-auto max-w-lg px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">אישור הגעה</h2>
        {sent ? (
          <p className="mt-10 text-center text-xl" style={{ color: TERRACOTTA }}>תודה רבה! 🌵</p>
        ) : (
          <div className="relative mt-10 space-y-4 bg-[#FBF5F0] p-8 shadow-lg">
            <SandShimmer />
            <div className="relative flex gap-3">
              {(["yes", "no"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setRsvp(v)} className={`flex-1 py-3 text-sm font-bold ${rsvp === v ? "text-white" : "border-2"}`} style={rsvp === v ? { backgroundColor: TERRACOTTA } : { borderColor: TERRACOTTA, color: TERRACOTTA }}>
                  {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                </button>
              ))}
            </div>
            {rsvp === "yes" && <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} className="relative w-full border bg-white px-4 py-3 text-center" style={{ borderColor: TERRACOTTA }} />}
            <button type="button" onClick={() => rsvp && setSent(true)} disabled={!rsvp} className="relative w-full py-4 text-sm font-bold text-white disabled:opacity-40" style={{ backgroundColor: TERRACOTTA }}>
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
    <Section id="gifts" className="bg-[#FBF5F0] py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">מתנות</h2>
        <p className="mt-8 text-[#9A7060]">{DEMO.giftsNote}</p>
        <a href="#" className="mt-6 inline-block px-8 py-3 text-sm font-bold text-white" style={{ backgroundColor: TERRACOTTA, clipPath: "polygon(5% 0, 100% 0, 95% 100%, 0 100%)" }}>
          Bit
        </a>
      </div>
    </Section>
  );
}

function GuestbookSection() {
  const { message, setMessage, items, addMessage } = useGuestbook();
  return (
    <Section id="guestbook" className="bg-[#F5E8DE] py-24" diagonal>
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">ספר ברכות</h2>
        <div className="mt-10 mb-6 flex gap-3">
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ברכה..." className="flex-1 border bg-[#FBF5F0] px-4 py-3 text-sm" style={{ borderColor: TERRACOTTA }} />
          <button type="button" onClick={addMessage} className="px-6 py-3 text-sm font-bold text-white" style={{ backgroundColor: TERRACOTTA }}>שליחה</button>
        </div>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={`${item.name}-${item.date}`} className="bg-[#FBF5F0] p-5 shadow-sm">
              <p className="font-['Cormorant_Garamond'] text-lg text-[#3D2518]">{item.message}</p>
              <p className="mt-2 text-xs text-[#9A7060]">{item.name} · {item.date}</p>
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
    <Section id="guest-upload" className="bg-[#FBF5F0] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">זיכרונות</h2>
        <input value={uploaderName} onChange={(e) => setUploaderName(e.target.value)} placeholder="שמכם" className="mt-10 mb-4 w-full border bg-white px-4 py-3 text-sm" style={{ borderColor: TERRACOTTA }} />
        <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} className={`relative mb-8 border-2 border-dashed p-12 text-center ${dragging ? "bg-[#F5E8DE]" : ""}`} style={{ borderColor: TERRACOTTA }}>
          <SandShimmer />
          <label className="relative cursor-pointer px-6 py-3 text-sm font-bold text-white" style={{ backgroundColor: TERRACOTTA }}>
            העלאת קבצים
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={onFileChange} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {items.map((item, i) => (
            <div key={item.id} className="overflow-hidden shadow-md" style={{ transform: `rotate(${i % 2 ? 2 : -2}deg)` }}>
              <ArchMask src={item.url} />
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
    <Section id="playlist" className="bg-[#F5E8DE] py-24" diagonal>
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl text-[#3D2518]">מוזיקה</h2>
        <p className="mt-4 text-center text-[#9A7060]">{DEMO.playlistNote}</p>
        <div className="mt-8 mb-6 flex gap-3">
          <input value={song} onChange={(e) => setSong(e.target.value)} placeholder="שיר..." className="flex-1 border bg-[#FBF5F0] px-4 py-3 text-sm" style={{ borderColor: TERRACOTTA }} />
          <button type="button" onClick={addSong} className="px-6 py-3 text-sm font-bold text-white" style={{ backgroundColor: TERRACOTTA }}>+</button>
        </div>
        <ul className="space-y-2">
          {songs.map((s) => (
            <li key={s} className="bg-[#FBF5F0] px-5 py-3 font-['Cormorant_Garamond'] text-lg">{s}</li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function FooterSection() {
  return (
    <Section id="footer" className="relative bg-[#C4705A] py-20 text-center text-white">
      <SandShimmer />
      <p className="relative font-['Cormorant_Garamond'] text-4xl font-light">{DEMO.coupleNames}</p>
      <p className="relative mt-4 text-white/85">{DEMO.footerNote}</p>
    </Section>
  );
}

export default function DesertRoseSite({ template, embed }: TemplateProps) {
  return (
    <div className="wedding-website-root bg-[#FBF5F0] text-[#3D2518] scroll-smooth">
      {!embed && (
        <Link href="/wedding-website" className="fixed bottom-4 left-4 z-[55] px-4 py-2 text-xs font-bold text-white shadow-lg" style={{ backgroundColor: TERRACOTTA, clipPath: "polygon(5% 0, 100% 0, 95% 100%, 0 100%)" }}>
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
