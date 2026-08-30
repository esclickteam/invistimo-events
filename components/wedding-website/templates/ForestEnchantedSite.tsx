"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  useFaqAccordion,
  useGuestbook,
  useGuestUpload,
  usePlaylistDemo,
} from "../shared/useWeddingInteractions";
import WeddingCountdownGrid from "../shared/WeddingCountdownGrid";
import WeddingTemplateRsvp from "../WeddingTemplateRsvp";
import { DEMO, VIDEOS, formatHebrewDate, getVenueMapEmbedUrl, type TemplateProps } from "../shared/weddingUtils";
import WeddingMedia from "../editable/WeddingMedia";
import LocationDisplay from "@/app/components/LocationDisplay";
import WeddingVenueNav from "../WeddingVenueNav";
import WeddingGiftActions from "../WeddingGiftActions";
import EventUploadMedia from "../shared/EventUploadMedia";
import WeddingSiteMenu from "../WeddingSiteMenu";
import { WeddingDesktopFx } from "../shared/weddingMotion";

const GREEN = "#7CB87A";
const DARK = "#0F1810";

function Fireflies() {
  const flies = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 4,
        size: 2 + Math.random() * 4,
      })),
    []
  );
  return (
    <WeddingDesktopFx>
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {flies.map((f) => (
        <motion.div
          key={f.id}
          className="absolute rounded-full"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: f.size,
            height: f.size,
            background: GREEN,
            boxShadow: `0 0 ${f.size * 3}px ${GREEN}`,
          }}
          animate={{
            opacity: [0.2, 1, 0.2],
            x: [0, Math.random() * 40 - 20, 0],
            y: [0, Math.random() * -30, 0],
          }}
          transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, delay: f.delay }}
        />
      ))}
    </div>
    </WeddingDesktopFx>
  );
}

function FairyLights() {
  const bulbs = 24;
  return (
    <WeddingDesktopFx>
    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-hidden opacity-60">
      <svg viewBox="0 0 800 60" className="h-16 w-full max-w-4xl" preserveAspectRatio="none">
        <path
          d="M0,30 Q100,10 200,30 T400,30 T600,30 T800,30"
          fill="none"
          stroke={GREEN}
          strokeWidth="1"
          opacity="0.4"
        />
        {Array.from({ length: bulbs }).map((_, i) => {
          const x = (i / (bulbs - 1)) * 800;
          const y = 30 + Math.sin(i * 0.8) * 12;
          return (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill={GREEN}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5 + (i % 3) * 0.5, repeat: Infinity, delay: i * 0.15 }}
            />
          );
        })}
      </svg>
    </div>
    </WeddingDesktopFx>
  );
}

