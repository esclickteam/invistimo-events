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
import WeddingCoverImage from "../WeddingCoverImage";
import WeddingGiftActions from "../WeddingGiftActions";
import EventUploadMedia from "../shared/EventUploadMedia";
import WeddingSiteMenu from "../WeddingSiteMenu";

const fadeUp = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.75, ease: "easeOut" as const },
};

function GoldDivider() {
  return (
    <div className="mx-auto flex max-w-xs items-center gap-4 py-6">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A962] to-[#E8D5A8]" />
      <div className="relative h-3 w-3 rotate-45 border border-[#C9A962] bg-[#FAF7F2]" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C9A962] to-[#E8D5A8]" />
    </div>
  );
}

function Section({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section id={id} {...fadeUp} className={`relative scroll-mt-24 ${className}`}>
      {children}
    </motion.section>
  );
}

function StickyNav() {
  return (
    <WeddingSiteMenu
      className="sticky top-0 z-50 border-b border-[#C9A962]/30 bg-[#FAF7F2]/92 backdrop-blur-md"
      buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#C9A962]/40 text-[#2A2118]"
      panelClassName="border-t border-[#C9A962]/30 bg-[#FAF7F2]"
      linkClassName="rounded-xl px-4 py-3 text-right font-['Cormorant_Garamond'] text-sm font-semibold text-[#8A7560] hover:bg-[#C9A962]/10 hover:text-[#2A2118]"
    />
  );
}

function HeroSection({ template }: { template: WeddingTemplate }) {
  return (
    <section id="hero" className="relative flex min-h-[100svh] items-end justify-center overflow-hidden">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 18, ease: "linear" }}
      >
        <WeddingCoverImage src={template.heroImage} alt="" />
      </motion.div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#2A2118]/85 via-[#2A2118]/35 to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.3 }}
        className="relative z-10 px-6 pb-24 text-center text-white"
      >
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.5em] text-[#E8D5A8]">Save the Date</p>
        <h1 className="font-['Cormorant_Garamond'] text-6xl font-light md:text-8xl">{DEMO.coupleNames}</h1>
        <GoldDivider />
        <p className="mx-auto max-w-xl text-lg text-white/85">{DEMO.heroSubtitle}</p>
        <p className="mt-4 font-['Cormorant_Garamond'] text-xl text-[#E8D5A8]">
          {formatHebrewDate(DEMO.weddingDate)} · {DEMO.weddingTime}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="#rsvp" className="rounded-sm bg-[#C9A962] px-10 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#B8956B]">
            אישור הגעה
          </a>
          <a href="#our-story" className="rounded-sm border border-[#E8D5A8]/60 px-10 py-4 text-sm font-bold text-white transition hover:bg-white/10">
            הסיפור שלנו
          </a>
        </div>
      </motion.div>
    </section>
  );
}

