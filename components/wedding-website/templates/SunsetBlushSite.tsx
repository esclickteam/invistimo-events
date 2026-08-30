"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";
import {
  useFaqAccordion,
  useGuestbook,
  useGuestUpload,
  usePlaylistDemo,
} from "../shared/useWeddingInteractions";
import WeddingCountdownGrid from "../shared/WeddingCountdownGrid";
import WeddingTemplateRsvp from "../WeddingTemplateRsvp";
import { DEMO, VIDEOS, formatHebrewDate, type TemplateProps } from "../shared/weddingUtils";
import WeddingMedia from "../editable/WeddingMedia";
import { MapPin } from "lucide-react";
import LocationDisplay from "@/app/components/LocationDisplay";
import WeddingVenueNav from "../WeddingVenueNav";
import WeddingGiftActions from "../WeddingGiftActions";
import EventUploadMedia from "../shared/EventUploadMedia";

const NAV = WEDDING_SECTIONS.filter((s) => s.id !== "footer");
const BLUSH = "#E8788A";
const CORAL = "#FF9A8B";

function GradientMeshHero() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        animate={{
          background: [
            `radial-gradient(ellipse at 20% 30%, ${BLUSH}88 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, ${CORAL}66 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, #FFD4DC44 0%, #FFF5F7 70%)`,
            `radial-gradient(ellipse at 70% 20%, ${CORAL}88 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, ${BLUSH}66 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, #FFE8EE44 0%, #FFF5F7 70%)`,
            `radial-gradient(ellipse at 20% 30%, ${BLUSH}88 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, ${CORAL}66 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, #FFD4DC44 0%, #FFF5F7 70%)`,
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0"
      />
    </div>
  );
}

function HeartParticles() {
  const hearts = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 5,
        size: 8 + Math.random() * 14,
        duration: 6 + Math.random() * 8,
      })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {hearts.map((h) => (
        <motion.span
          key={h.id}
          initial={{ y: "110%", opacity: 0, x: `${h.x}%` }}
          animate={{ y: "-10%", opacity: [0, 0.6, 0.6, 0], rotate: [0, 15, -15, 0] }}
          transition={{ duration: h.duration, repeat: Infinity, delay: h.delay, ease: "easeInOut" }}
          className="absolute text-[#E8788A]"
          style={{ fontSize: h.size, left: `${h.x}%` }}
        >
          ♥
        </motion.span>
      ))}
    </div>
  );
}