function Blob({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-[40%_60%_70%_30%/40%_50%_60%_50%] ${className}`}
      style={{ background: `radial-gradient(circle, ${GREEN}22 0%, transparent 70%)` }}
    />
  );
}

function ForestNav() {
  return (
    <WeddingSiteMenu
      className="sticky top-0 z-50 bg-[#0F1810]/90 backdrop-blur-md"
      brand={<span className="text-xs tracking-widest text-[#7CB87A]">{DEMO.coupleShort}</span>}
      linkClassName="whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs text-[#8AA892] hover:text-[#7CB87A] sm:text-sm"
    />
  );
}

function CountdownBlock() {
  return (
      <section id="countdown" className="relative overflow-hidden py-20">
        <Blob className="-left-20 top-0 h-64 w-64" />
        <Blob className="-right-10 bottom-0 h-48 w-48" />
        <Fireflies />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-['Libre_Baskerville'] text-4xl">הספירה לאחור</h2>
          <WeddingCountdownGrid className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {(u, i) => (
              <motion.div
                key={u.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-[40%_60%_55%_45%/50%_45%_55%_50%] border border-[#7CB87A]/25 bg-[#1C2A1E] p-8"
              >
                <span className="font-['Libre_Baskerville'] text-4xl text-[#7CB87A] md:text-5xl">
                  {String(u.value).padStart(2, "0")}
                </span>
                <p className="mt-2 text-xs text-[#8AA892]">{u.label}</p>
              </motion.div>
            )}
          </WeddingCountdownGrid>
        </div>
      </section>
  );
}

export default function ForestEnchantedSite({ template, embed, live, rsvpController, guestMessageSlot }: TemplateProps) {
  const guestbook = useGuestbook();
  const upload = useGuestUpload();
  const playlist = usePlaylistDemo();
  const faq = useFaqAccordion(0);

  return (
    <div className="min-h-screen overflow-x-hidden font-['Heebo']" style={{ backgroundColor: DARK, color: "#E8F0E4" }}>
      <ForestNav />

      {/* HERO — forest video */}
      <section id="hero" className="relative flex min-h-screen items-end overflow-hidden">
        <WeddingMedia
          slot="hero" src={VIDEOS.forest}
          poster={template.heroImage}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0F1810] via-[#0F1810]/60 to-[#0F1810]/30" />
        <Fireflies />
        <FairyLights />
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          className="relative z-10 w-full px-6 pb-20 pt-32 md:px-12"
        >
          <p className="font-['Libre_Baskerville'] text-sm italic tracking-[0.3em] text-[#7CB87A]">
            enchanted forest wedding
          </p>
          <h1 className="mt-4 font-['Libre_Baskerville'] text-4xl font-bold sm:text-5xl md:text-8xl">{DEMO.coupleNames}</h1>
          <p className="mt-6 max-w-lg text-lg text-[#8AA892]">{DEMO.heroSubtitle}</p>
          <p className="mt-4 text-sm text-[#7CB87A]">
            {formatHebrewDate(DEMO.weddingDate)} · {DEMO.weddingTime}
          </p>
          <div className="mt-10 flex gap-4">
            <a
              href="#rsvp"
              className="rounded-full bg-[#7CB87A] px-8 py-3 text-sm font-bold text-[#0F1810] shadow-[0_0_30px_rgba(124,184,122,0.4)]"
            >
              אישור הגעה
            </a>
            <a
              href="#our-story"
              className="rounded-full border border-[#7CB87A]/40 px-8 py-3 text-sm text-[#7CB87A]"
            >
              הסיפור
            </a>
          </div>
        </motion.div>
      </section>

      {/* COUNTDOWN — organic blobs */}
      <CountdownBlock />

      {/* INVITATION */}
      <section id="invitation" className="relative py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FairyLights />
          <h2 className="font-['Libre_Baskerville'] text-4xl">הזמנה</h2>
          <p className="mt-10 font-['Libre_Baskerville'] text-xl italic leading-[2] text-[#8AA892]">
            {DEMO.invitationText}
          </p>
        </div>
      </section>

      {/* OUR STORY */}
      <section id="our-story" className="relative overflow-hidden py-20">
        <Blob className="right-0 top-1/4 h-96 w-96" />
        <div className="relative mx-auto max-w-5xl px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">הסיפור שלנו</h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {DEMO.storyParagraphs.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="rounded-[30%_70%_60%_40%/40%_40%_60%_60%] border border-[#7CB87A]/20 bg-[#1C2A1E] p-8"
              >
                <span className="text-2xl text-[#7CB87A]">🌿</span>
                <p className="mt-4 leading-relaxed text-[#8AA892]">{p}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE MET */}
      <section id="how-we-met" className="py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <div className="relative">
            <div
              className="absolute -inset-4 rounded-[50%_50%_45%_55%/55%_45%_55%_45%] border border-[#7CB87A]/30"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <WeddingMedia
              slot="how-we-met" src={template.galleryImages[0]}
              alt=""
              className="relative aspect-[4/5] w-full rounded-[40%_60%_55%_45%/50%_45%_55%_50%] object-cover"
            />
          </div>
          <div>
            <h2 className="font-['Libre_Baskerville'] text-4xl">איך נפגשנו</h2>
            <div className="my-6 h-px w-16 bg-[#7CB87A]" />
            <p className="leading-relaxed text-[#8AA892]">{DEMO.howWeMet}</p>
          </div>
        </div>
      </section>

      {/* PROPOSAL */}
      <section id="proposal" className="relative py-24">
        <Fireflies />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <div className="relative">
            <div className="absolute -inset-4 rounded-[55%_45%_50%_50%/45%_55%_45%_55%] border border-[#7CB87A]/30" />
            <WeddingMedia
              slot="proposal"
              src={template.galleryImages[1]}
              alt=""
              className="relative aspect-[4/5] w-full rounded-[55%_45%_50%_50%/45%_55%_45%_55%] object-cover"
            />
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="rounded-[40%_60%_55%_45%/50%_45%_55%_50%] border border-[#7CB87A]/30 bg-[#1C2A1E] px-8 py-16 text-center"
          >
            <h2 className="font-['Libre_Baskerville'] text-4xl text-[#7CB87A]">ההצעה</h2>
            <blockquote className="mt-8 font-['Libre_Baskerville'] text-xl italic leading-relaxed text-[#E8F0E4]">
              &ldquo;{DEMO.proposalStory}&rdquo;
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* GALLERY — masonry organic */}
      <section id="gallery" className="py-20">
        <div className="mb-10 text-center">
          <h2 className="font-['Libre_Baskerville'] text-4xl">גלריה</h2>
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 md:grid-cols-4">
          {template.galleryImages.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className={`overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : ""}`}
            >
              <div
                className="overflow-hidden border border-[#7CB87A]/20"
                style={{
                  borderRadius:
                    i % 3 === 0
                      ? "40% 60% 55% 45% / 50% 45% 55% 50%"
                      : i % 3 === 1
                        ? "55% 45% 50% 50% / 45% 55% 45% 55%"
                        : "50% 50% 45% 55% / 55% 45% 55% 45%",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <WeddingMedia slot={`gallery.${i}`} src={src} alt="" loading="lazy" decoding="async" className="aspect-square w-full object-cover transition hover:scale-105" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* VIDEO */}
      <section id="video" className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-10 text-center font-['Libre_Baskerville'] text-4xl">סרטון</h2>
          <div className="overflow-hidden rounded-[40%_60%_55%_45%/50%_45%_55%_50%] border border-[#7CB87A]/30 shadow-[0_0_60px_rgba(124,184,122,0.15)]">
            <WeddingMedia slot={`videos.forest`} src={VIDEOS.forest} autoPlay muted loop playsInline className="aspect-video w-full object-cover" />
          </div>
        </div>
      </section>

      {/* EVENT DETAILS */}
      <section id="event-details" className="relative py-20">
        <Blob className="left-0 top-0 h-72 w-72" />
        <div className="relative mx-auto max-w-4xl px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">פרטי האירוע</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { label: "תאריך", value: formatHebrewDate(DEMO.weddingDate) },
              { label: "שעה", value: DEMO.weddingTime },
              { label: "מקום", value: DEMO.venueName },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-3xl border border-[#7CB87A]/20 bg-[#1C2A1E] p-6 text-center">
                <p className="text-xs text-[#7CB87A]">{label}</p>
                <p className="mt-2 font-['Libre_Baskerville']">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCHEDULE — vine timeline */}
      <section id="schedule" className="py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">לוח זמנים</h2>
          <div className="relative mt-16 space-y-0">
            <div className="absolute right-4 top-0 hidden h-full w-px bg-[#7CB87A]/30 md:block" />
            {DEMO.schedule.map((item, i) => (
              <motion.div
                key={item.time}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative border-b border-[#7CB87A]/10 py-6 pr-10"
              >
                <div className="absolute right-2 top-8 hidden h-3 w-3 rounded-full bg-[#7CB87A] shadow-[0_0_10px_#7CB87A] md:block" />
                <span className="text-sm text-[#7CB87A]">{item.time}</span>
                <h3 className="mt-1 font-['Libre_Baskerville'] text-xl">{item.title}</h3>
                <p className="mt-1 text-sm text-[#8AA892]">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCATION */}
      <section id="location" className="py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
          <div>
            <h2 className="font-['Libre_Baskerville'] text-4xl">מיקום</h2>
            <LocationDisplay
              name={DEMO.venueName}
              address={DEMO.venueAddress}
              className="mt-6"
              nameClassName="text-xl"
              addressClassName="mt-2 text-[#8AA892]"
              iconClassName="h-5 w-5 shrink-0 text-[#7CB87A]"
            />
            <WeddingVenueNav
              address={DEMO.venueAddress}
              lat={DEMO.venueLat}
              lng={DEMO.venueLng}
              className="mt-8 flex flex-wrap gap-3"
              linkClassName="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#7CB87A] px-8 py-3 text-sm font-bold text-[#0F1810]"
            />
          </div>
          <div className="overflow-hidden rounded-3xl border border-[#7CB87A]/20">
            <iframe
              title="map"
              src={getVenueMapEmbedUrl()}
              className="h-72 w-full opacity-80"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* DRESS CODE */}
      <section id="dress-code" className="py-20 text-center">
        <span className="text-4xl">🌲</span>
        <h2 className="mt-4 font-['Libre_Baskerville'] text-4xl">קוד לבוש</h2>
        <p className="mx-auto mt-8 max-w-xl text-[#8AA892]">{DEMO.dressCode}</p>
      </section>

      {/* ACCOMMODATIONS */}
      <section id="accommodations" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">לינה</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {DEMO.accommodations.map((h) => (
              <div key={h.name} className="rounded-3xl border border-[#7CB87A]/20 bg-[#1C2A1E] p-6">
                <h3 className="text-[#7CB87A]">{h.name}</h3>
                <p className="mt-2 text-sm text-[#8AA892]">{h.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRANSPORTATION */}
      <section id="transportation" className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">הגעה</h2>
          <div className="mt-10 space-y-4">
            {DEMO.transportation.map((t) => (
              <div key={t.title} className="rounded-2xl border border-[#7CB87A]/15 bg-[#1C2A1E] p-5">
                <h3 className="text-[#7CB87A]">{t.title}</h3>
                <p className="mt-2 text-sm text-[#8AA892]">{t.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">שאלות נפוצות</h2>
          <div className="mt-10 space-y-3">
            {DEMO.faq.map((item, i) => (
              <div key={item.question} className="overflow-hidden rounded-2xl border border-[#7CB87A]/15 bg-[#1C2A1E]">
                <button
                  type="button"
                  onClick={() => faq.toggle(i)}
                  className="flex w-full items-center justify-between p-5 text-right"
                >
                  <span className="text-[#7CB87A]">{faq.open === i ? "🌿" : "·"}</span>
                  <span>{item.question}</span>
                </button>
                {faq.open === i && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t border-[#7CB87A]/10 px-5 pb-5 text-sm text-[#8AA892]"
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
      {!(live && !rsvpController) && (
      <section id="rsvp" className="relative py-24">
        <Fireflies />
        <div className="relative mx-auto max-w-lg px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">אישור הגעה</h2>
          <WeddingTemplateRsvp templateId="forest-enchanted" controller={rsvpController} />
        </div>
      </section>
      )}
      {/* GIFTS */}
      <section id="gifts" className="py-20 text-center">
        <h2 className="font-['Libre_Baskerville'] text-4xl">מתנות</h2>
        <p className="mx-auto mt-8 max-w-lg text-[#8AA892]">{DEMO.giftsNote}</p>
        <WeddingGiftActions
          className="mt-8"
          actionClassName="rounded-full border border-[#7CB87A] px-8 py-3 text-[#7CB87A]"
        />
      </section>

      {/* GUESTBOOK */}
      {live ? (
        guestMessageSlot ? <section id="guestbook" className="py-16">{guestMessageSlot}</section> : null
      ) : (
      <section id="guestbook" className="py-20">
        <div className="mx-auto max-w-xl px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">ספר ברכות</h2>
          <div className="mt-10 rounded-3xl border border-[#7CB87A]/20 bg-[#1C2A1E] p-6">
            <textarea
              value={guestbook.message}
              onChange={(e) => guestbook.setMessage(e.target.value)}
              placeholder="ברכה..."
              rows={3}
              className="w-full resize-none bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={guestbook.addMessage}
              className="mt-4 rounded-full bg-[#7CB87A] px-6 py-2 text-sm font-bold text-[#0F1810]"
            >
              שליחה
            </button>
          </div>
          <div className="mt-8 space-y-4">
            {guestbook.items.map((m) => (
              <div key={`${m.name}-${m.date}`} className="rounded-2xl border border-[#7CB87A]/10 bg-[#1C2A1E]/80 p-5">
                <div className="flex justify-between text-xs text-[#7CB87A]">
                  <span>{m.date}</span>
                  <span>{m.name}</span>
                </div>
                <p className="mt-2 text-sm text-[#8AA892]">{m.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      )}
      {/* GUEST UPLOAD */}
      <section id="guest-upload" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">זיכרונות מהיער</h2>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              upload.setDragging(true);
            }}
            onDragLeave={() => upload.setDragging(false)}
            onDrop={upload.onDrop}
            className={`mt-10 rounded-[40%_60%_55%_45%/50%_45%_55%_50%] border-2 border-dashed p-12 text-center transition ${
              upload.dragging ? "border-[#7CB87A] bg-[#1C2A1E]" : "border-[#7CB87A]/30"
            }`}
          >
            <p className="text-[#8AA892]">גררו תמונות 🌿</p>
            <label className="mt-4 inline-block cursor-pointer rounded-full bg-[#7CB87A] px-6 py-2 text-sm font-bold text-[#0F1810]">
              העלאה
              <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={upload.onFileChange} />
            </label>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {upload.items.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-2xl border border-[#7CB87A]/20">
                <EventUploadMedia item={item} className="aspect-square w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLAYLIST */}
      <section id="playlist" className="py-20">
        <div className="mx-auto max-w-lg px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">מוזיקה</h2>
          <p className="mt-4 text-center text-sm text-[#8AA892]">{DEMO.playlistNote}</p>
          <div className="mt-8 flex gap-2">
            <input
              value={playlist.song}
              onChange={(e) => playlist.setSong(e.target.value)}
              placeholder="שיר..."
              className="flex-1 rounded-full border border-[#7CB87A]/30 bg-[#1C2A1E] px-5 py-3 outline-none"
            />
            <button type="button" onClick={playlist.addSong} className="rounded-full bg-[#7CB87A] px-5 font-bold text-[#0F1810]">
              +
            </button>
          </div>
          <ul className="mt-6 space-y-2">
            {playlist.songs.map((s) => (
              <li key={s} className="rounded-xl border border-[#7CB87A]/15 bg-[#1C2A1E] px-5 py-3 text-sm">
                🎵 {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="footer" className="relative border-t border-[#7CB87A]/20 py-16 text-center">
        <FairyLights />
        <Fireflies />
        <p className="relative font-['Libre_Baskerville'] text-3xl text-[#7CB87A]">{DEMO.coupleNames}</p>
        <p className="relative mt-4 text-sm text-[#8AA892]">{formatHebrewDate(DEMO.weddingDate)}</p>
        <p className="relative mx-auto mt-6 max-w-md text-sm text-[#8AA892]">{DEMO.footerNote}</p>
      </footer>
    </div>
  );
}