function CountdownSection() {
  return (
    <Section id="countdown" className="bg-[#F3EBE0] py-24">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="font-['Cormorant_Garamond'] text-4xl font-light text-[#2A2118] md:text-5xl">הספירה לאחור</h2>
        <GoldDivider />
        <WeddingCountdownGrid className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {(u, i) => (
            <motion.div
              key={u.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="border border-[#C9A962]/40 bg-white p-8 shadow-[0_12px_40px_rgba(201,169,98,0.12)]"
            >
              <span className="font-['Cormorant_Garamond'] text-5xl font-light text-[#C9A962] md:text-6xl">
                {String(u.value).padStart(2, "0")}
              </span>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-[#8A7560]">{u.label}</p>
            </motion.div>
          )}
        </WeddingCountdownGrid>
      </div>
    </Section>
  );
}

function InvitationSection() {
  return (
    <Section id="invitation" className="bg-[#FAF7F2] py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#C9A962]">You&apos;re Invited</p>
        <h2 className="mt-3 font-['Cormorant_Garamond'] text-4xl font-light md:text-5xl">הזמנה חמה</h2>
        <GoldDivider />
        <div className="border border-[#C9A962]/35 bg-white p-10 shadow-lg">
          <p className="text-lg leading-loose text-[#8A7560] md:text-xl">{DEMO.invitationText}</p>
        </div>
      </div>
    </Section>
  );
}

function OurStorySection() {
  return (
    <Section id="our-story" className="bg-[#F3EBE0] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light md:text-5xl">הסיפור שלנו</h2>
        <GoldDivider />
        <div className="space-y-8">
          {DEMO.storyParagraphs.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: i % 2 ? 30 : -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="border-r-2 border-[#C9A962]/50 pr-6 text-lg leading-relaxed text-[#8A7560]"
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
    <Section id="how-we-met" className="bg-[#FAF7F2] py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="overflow-hidden border-4 border-[#C9A962]/40 p-2"
        >
          <WeddingMedia slot="how-we-met" src={template.galleryImages[0]} alt="" className="aspect-[4/5] w-full object-cover" />
        </motion.div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#C9A962]">Chapter I</p>
          <h2 className="mt-2 font-['Cormorant_Garamond'] text-4xl font-light">איך נפגשנו</h2>
          <GoldDivider />
          <p className="text-lg leading-relaxed text-[#8A7560]">{DEMO.howWeMet}</p>
        </div>
      </div>
    </Section>
  );
}

function ProposalSection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="proposal" className="bg-[#F3EBE0] py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2">
        <div className="md:order-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="overflow-hidden border-4 border-[#C9A962]/40 p-2"
          >
            <WeddingMedia slot="proposal" src={template.galleryImages[1]} alt="" className="aspect-[4/5] w-full object-cover" />
          </motion.div>
        </div>
        <div className="md:order-1">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#C9A962]">Chapter II</p>
          <h2 className="mt-2 font-['Cormorant_Garamond'] text-4xl font-light">ההצעה</h2>
          <GoldDivider />
          <p className="text-lg leading-relaxed text-[#8A7560]">{DEMO.proposalStory}</p>
        </div>
      </div>
    </Section>
  );
}

function GallerySection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="gallery" className="bg-[#FAF7F2] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light md:text-5xl">רגעים מהדרך</h2>
        <GoldDivider />
        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
          {template.galleryImages.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="mb-5 break-inside-avoid border-2 border-[#C9A962]/50 p-1"
            >
              <WeddingMedia slot={`gallery.${i}`} src={src} alt="" loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover object-center transition duration-700 hover:scale-[1.03]" />
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function VideoSection({ template }: { template: WeddingTemplate }) {
  return (
    <Section id="video" className="bg-[#F3EBE0] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">סרטון Save the Date</h2>
        <GoldDivider />
        <div className="overflow-hidden border-2 border-[#C9A962]/50 shadow-xl">
          <WeddingMedia slot={`videos.romantic`} src={VIDEOS.romantic} poster={template.heroImage} controls className="aspect-video w-full object-cover" />
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
    <Section id="event-details" className="bg-[#FAF7F2] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">פרטי האירוע</h2>
        <GoldDivider />
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="border border-[#C9A962]/35 bg-white p-8 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[#C9A962]">{item.label}</p>
              <p className="mt-3 font-['Cormorant_Garamond'] text-xl text-[#2A2118]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function ScheduleSection() {
  return (
    <Section id="schedule" className="bg-[#F3EBE0] py-24">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">לוח זמנים</h2>
        <GoldDivider />
        <div className="relative">
          <div className="absolute right-[23px] top-0 h-full w-px bg-gradient-to-b from-[#C9A962] via-[#E8D5A8] to-[#C9A962]" />
          {DEMO.schedule.map((item, i) => (
            <motion.div
              key={item.time}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative flex gap-6 pb-10 last:pb-0"
            >
              <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#C9A962] bg-[#FAF7F2] font-['Cormorant_Garamond'] text-sm font-semibold text-[#C9A962]">
                {item.time.slice(0, 5)}
              </div>
              <div className="flex-1 border border-[#C9A962]/30 bg-white p-5">
                <h3 className="font-['Cormorant_Garamond'] text-xl font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-[#8A7560]">{item.description}</p>
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
    <Section id="location" className="bg-[#FAF7F2] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">איך מגיעים</h2>
        <LocationDisplay
          name={DEMO.venueName}
          address={DEMO.venueAddress}
          align="center"
          className="mt-4"
          nameClassName="text-xl font-semibold text-[#3D2E1F]"
          addressClassName="mt-2 text-[#8A7560]"
          iconClassName="h-5 w-5 shrink-0 text-[#C9A962]"
        />
        <WeddingVenueNav
          address={DEMO.venueAddress}
          className="mt-5 flex flex-wrap items-center justify-center gap-3"
          linkClassName="inline-flex min-h-[44px] items-center gap-2 border border-[#C9A962] px-5 py-2 text-sm font-bold text-[#C9A962]"
        />
        <GoldDivider />
        <div className="overflow-hidden border-2 border-[#C9A962]/40">
          <iframe
            title="map"
            className="aspect-[16/9] w-full border-0"
            loading="lazy"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(DEMO.venueAddress)}&z=14&output=embed`}
          />
        </div>
      </div>
    </Section>
  );
}

function DressCodeSection() {
  return (
    <Section id="dress-code" className="bg-[#F3EBE0] py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-['Cormorant_Garamond'] text-4xl font-light">קוד לבוש</h2>
        <GoldDivider />
        <p className="text-lg leading-relaxed text-[#8A7560]">{DEMO.dressCode}</p>
      </div>
    </Section>
  );
}

function AccommodationsSection() {
  return (
    <Section id="accommodations" className="bg-[#FAF7F2] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">לינה באזור</h2>
        <GoldDivider />
        <div className="grid gap-6 md:grid-cols-3">
          {DEMO.accommodations.map((item) => (
            <div key={item.name} className="border border-[#C9A962]/35 bg-white p-6">
              <h3 className="font-['Cormorant_Garamond'] text-xl font-semibold">{item.name}</h3>
              <p className="mt-2 text-sm text-[#8A7560]">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function TransportationSection() {
  return (
    <Section id="transportation" className="bg-[#F3EBE0] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">הגעה וחנייה</h2>
        <GoldDivider />
        <div className="grid gap-6 md:grid-cols-3">
          {DEMO.transportation.map((item) => (
            <div key={item.title} className="border border-[#C9A962]/35 bg-white p-6">
              <h3 className="font-['Cormorant_Garamond'] text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-[#8A7560]">{item.description}</p>
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
    <Section id="faq" className="bg-[#FAF7F2] py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">שאלות נפוצות</h2>
        <GoldDivider />
        <div className="space-y-3">
          {DEMO.faq.map((item, i) => (
            <button
              key={item.question}
              type="button"
              onClick={() => toggle(i)}
              className="w-full border border-[#C9A962]/35 bg-white p-5 text-right transition hover:border-[#C9A962]"
            >
              <h3 className="font-['Cormorant_Garamond'] text-lg font-semibold">{item.question}</h3>
              {open === i && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm text-[#8A7560]">
                  {item.answer}
                </motion.p>
              )}
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
    <Section id="rsvp" className="bg-[#F3EBE0] py-24">
      <div className="mx-auto max-w-lg px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">אישור הגעה</h2>
        <GoldDivider />
        <WeddingTemplateRsvp templateId="eternal-gold" controller={rsvpController} />
      </div>
    </Section>
  );
}

function GiftsSection() {
  return (
    <Section id="gifts" className="bg-[#FAF7F2] py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-['Cormorant_Garamond'] text-4xl font-light">מתנות</h2>
        <GoldDivider />
        <p className="text-lg text-[#8A7560]">{DEMO.giftsNote}</p>
        <WeddingGiftActions
          className="mt-6"
          actionClassName="inline-block border border-[#C9A962] px-8 py-3 text-sm font-bold text-[#C9A962]"
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
      <Section id="guestbook" className="bg-[#F3EBE0] py-24">
        {guestMessageSlot}
      </Section>
    );
  }
  return (
    <Section id="guestbook" className="bg-[#F3EBE0] py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">ספר ברכות</h2>
        <GoldDivider />
        <div className="mb-6 flex gap-3">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="כתבו ברכה חמה..."
            className="flex-1 border border-[#C9A962]/40 bg-white px-4 py-3 text-sm"
          />
          <button type="button" onClick={addMessage} className="bg-[#C9A962] px-6 py-3 text-sm font-bold text-white">
            שליחה
          </button>
        </div>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={`${item.name}-${item.date}`} className="border border-[#C9A962]/30 bg-white p-5">
              <p className="font-['Cormorant_Garamond'] text-lg">{item.message}</p>
              <p className="mt-2 text-xs text-[#8A7560]">
                {item.name} · {item.date}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function GuestUploadSection() {
  const { items, dragging, setDragging, uploaderName, setUploaderName, onDrop, onFileChange, uploadHint, error } = useGuestUpload();
  return (
    <Section id="guest-upload" className="bg-[#FAF7F2] py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">זיכרונות מהאירוע</h2>
        <GoldDivider />
        <p className="text-center text-sm text-[#8A7560]">{uploadHint}</p>
        {error ? <p className="mt-2 text-center text-sm font-bold text-red-600">{error}</p> : null}
        <input
          value={uploaderName}
          onChange={(e) => setUploaderName(e.target.value)}
          placeholder="שמכם"
          className="mb-4 w-full border border-[#C9A962]/40 bg-white px-4 py-3 text-sm"
        />
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`mb-8 border-2 border-dashed p-12 text-center transition ${dragging ? "border-[#C9A962] bg-[#F3EBE0]" : "border-[#C9A962]/40"}`}
        >
          <p className="text-[#8A7560]">גררו תמונות או סרטונים לכאן</p>
          <label className="mt-4 inline-block cursor-pointer bg-[#C9A962] px-6 py-3 text-sm font-bold text-white">
            בחירת קבצים
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={onFileChange} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden border border-[#C9A962]/40">
              <EventUploadMedia item={item} className="aspect-square w-full object-cover" />
              <p className="p-2 text-xs text-[#8A7560]">{item.uploadedBy}</p>
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
    <Section id="playlist" className="bg-[#F3EBE0] py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">רשימת השמעה</h2>
        <GoldDivider />
        <p className="mb-6 text-center text-[#8A7560]">{DEMO.playlistNote}</p>
        <div className="mb-6 flex gap-3">
          <input
            value={song}
            onChange={(e) => setSong(e.target.value)}
            placeholder="שם השיר — אמן"
            className="flex-1 border border-[#C9A962]/40 bg-white px-4 py-3 text-sm"
          />
          <button type="button" onClick={addSong} className="bg-[#C9A962] px-6 py-3 text-sm font-bold text-white">
            הוספה
          </button>
        </div>
        <ul className="space-y-2">
          {songs.map((s) => (
            <li key={s} className="border border-[#C9A962]/30 bg-white px-5 py-3 font-['Cormorant_Garamond'] text-lg">
              {s}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function FooterSection() {
  return (
    <Section id="footer" className="bg-[#2A2118] py-16 text-center text-white">
      <p className="font-['Cormorant_Garamond'] text-3xl font-light">{DEMO.coupleNames}</p>
      <GoldDivider />
      <p className="text-[#E8D5A8]">{DEMO.footerNote}</p>
      <p className="mt-6 text-xs tracking-widest text-white/40">{formatHebrewDate(DEMO.weddingDate)}</p>
    </Section>
  );
}

export default function EternalGoldSite({
  template,
  embed,
  live,
  rsvpController,
  guestMessageSlot,
}: TemplateProps) {
  return (
    <div className="wedding-website-root overflow-x-hidden bg-[#FAF7F2] text-[#2A2118] scroll-smooth">
      <StickyNav />
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
