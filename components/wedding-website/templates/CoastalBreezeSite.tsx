"use client";

import { motion } from "framer-motion";
import type { WeddingTemplate } from "@/types/weddingWebsite";
import type { TemplateProps } from "../shared/weddingUtils";
import WeddingMedia from "../editable/WeddingMedia";
import { DEMO, VIDEOS, formatHebrewDate } from "../shared/weddingUtils";
import LocationDisplay from "@/app/components/LocationDisplay";
import WeddingVenueNav from "../WeddingVenueNav";
import {
  useGuestbook,
  useGuestUpload,
  usePlaylistDemo,
  useFaqAccordion,
} from "../shared/useWeddingInteractions";
import WeddingCountdownGrid from "../shared/WeddingCountdownGrid";
import WeddingTemplateRsvp from "../WeddingTemplateRsvp";
import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";
import WeddingGiftActions from "../WeddingGiftActions";
import EventUploadMedia from "../shared/EventUploadMedia";

const BLUE = "#3D8BBA";
const SAND = "#F5E6C8";

const fadeUp = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
  transition: { duration: 0.75 },
};

function WaveBottom() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 overflow-hidden">
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="h-full w-full">
        <motion.path
          d="M0,30 C240,50 480,10 720,30 C960,50 1200,10 1440,30 L1440,60 L0,60 Z"
          fill={SAND}
          animate={{ d: ["M0,30 C240,50 480,10 720,30 C960,50 1200,10 1440,30 L1440,60 L0,60 Z", "M0,30 C240,10 480,50 720,30 C960,10 1200,50 1440,30 L1440,60 L0,60 Z"] }}
          transition={{ duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}

function Section({ id, children, className = "", wave = false }: { id: string; children: React.ReactNode; className?: string; wave?: boolean }) {
  return (
    <motion.section id={id} {...fadeUp} className={`relative scroll-mt-24 pb-16 ${className}`}>
      {children}
      {wave && <WaveBottom />}
    </motion.section>
  );
}

function StickyNav() {
  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-b from-[#F0F8FF] to-[#F0F8FF]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-3 scrollbar-none">
        {WEDDING_SECTIONS.filter((s) => s.id !== "footer").map((s) => (
          <a key={s.id} href={`#${s.id}`} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-[#5A7A94] transition hover:bg-[#3D8BBA]/10 hover:text-[#3D8BBA]">
            {s.navLabel}
          </a>
        ))}
      </div>
    </nav>
  );
}

function HeroSection({ template }: { template: WeddingTemplate }) {
  return (
    <section id="hero" className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <WeddingMedia slot="hero" src={VIDEOS.beach} poster={template.heroImage} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#3D8BBA]/40 via-transparent to-[#0D2840]/70" />
      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="relative z-10 px-6 text-center text-white">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.5em] text-[#B3E0F2]">Coastal Breeze</p>
        <h1 className="font-['Montserrat'] text-5xl font-light md:text-7xl">{DEMO.coupleNames}</h1>
        <div className="mx-auto my-8 h-1 w-24 bg-gradient-to-r from-transparent via-white to-transparent" />
        <p className="mx-auto max-w-xl text-lg text-white/90">{DEMO.heroSubtitle}</p>
        <p className="mt-6 font-['Montserrat'] text-lg text-[#B3E0F2]">{formatHebrewDate(DEMO.weddingDate)} · {DEMO.weddingTime}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="#rsvp" className="rounded-full px-10 py-4 text-sm font-bold text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${BLUE}, #5BA8D4)` }}>
            אישור הגעה
          </a>
        </div>
      </motion.div>
      <WaveBottom />
    </section>
  );
}

function CountdownSection() {
  return (
    <Section id="countdown" className="bg-[#F0F8FF] pt-24" wave>
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="font-['Montserrat'] text-4xl font-light text-[#0D2840]">הספירה לאחור</h2>
        <WeddingCountdownGrid className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {(u, i) => (
            <motion.div key={u.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="rounded-2xl bg-white p-8 shadow-lg" style={{ borderTop: `4px solid ${BLUE}` }}>
              <span className="font-['Montserrat'] text-5xl font-light" style={{ color: BLUE }}>{String(u.value).padStart(2, "0")}</span>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-[#5A7A94]">{u.label}</p>
            </motion.div>
          )}
        </WeddingCountdownGrid>
      </div>
    </Section>
  );
}

function InvitationSection() {
  return (
    <Section id="invitation" className="bg-[#F5E6C8] pt-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <span className="text-4xl">🐚</span>
        <h2 className="mt-4 font-['Montserrat'] text-4xl font-light text-[#0D2840]">הזמנה חמה</h2>
        <div className="mt-10 rounded-3xl bg-white/90 p-10 shadow-xl backdrop-blur-sm">
          <p className="text-lg leading-loose text-[#5A7A94]">{DEMO.invitationText}</p>
        </div>
      </div>
    </Section>
  );
}

function OurStorySection() {
  return (
    <Section id="our-story" className="bg-[#F0F8FF] pt-24" wave>
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Montserrat'] text-4xl font-light text-[#0D2840]">הסיפור שלנו</h2>
        <div className="mt-12 space-y-8">
          {DEMO.storyParagraphs.map((p, i) => (
            <motion.p key={i} initial={{ opacity: 0, x: i % 2 ? 30 : -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="rounded-2xl bg-white p-8 text-lg leading-relaxed text-[#5A7A94] shadow-md">
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
    <Section id="how-we-met" className="bg-[#F5E6C8] pt-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="overflow-hidden rounded-3xl shadow-xl">
          <WeddingMedia slot="how-we-met" src={template.galleryImages[0]} alt="" className="aspect-[4/5] w-full object-cover" />
        </motion.div>
        <div>
          <h2 className="font-['Montserrat'] text-4xl font-light text-[#0D2840]">איך נפגשנו</h2>
          <p className="mt-6 text-lg leading-relaxed text-[#5A7A94]">{DEMO.howWeMet}</p>
        </div>
      </div>
    </Section>
  );
}

function ProposalSection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="proposal" className="bg-[#F0F8FF] pt-24" wave>
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2">
        <div className="md:order-2">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="overflow-hidden rounded-3xl shadow-xl">
            <WeddingMedia slot="proposal" src={template.galleryImages[1]} alt="" className="aspect-[4/5] w-full object-cover" />
          </motion.div>
        </div>
        <div className="md:order-1">
          <h2 className="font-['Montserrat'] text-4xl font-light text-[#0D2840]">ההצעה</h2>
          <p className="mt-6 text-lg leading-relaxed text-[#5A7A94]">{DEMO.proposalStory}</p>
        </div>
      </div>
    </Section>
  );
}

function GallerySection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="gallery" className="bg-[#F5E6C8] pt-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center font-['Montserrat'] text-4xl font-light text-[#0D2840]">גלריה</h2>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {template.galleryImages.map((src, i) => (
            <motion.div key={src} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="overflow-hidden rounded-2xl shadow-lg">
              <WeddingMedia slot={`gallery.${i}`} src={src} alt="" loading="lazy" decoding="async" className="aspect-[3/4] w-full object-cover transition hover:scale-105" />
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function VideoSection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="video" className="bg-[#F0F8FF] pt-24" wave>
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center font-['Montserrat'] text-4xl font-light text-[#0D2840]">סרטון</h2>
        <div className="mt-10 overflow-hidden rounded-3xl shadow-2xl">
          <WeddingMedia slot={`videos.beach`} src={VIDEOS.beach} poster={template.heroImage} controls className="aspect-video w-full object-cover" />
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
    <Section id="event-details" className="bg-[#F5E6C8] pt-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Montserrat'] text-4xl font-light text-[#0D2840]">פרטי האירוע</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-8 text-center shadow-md">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BLUE }}>{item.label}</p>
              <p className="mt-3 font-semibold text-[#0D2840]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function ScheduleSection() {
  return (
    <Section id="schedule" className="bg-[#F5E6C8] pt-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center font-['Montserrat'] text-4xl font-light text-[#0D2840]">לוח זמנים</h2>
        <div className="mt-12 flex gap-4 overflow-x-auto pb-6 scrollbar-none">
          {DEMO.schedule.map((item, i) => (
            <motion.div
              key={item.time}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="w-64 shrink-0 rounded-2xl bg-white p-6 shadow-lg"
              style={{ borderBottom: `4px solid ${BLUE}` }}
            >
              <span className="text-2xl font-light" style={{ color: BLUE }}>{item.time}</span>
              <h3 className="mt-3 font-bold text-[#0D2840]">{item.title}</h3>
              <p className="mt-2 text-sm text-[#5A7A94]">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function LocationSection() {
  return (
    <Section id="location" className="bg-[#F0F8FF] pt-24" wave>
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center font-['Montserrat'] text-4xl font-light text-[#0D2840]">מיקום</h2>
        <LocationDisplay
          name={DEMO.venueName}
          address={DEMO.venueAddress}
          align="center"
          className="mt-4"
          nameClassName="text-xl text-[#0D2840]"
          addressClassName="mt-2 text-[#5A7A94]"
          iconClassName="h-5 w-5 shrink-0 text-[#0D2840]"
        />
        <WeddingVenueNav
          address={DEMO.venueAddress}
          className="mt-5 flex flex-wrap items-center justify-center gap-3"
          linkClassName="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#0D2840] px-5 py-2 text-sm font-bold text-white"
        />
        <div
          className="relative mx-auto mt-10 max-w-3xl overflow-hidden shadow-2xl"
          style={{
            borderRadius: "50% 50% 45% 45% / 30% 30% 70% 70%",
            border: `4px solid ${BLUE}`,
          }}
        >
          <iframe title="map" className="aspect-square w-full border-0" loading="lazy" src={`https://maps.google.com/maps?q=${encodeURIComponent(DEMO.venueAddress)}&z=14&output=embed`} />
        </div>
      </div>
    </Section>
  );
}

function DressCodeSection() {
  return (
    <Section id="dress-code" className="bg-[#F5E6C8] pt-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-['Montserrat'] text-4xl font-light text-[#0D2840]">קוד לבוש</h2>
        <p className="mt-8 text-lg text-[#5A7A94]">{DEMO.dressCode}</p>
      </div>
    </Section>
  );
}

function AccommodationsSection() {
  return (
    <Section id="accommodations" className="bg-[#F0F8FF] pt-24" wave>
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Montserrat'] text-4xl font-light text-[#0D2840]">לינה</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {DEMO.accommodations.map((item) => (
            <div key={item.name} className="rounded-2xl bg-white p-6 shadow-md">
              <h3 className="font-bold text-[#0D2840]">{item.name}</h3>
              <p className="mt-2 text-sm text-[#5A7A94]">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function TransportationSection() {
  return (
    <Section id="transportation" className="bg-[#F5E6C8] pt-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Montserrat'] text-4xl font-light text-[#0D2840]">הגעה</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {DEMO.transportation.map((item) => (
            <div key={item.title} className="rounded-2xl bg-white p-6 shadow-md">
              <h3 className="font-bold" style={{ color: BLUE }}>{item.title}</h3>
              <p className="mt-2 text-sm text-[#5A7A94]">{item.description}</p>
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
    <Section id="faq" className="bg-[#F0F8FF] pt-24" wave>
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Montserrat'] text-4xl font-light text-[#0D2840]">שאלות נפוצות</h2>
        <div className="mt-10 space-y-3">
          {DEMO.faq.map((item, i) => (
            <button key={item.question} type="button" onClick={() => toggle(i)} className="w-full rounded-2xl bg-white p-5 text-right shadow-md transition hover:shadow-lg">
              <h3 className="font-bold text-[#0D2840]">{item.question}</h3>
              {open === i && <p className="mt-3 text-sm text-[#5A7A94]">{item.answer}</p>}
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}

function RsvpSection({
  live,
  rsvpController,
}: Pick<TemplateProps, "live" | "rsvpController">) {
  if (live && !rsvpController) return null;
  return (
    <Section id="rsvp" className="bg-[#F5E6C8] pt-24">
      <div className="mx-auto max-w-lg px-6">
        <h2 className="text-center font-['Montserrat'] text-4xl font-light text-[#0D2840]">אישור הגעה</h2>
        <div className="mt-10">
          <WeddingTemplateRsvp templateId="coastal-breeze" controller={rsvpController} />
        </div>
      </div>
    </Section>
  );
}

function GiftsSection() {
  return (
    <Section id="gifts" className="bg-[#F0F8FF] pt-24" wave>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-['Montserrat'] text-4xl font-light text-[#0D2840]">מתנות</h2>
        <p className="mt-8 text-[#5A7A94]">{DEMO.giftsNote}</p>
        <WeddingGiftActions
          className="mt-6"
          actionClassName="inline-block rounded-full bg-[#3D8BBA] px-8 py-3 text-sm font-bold text-white"
        />
      </div>
    </Section>
  );
}

function GuestbookSection({
  live,
  guestMessageSlot,
}: Pick<TemplateProps, "live" | "guestMessageSlot">) {
  const { message, setMessage, items, addMessage } = useGuestbook();
  if (live) {
    if (!guestMessageSlot) return null;
    return (
      <Section id="guestbook" className="bg-[#F5E6C8] pt-24">
        {guestMessageSlot}
      </Section>
    );
  }
  return (
    <Section id="guestbook" className="bg-[#F5E6C8] pt-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Montserrat'] text-4xl font-light text-[#0D2840]">ספר ברכות</h2>
        <div className="mt-10 mb-6 flex gap-3">
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ברכה..." className="flex-1 rounded-full border bg-white px-5 py-3 text-sm" style={{ borderColor: BLUE }} />
          <button type="button" onClick={addMessage} className="rounded-full px-6 py-3 text-sm font-bold text-white" style={{ backgroundColor: BLUE }}>שליחה</button>
        </div>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={`${item.name}-${item.date}`} className="rounded-2xl bg-white p-5 shadow-md">
              <p className="text-[#0D2840]">{item.message}</p>
              <p className="mt-2 text-xs text-[#5A7A94]">{item.name} · {item.date}</p>
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
    <Section id="guest-upload" className="bg-[#F0F8FF] pt-24" wave>
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Montserrat'] text-4xl font-light text-[#0D2840]">זיכרונות</h2>
        <input value={uploaderName} onChange={(e) => setUploaderName(e.target.value)} placeholder="שמכם" className="mt-10 mb-4 w-full rounded-full border bg-white px-5 py-3 text-sm" style={{ borderColor: BLUE }} />
        <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} className={`mb-8 rounded-3xl border-2 border-dashed p-12 text-center ${dragging ? "bg-[#B3E0F2]/30" : ""}`} style={{ borderColor: BLUE }}>
          <label className="cursor-pointer rounded-full px-6 py-3 text-sm font-bold text-white" style={{ backgroundColor: BLUE }}>
            העלאת קבצים
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={onFileChange} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-2xl shadow-md">
              <EventUploadMedia item={item} className="aspect-square w-full object-cover" />
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
    <Section id="playlist" className="bg-[#F5E6C8] pt-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Montserrat'] text-4xl font-light text-[#0D2840]">מוזיקה</h2>
        <p className="mt-4 text-center text-[#5A7A94]">{DEMO.playlistNote}</p>
        <div className="mt-8 mb-6 flex gap-3">
          <input value={song} onChange={(e) => setSong(e.target.value)} placeholder="שיר..." className="flex-1 rounded-full border bg-white px-5 py-3 text-sm" style={{ borderColor: BLUE }} />
          <button type="button" onClick={addSong} className="rounded-full px-6 py-3 text-sm font-bold text-white" style={{ backgroundColor: BLUE }}>+</button>
        </div>
        <ul className="space-y-2">
          {songs.map((s) => (
            <li key={s} className="rounded-xl bg-white px-5 py-3 shadow-sm">{s}</li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function FooterSection() {
  return (
    <Section id="footer" className="bg-gradient-to-b from-[#3D8BBA] to-[#0D2840] pt-20 text-center text-white">
      <p className="font-['Montserrat'] text-3xl font-light">{DEMO.coupleNames}</p>
      <p className="mt-4 text-white/80">{DEMO.footerNote}</p>
    </Section>
  );
}

export default function CoastalBreezeSite({
  template,
  embed,
  live,
  rsvpController,
  guestMessageSlot,
}: TemplateProps) {
  return (
    <div className="wedding-website-root overflow-x-hidden bg-[#F0F8FF] text-[#0D2840] scroll-smooth">
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
      <RsvpSection live={live} rsvpController={rsvpController} />
      <GiftsSection />
      <GuestbookSection live={live} guestMessageSlot={guestMessageSlot} />
      <GuestUploadSection />
      <PlaylistSection />
      <FooterSection />
    </div>
  );
}