function BlushNav({ embed }: { embed?: boolean }) {
  const [open, setOpen] = useState(false);
  if (embed) return null;
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-sm font-medium text-[#E8788A]">
          {DEMO.coupleShort}
        </span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="rounded-full bg-gradient-to-r from-[#E8788A] to-[#FF9A8B] px-4 py-2 text-xs font-bold text-white md:hidden"
        >
          תפריט
        </button>
        <nav className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-full flex-col gap-2 bg-white/95 p-4 shadow-lg md:static md:flex md:flex-row md:gap-5 md:bg-transparent md:p-0 md:shadow-none`}>
          {NAV.slice(1, 10).map(({ id, navLabel }) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1 text-sm text-[#9A6070] transition hover:bg-[#FFE8EE] hover:text-[#E8788A]"
            >
              {navLabel}
            </a>
          ))}
        </nav>
        <a
          href="#rsvp"
          className="hidden rounded-full bg-gradient-to-r from-[#E8788A] to-[#FF9A8B] px-5 py-2 text-xs font-bold text-white shadow-lg md:inline-block"
        >
          RSVP
        </a>
      </div>
    </header>
  );
}

function CountdownBlock() {
  return (
      <section id="countdown" className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="font-['Cormorant_Garamond'] text-lg italic text-[#E8788A]">countdown</p>
          <h2 className="font-['Cormorant_Garamond'] text-4xl">הספירה לאחור</h2>
          <WeddingCountdownGrid className="mt-12 flex flex-wrap justify-center gap-4">
            {(u, i) => (
              <motion.div
                key={u.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: "spring" }}
                className="min-w-[100px] rounded-[28px] bg-gradient-to-br from-white to-[#FFE8EE] p-6 shadow-[0_10px_40px_rgba(232,120,138,0.15)]"
              >
                <span className="font-['Cormorant_Garamond'] text-4xl font-semibold text-[#E8788A]">
                  {String(u.value).padStart(2, "0")}
                </span>
                <p className="mt-1 text-xs text-[#9A6070]">{u.label}</p>
              </motion.div>
            )}
          </WeddingCountdownGrid>
        </div>
      </section>
  );
}

export default function SunsetBlushSite({ template, embed, live, rsvpController, guestMessageSlot }: TemplateProps) {
  const guestbook = useGuestbook();
  const upload = useGuestUpload();
  const playlist = usePlaylistDemo();
  const faq = useFaqAccordion(0);

  const polaroidRotations = [-6, 4, -3, 7, -5, 3];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FFF5F7] text-[#3D1F28]">
      <BlushNav embed={embed} />

      {/* HERO — gradient mesh + hero image overlay */}
      <section id="hero" className={`relative flex min-h-screen items-center justify-center overflow-hidden ${embed ? "" : "pt-16"}`}>
        <GradientMeshHero />
        <HeartParticles />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#FFF5F7]/40 to-[#FFF5F7]" />
        <WeddingMedia
          slot="hero" src={template.heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center opacity-20 blur-[2px]"
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 px-6 text-center"
        >
          <p className="font-['Cormorant_Garamond'] text-lg italic tracking-widest text-[#E8788A]">
            save the date
          </p>
          <h1 className="mt-4 bg-gradient-to-r from-[#E8788A] via-[#FF9A8B] to-[#E8788A] bg-clip-text font-['Cormorant_Garamond'] text-6xl font-light md:text-9xl">
            {DEMO.coupleNames}
          </h1>
          <p className="mx-auto mt-8 max-w-lg text-lg leading-relaxed text-[#9A6070]">{DEMO.heroSubtitle}</p>
          <p className="mt-6 font-['Cormorant_Garamond'] text-xl italic text-[#E8788A]">
            {formatHebrewDate(DEMO.weddingDate)} · {DEMO.weddingTime}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href="#rsvp"
              className="rounded-full bg-gradient-to-r from-[#E8788A] to-[#FF9A8B] px-10 py-4 text-sm font-bold text-white shadow-[0_8px_30px_rgba(232,120,138,0.4)] transition hover:scale-105"
            >
              אישור הגעה ♥
            </a>
            <a
              href="#gallery"
              className="rounded-full border-2 border-[#E8788A]/40 px-10 py-4 text-sm font-bold text-[#E8788A]"
            >
              הגלריה
            </a>
          </div>
        </motion.div>
      </section>

      {/* COUNTDOWN — soft gradient pills */}
      <CountdownBlock />

      {/* INVITATION */}
      <section id="invitation" className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFE8EE] to-[#FFD4DC]/50" />
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-2xl px-6 text-center"
        >
          <span className="text-4xl">💌</span>
          <h2 className="mt-4 font-['Cormorant_Garamond'] text-4xl">הזמנה</h2>
          <p className="mt-8 font-['Cormorant_Garamond'] text-xl italic leading-[2] text-[#5C3040]">
            {DEMO.invitationText}
          </p>
        </motion.div>
      </section>

      {/* OUR STORY */}
      <section id="our-story" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl">
            <span className="italic text-[#E8788A]">our</span> story
          </h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {DEMO.storyParagraphs.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -8 }}
                className="rounded-[28px] bg-white p-8 shadow-[0_12px_40px_rgba(232,120,138,0.12)]"
              >
                <span className="font-['Cormorant_Garamond'] text-3xl italic text-[#FFD4DC]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-4 leading-relaxed text-[#9A6070]">{p}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE MET */}
      <section id="how-we-met" className="bg-gradient-to-b from-[#FFE8EE]/50 to-transparent py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <motion.div
            initial={{ rotate: -4 }}
            whileInView={{ rotate: -3 }}
            className="mx-auto w-full max-w-sm bg-white p-4 pb-12 shadow-[0_20px_60px_rgba(232,120,138,0.2)]"
            style={{ transform: "rotate(-4deg)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <WeddingMedia slot="how-we-met" src={template.galleryImages[0]} alt="" className="aspect-square w-full object-cover" />
            <p className="mt-4 text-center font-['Cormorant_Garamond'] text-lg italic text-[#E8788A]">
              how we met ♥
            </p>
          </motion.div>
          <div>
            <h2 className="font-['Cormorant_Garamond'] text-4xl">איך נפגשנו</h2>
            <p className="mt-6 leading-relaxed text-[#9A6070]">{DEMO.howWeMet}</p>
          </div>
        </div>
      </section>

      {/* PROPOSAL */}
      <section id="proposal" className="py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <motion.div
            initial={{ rotate: 4 }}
            whileInView={{ rotate: 3 }}
            className="mx-auto w-full max-w-sm bg-white p-4 pb-12 shadow-[0_20px_60px_rgba(232,120,138,0.2)]"
            style={{ transform: "rotate(3deg)" }}
          >
            <WeddingMedia slot="proposal" src={template.galleryImages[1]} alt="" className="aspect-square w-full object-cover" />
            <p className="mt-4 text-center font-['Cormorant_Garamond'] text-lg italic text-[#E8788A]">
              the proposal ♥
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-[28px] bg-gradient-to-br from-[#E8788A] to-[#FF9A8B] px-8 py-16 text-center text-white shadow-[0_20px_60px_rgba(232,120,138,0.35)]"
          >
            <h2 className="font-['Cormorant_Garamond'] text-4xl">ההצעה</h2>
            <p className="mt-8 font-['Cormorant_Garamond'] text-2xl italic leading-relaxed">
              &ldquo;{DEMO.proposalStory}&rdquo;
            </p>
          </motion.div>
        </div>
      </section>

      {/* GALLERY — polaroids with rotation */}
      <section id="gallery" className="overflow-hidden py-20">
        <div className="mb-12 text-center">
          <h2 className="font-['Cormorant_Garamond'] text-4xl italic text-[#E8788A]">gallery</h2>
        </div>
        <div className="flex flex-wrap justify-center gap-8 px-6">
          {template.galleryImages.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, y: 40, rotate: polaroidRotations[i % polaroidRotations.length] }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
              className="w-56 bg-white p-3 pb-10 shadow-[0_15px_50px_rgba(232,120,138,0.25)] md:w-64"
              style={{ rotate: `${polaroidRotations[i % polaroidRotations.length]}deg` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <WeddingMedia slot={`gallery.${i}`} src={src} alt="" loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover" />
              <p className="mt-3 text-center font-['Cormorant_Garamond'] text-sm italic text-[#9A6070]">
                moment {i + 1} ♥
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* VIDEO */}
      <section id="video" className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-10 text-center font-['Cormorant_Garamond'] text-4xl">סרטון</h2>
          <div className="overflow-hidden rounded-[28px] shadow-[0_20px_60px_rgba(232,120,138,0.2)] ring-4 ring-[#FFD4DC]">
            <WeddingMedia slot={`videos.beach`} src={VIDEOS.beach} autoPlay muted loop playsInline className="aspect-video w-full object-cover" />
          </div>
        </div>
      </section>

      {/* EVENT DETAILS */}
      <section id="event-details" className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-['Cormorant_Garamond'] text-4xl">פרטי האירוע</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: "📅", label: "תאריך", value: formatHebrewDate(DEMO.weddingDate) },
              { icon: "🕐", label: "שעה", value: DEMO.weddingTime },
              { icon: "pin", label: "מקום", value: DEMO.venueName },
            ].map(({ icon, label, value }) => (
              <div
                key={label}
                className="rounded-[28px] bg-gradient-to-br from-[#FFF5F7] to-[#FFE8EE] p-8"
              >
                {icon === "pin" ? (
                  <MapPin className="mx-auto h-8 w-8 text-[#E8788A]" aria-hidden />
                ) : (
                  <span className="text-3xl">{icon}</span>
                )}
                <p className="mt-3 text-xs text-[#E8788A]">{label}</p>
                <p className="mt-2 font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCHEDULE */}
      <section id="schedule" className="py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl">לוח זמנים</h2>
          <div className="mt-12 space-y-4">
            {DEMO.schedule.map((item, i) => (
              <motion.div
                key={item.time}
                initial={{ opacity: 0, x: i % 2 ? 20 : -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex gap-4 rounded-[28px] bg-white p-5 shadow-sm"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E8788A] to-[#FF9A8B] text-sm font-bold text-white">
                  {item.time}
                </div>
                <div>
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm text-[#9A6070]">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCATION */}
      <section id="location" className="bg-gradient-to-b from-[#FFE8EE]/30 to-transparent py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
          <div>
            <h2 className="font-['Cormorant_Garamond'] text-4xl">מיקום</h2>
            <LocationDisplay
              name={DEMO.venueName}
              address={DEMO.venueAddress}
              className="mt-6"
              nameClassName="text-xl font-bold"
              addressClassName="mt-2 text-[#9A6070]"
              iconClassName="h-5 w-5 shrink-0 text-[#E8788A]"
            />
            <WeddingVenueNav
              address={DEMO.venueAddress}
              googleHref={`https://maps.google.com/?q=${encodeURIComponent(DEMO.venueAddress)}`}
              className="mt-8 flex flex-wrap gap-3"
              linkClassName="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-[#E8788A] to-[#FF9A8B] px-8 py-3 text-sm font-bold text-white"
            />
          </div>
          <div className="overflow-hidden rounded-[28px] shadow-lg ring-2 ring-[#FFD4DC]">
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
        <h2 className="font-['Cormorant_Garamond'] text-4xl italic">dress code</h2>
        <p className="mx-auto mt-8 max-w-xl leading-relaxed text-[#9A6070]">{DEMO.dressCode}</p>
      </section>

      {/* ACCOMMODATIONS */}
      <section id="accommodations" className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl">לינה</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {DEMO.accommodations.map((h) => (
              <div key={h.name} className="rounded-[28px] border border-[#FFD4DC] bg-[#FFF5F7] p-6">
                <h3 className="font-bold text-[#E8788A]">{h.name}</h3>
                <p className="mt-2 text-sm text-[#9A6070]">{h.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRANSPORTATION */}
      <section id="transportation" className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl">הגעה</h2>
          <div className="mt-10 space-y-4">
            {DEMO.transportation.map((t) => (
              <div key={t.title} className="rounded-[28px] bg-white p-6 shadow-sm">
                <h3 className="font-bold text-[#E8788A]">{t.title}</h3>
                <p className="mt-2 text-sm text-[#9A6070]">{t.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl">שאלות נפוצות</h2>
          <div className="mt-10 space-y-3">
            {DEMO.faq.map((item, i) => (
              <div key={item.question} className="overflow-hidden rounded-[28px] bg-[#FFF5F7]">
                <button
                  type="button"
                  onClick={() => faq.toggle(i)}
                  className="flex w-full items-center justify-between p-5 text-right"
                >
                  <span className="text-[#E8788A]">{faq.open === i ? "♥" : "♡"}</span>
                  <span className="font-medium">{item.question}</span>
                </button>
                {faq.open === i && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-5 pb-5 text-sm text-[#9A6070]"
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
      <section id="rsvp" className="py-24">
        <div className="mx-auto max-w-md px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl">אישור הגעה</h2>
          <WeddingTemplateRsvp templateId="sunset-blush" controller={rsvpController} />
        </div>
      </section>
      )}
      {/* GIFTS */}
      <section id="gifts" className="py-20 text-center">
        <span className="text-5xl">🎁</span>
        <h2 className="mt-4 font-['Cormorant_Garamond'] text-4xl">מתנות</h2>
        <p className="mx-auto mt-6 max-w-lg text-[#9A6070]">{DEMO.giftsNote}</p>
        <WeddingGiftActions
          className="mt-8"
          actionClassName="rounded-full border-2 border-[#E8788A] px-8 py-3 font-bold text-[#E8788A]"
        />
      </section>

      {/* GUESTBOOK */}
      {live ? (
        guestMessageSlot ? <section id="guestbook" className="py-16">{guestMessageSlot}</section> : null
      ) : (
      <section id="guestbook" className="bg-white py-20">
        <div className="mx-auto max-w-xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl">ספר ברכות</h2>
          <div className="mt-10 rounded-[28px] bg-[#FFF5F7] p-6">
            <textarea
              value={guestbook.message}
              onChange={(e) => guestbook.setMessage(e.target.value)}
              placeholder="ברכה חמה..."
              rows={3}
              className="w-full resize-none bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={guestbook.addMessage}
              className="mt-4 rounded-full bg-gradient-to-r from-[#E8788A] to-[#FF9A8B] px-6 py-2 text-sm font-bold text-white"
            >
              שליחה ♥
            </button>
          </div>
          <div className="mt-8 space-y-4">
            {guestbook.items.map((m) => (
              <div key={`${m.name}-${m.date}`} className="rounded-[28px] border border-[#FFD4DC] p-5">
                <div className="flex justify-between text-xs text-[#E8788A]">
                  <span>{m.date}</span>
                  <span>{m.name}</span>
                </div>
                <p className="mt-2 text-sm">{m.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      )}
      {/* GUEST UPLOAD */}
      <section id="guest-upload" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl">זיכרונות</h2>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              upload.setDragging(true);
            }}
            onDragLeave={() => upload.setDragging(false)}
            onDrop={upload.onDrop}
            className={`mt-10 rounded-[28px] border-2 border-dashed p-12 text-center transition ${
              upload.dragging ? "border-[#E8788A] bg-[#FFE8EE]" : "border-[#FFD4DC]"
            }`}
          >
            <p className="font-['Cormorant_Garamond'] text-xl italic text-[#E8788A]">שתפו תמונות ♥</p>
            <label className="mt-4 inline-block cursor-pointer rounded-full bg-gradient-to-r from-[#E8788A] to-[#FF9A8B] px-6 py-2 text-sm font-bold text-white">
              העלאה
              <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={upload.onFileChange} />
            </label>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {upload.items.map((item, i) => (
              <div
                key={item.id}
                className="w-32 overflow-hidden bg-white p-2 shadow-md"
                style={{ rotate: `${polaroidRotations[i % polaroidRotations.length] / 2}deg` }}
              >
                <EventUploadMedia item={item} className="aspect-square w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLAYLIST */}
      <section id="playlist" className="bg-gradient-to-br from-[#E8788A] to-[#FF9A8B] py-20 text-white">
        <div className="mx-auto max-w-lg px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl">מוזיקה</h2>
          <p className="mt-4 text-center text-sm text-white/80">{DEMO.playlistNote}</p>
          <div className="mt-8 flex gap-2">
            <input
              value={playlist.song}
              onChange={(e) => playlist.setSong(e.target.value)}
              placeholder="שיר..."
              className="flex-1 rounded-full bg-white/20 px-5 py-3 text-white placeholder:text-white/60 outline-none backdrop-blur"
            />
            <button type="button" onClick={playlist.addSong} className="rounded-full bg-white px-5 font-bold text-[#E8788A]">
              +
            </button>
          </div>
          <ul className="mt-6 space-y-2">
            {playlist.songs.map((s) => (
              <li key={s} className="rounded-full bg-white/15 px-5 py-3 text-sm backdrop-blur">
                ♪ {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="footer" className="py-16 text-center">
        <HeartParticles />
        <h2 className="relative font-['Cormorant_Garamond'] text-4xl text-[#E8788A]">{DEMO.coupleNames}</h2>
        <p className="relative mt-4 text-sm text-[#9A6070]">{formatHebrewDate(DEMO.weddingDate)}</p>
        <p className="relative mx-auto mt-6 max-w-md text-sm text-[#9A6070]">{DEMO.footerNote}</p>
      </footer>
    </div>
  );
}
