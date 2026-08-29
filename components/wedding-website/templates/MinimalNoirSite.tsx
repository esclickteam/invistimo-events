"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";
import {
  useCountdownTimer,
  useFaqAccordion,
  useGuestbook,
  useGuestUpload,
  usePlaylistDemo,
} from "../shared/useWeddingInteractions";
import WeddingTemplateRsvp from "../WeddingTemplateRsvp";
import { DEMO, VIDEOS, formatHebrewDate, type TemplateProps } from "../shared/weddingUtils";
import WeddingMedia from "../editable/WeddingMedia";
import LocationDisplay from "@/app/components/LocationDisplay";
import WeddingVenueNav from "../WeddingVenueNav";

const NAV = WEDDING_SECTIONS.filter((s) => s.id !== "footer");

function NoirRule({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-black ${className}`} />;
}

function NoirLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-neutral-500">
      {children}
    </span>
  );
}

function NoirNav({ embed }: { embed?: boolean }) {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-40% 0px -55% 0px" }
    );
    NAV.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  if (embed) return null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest">
          {DEMO.coupleShort}
        </span>
        <nav className="hidden gap-0 md:flex">
          {NAV.slice(0, 8).map(({ id, navLabel }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`border-l border-black px-3 py-1 font-mono text-[9px] uppercase tracking-wider transition ${
                active === id ? "bg-black text-white" : "hover:bg-neutral-100"
              }`}
            >
              {navLabel}
            </a>
          ))}
        </nav>
        <a
          href="#rsvp"
          className="border border-black px-3 py-1 font-mono text-[10px] uppercase tracking-widest hover:bg-black hover:text-white"
        >
          RSVP
        </a>
      </div>
    </header>
  );
}

function CountdownBlock() {
  const countdown = useCountdownTimer(DEMO.weddingDate, DEMO.weddingTime);
  return (
      <section id="countdown" className="border-t border-black">
        <div className="grid md:grid-cols-5">
          <div className="flex items-end border-b border-black p-8 md:col-span-1 md:border-b-0 md:border-l">
            <div>
              <NoirLabel>Countdown</NoirLabel>
              <h2 className="mt-2 text-3xl font-black">הספירה</h2>
            </div>
          </div>
          {(
            [
              ["ימים", countdown.days],
              ["שעות", countdown.hours],
              ["דקות", countdown.minutes],
              ["שניות", countdown.seconds],
            ] as const
          ).map(([label, value], i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="border-l border-black p-8 text-center"
            >
              <div className="font-mono text-[clamp(2.5rem,8vw,5rem)] font-black tabular-nums leading-none">
                {String(value).padStart(2, "0")}
              </div>
              <NoirLabel>{label}</NoirLabel>
            </motion.div>
          ))}
        </div>
      </section>
  );
}

export default function MinimalNoirSite({ template, embed, live, rsvpController, guestMessageSlot }: TemplateProps) {
  const guestbook = useGuestbook();
  const upload = useGuestUpload();
  const playlist = usePlaylistDemo();
  const faq = useFaqAccordion(null);
  const { scrollYProgress } = useScroll();
  const lineWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const [namesFirst, namesSecond] = DEMO.coupleNames.split("&").map((s) => s.trim());

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-black selection:bg-black selection:text-white">
      <NoirNav embed={embed} />

      {/* Progress line */}
      <motion.div
        style={{ width: lineWidth }}
        className="fixed left-0 top-0 z-[60] h-[2px] bg-black"
      />

      {/* HERO — typography only, no photo */}
      <section
        id="hero"
        className={`grid min-h-screen grid-rows-[1fr_auto] ${embed ? "" : "pt-14"}`}
      >
        <div className="flex flex-col justify-center px-6 md:px-12 lg:px-20">
          <NoirLabel>Save the Date · {DEMO.coupleShort}</NoirLabel>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="mt-8 grid gap-0 md:grid-cols-2"
          >
            <motion.h1
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-[clamp(3.5rem,14vw,11rem)] font-black leading-[0.85] tracking-[-0.04em]"
            >
              {namesFirst}
            </motion.h1>
            <motion.h1
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-right text-[clamp(3.5rem,14vw,11rem)] font-black leading-[0.85] tracking-[-0.04em] md:text-left"
            >
              & {namesSecond}
            </motion.h1>
          </motion.div>
          <NoirRule className="my-8" />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="max-w-lg font-mono text-sm leading-relaxed text-neutral-600"
          >
            {DEMO.heroSubtitle}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-6 font-mono text-xs uppercase tracking-[0.3em]"
          >
            {formatHebrewDate(DEMO.weddingDate)} — {DEMO.weddingTime}
          </motion.p>
        </div>
        <div className="grid grid-cols-2 border-t border-black md:grid-cols-4">
          {[
            { label: "RSVP", href: "#rsvp" },
            { label: "Story", href: "#our-story" },
            { label: "Gallery", href: "#gallery" },
            { label: "Details", href: "#event-details" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="border-l border-black py-6 text-center font-mono text-xs uppercase tracking-[0.35em] first:border-l-0 hover:bg-black hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>
      </section>

      {/* COUNTDOWN — stark grid */}
      <CountdownBlock />

      {/* INVITATION */}
      <section id="invitation" className="border-t border-black">
        <div className="grid md:grid-cols-12">
          <div className="border-b border-black p-8 md:col-span-4 md:border-b-0 md:border-l">
            <NoirLabel>Invitation</NoirLabel>
            <h2 className="mt-2 text-4xl font-black">הזמנה</h2>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="p-8 md:col-span-8 md:border-l md:border-black"
          >
            <p className="text-lg leading-[1.9] text-neutral-700">{DEMO.invitationText}</p>
            <NoirRule className="my-8" />
            <p className="font-mono text-xs uppercase tracking-widest">{DEMO.venueName}</p>
          </motion.div>
        </div>
      </section>

      {/* OUR STORY */}
      <section id="our-story" className="border-t border-black bg-neutral-50">
        <div className="mx-auto max-w-7xl p-8 md:p-16">
          <NoirLabel>Our Story</NoirLabel>
          <h2 className="mb-12 text-4xl font-black">הסיפור שלנו</h2>
          <div className="grid gap-0 md:grid-cols-3">
            {DEMO.storyParagraphs.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="border border-black bg-white p-6 md:-mr-px md:first:mr-0"
              >
                <span className="font-mono text-4xl font-black text-neutral-200">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-4 text-sm leading-relaxed text-neutral-700">{p}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE MET */}
      <section id="how-we-met" className="border-t border-black">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-square border-b border-black md:border-b-0 md:border-l">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <WeddingMedia
              slot="how-we-met" src={template.galleryImages[0]}
              alt=""
              className="h-full w-full object-cover grayscale"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
          <div className="flex flex-col justify-center p-8 md:p-16">
            <NoirLabel>How We Met</NoirLabel>
            <h2 className="mt-2 text-3xl font-black">איך נפגשנו</h2>
            <NoirRule className="my-6 w-16" />
            <p className="leading-relaxed text-neutral-700">{DEMO.howWeMet}</p>
          </div>
        </div>
      </section>

      {/* PROPOSAL */}
      <section id="proposal" className="border-t border-black bg-black text-white">
        <div className="mx-auto max-w-4xl px-8 py-20 text-center">
          <NoirLabel>Proposal</NoirLabel>
          <motion.blockquote
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mt-6 text-2xl font-light leading-relaxed md:text-4xl"
          >
            &ldquo;{DEMO.proposalStory}&rdquo;
          </motion.blockquote>
        </div>
      </section>

      {/* GALLERY — rectangular grid */}
      <section id="gallery" className="border-t border-black">
        <div className="border-b border-black p-8">
          <NoirLabel>Gallery</NoirLabel>
          <h2 className="text-4xl font-black">גלריה</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {template.galleryImages.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group relative aspect-square border-l border-t border-black"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <WeddingMedia slot={`gallery.${i}`} src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover grayscale transition group-hover:grayscale-0"
              />
              <span className="absolute bottom-2 left-2 font-mono text-[10px] text-white">
                {String(i + 1).padStart(2, "0")}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* VIDEO */}
      <section id="video" className="border-t border-black">
        <div className="grid md:grid-cols-3">
          <div className="border-b border-black p-8 md:border-b-0 md:border-l">
            <NoirLabel>Video</NoirLabel>
            <h2 className="text-3xl font-black">סרטון</h2>
          </div>
          <div className="md:col-span-2">
            <WeddingMedia
              slot={`videos.rings`} src={VIDEOS.rings}
              autoPlay
              muted
              loop
              playsInline
              className="aspect-video w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* EVENT DETAILS */}
      <section id="event-details" className="border-t border-black bg-neutral-50">
        <div className="mx-auto max-w-7xl p-8 md:p-16">
          <NoirLabel>Event Details</NoirLabel>
          <h2 className="mb-8 text-4xl font-black">פרטי האירוע</h2>
          <div className="grid gap-0 border border-black md:grid-cols-3">
            {[
              { k: "תאריך", v: formatHebrewDate(DEMO.weddingDate) },
              { k: "שעה", v: DEMO.weddingTime },
              { k: "מקום", v: DEMO.venueName },
            ].map(({ k, v }) => (
              <div key={k} className="border-b border-black p-6 last:border-b-0 md:border-b-0 md:border-l md:first:border-l-0">
                <NoirLabel>{k}</NoirLabel>
                <p className="mt-2 font-bold">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCHEDULE — timeline grid */}
      <section id="schedule" className="border-t border-black">
        <div className="mx-auto max-w-7xl p-8 md:p-16">
          <NoirLabel>Schedule</NoirLabel>
          <h2 className="mb-10 text-4xl font-black">לוח זמנים</h2>
          <div className="space-y-0">
            {DEMO.schedule.map((item, i) => (
              <motion.div
                key={item.time}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-[80px_1fr] gap-4 border-t border-black py-6 md:grid-cols-[120px_1fr_2fr]"
              >
                <span className="font-mono text-sm font-bold">{item.time}</span>
                <span className="font-bold">{item.title}</span>
                <span className="text-sm text-neutral-600 md:col-start-2 md:col-span-2 md:row-start-2 md:pl-[120px] md:col-start-auto md:col-span-1 md:row-start-auto md:pl-0">
                  {item.description}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCATION */}
      <section id="location" className="border-t border-black">
        <div className="grid md:grid-cols-2">
          <div className="p-8 md:p-16">
            <NoirLabel>Location</NoirLabel>
            <h2 className="mt-2 text-3xl font-black">מיקום</h2>
            <LocationDisplay
              name={DEMO.venueName}
              address={DEMO.venueAddress}
              className="mt-6"
              nameClassName="font-bold"
              addressClassName="mt-2 font-mono text-sm text-neutral-600"
              iconClassName="h-5 w-5 shrink-0"
            />
            <WeddingVenueNav
              address={DEMO.venueAddress}
              googleHref={`https://maps.google.com/?q=${encodeURIComponent(DEMO.venueAddress)}`}
              className="mt-6 flex flex-wrap gap-3"
              linkClassName="inline-flex min-h-[44px] items-center gap-2 border border-black px-6 py-3 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white"
            />
          </div>
          <div className="min-h-[280px] border-t border-black bg-neutral-200 md:border-t-0 md:border-l">
            <iframe
              title="map"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(DEMO.venueAddress)}&output=embed`}
              className="h-full min-h-[280px] w-full grayscale"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* DRESS CODE */}
      <section id="dress-code" className="border-t border-black">
        <div className="flex flex-col items-center px-8 py-20 text-center">
          <NoirLabel>Dress Code</NoirLabel>
          <h2 className="mt-2 text-3xl font-black">קוד לבוש</h2>
          <NoirRule className="my-8 w-24" />
          <p className="max-w-xl leading-relaxed text-neutral-700">{DEMO.dressCode}</p>
        </div>
      </section>

      {/* ACCOMMODATIONS */}
      <section id="accommodations" className="border-t border-black bg-neutral-50">
        <div className="mx-auto max-w-7xl p-8 md:p-16">
          <NoirLabel>Accommodations</NoirLabel>
          <h2 className="mb-8 text-3xl font-black">לינה</h2>
          <div className="grid gap-0 md:grid-cols-3">
            {DEMO.accommodations.map((h) => (
              <div key={h.name} className="border border-black bg-white p-6 md:-mr-px">
                <h3 className="font-bold">{h.name}</h3>
                <p className="mt-2 text-sm text-neutral-600">{h.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRANSPORTATION */}
      <section id="transportation" className="border-t border-black">
        <div className="mx-auto max-w-7xl p-8 md:p-16">
          <NoirLabel>Transportation</NoirLabel>
          <h2 className="mb-8 text-3xl font-black">הגעה</h2>
          <div className="grid gap-0 md:grid-cols-3">
            {DEMO.transportation.map((t) => (
              <div key={t.title} className="border border-black p-6 md:-mr-px">
                <h3 className="font-mono text-xs uppercase tracking-widest">{t.title}</h3>
                <p className="mt-3 text-sm text-neutral-700">{t.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-black">
        <div className="mx-auto max-w-3xl p-8 md:p-16">
          <NoirLabel>FAQ</NoirLabel>
          <h2 className="mb-8 text-3xl font-black">שאלות נפוצות</h2>
          {DEMO.faq.map((item, i) => (
            <div key={item.question} className="border-t border-black">
              <button
                type="button"
                onClick={() => faq.toggle(i)}
                className="flex w-full items-center justify-between py-5 text-right"
              >
                <span className="font-mono text-lg">{faq.open === i ? "−" : "+"}</span>
                <span className="font-bold">{item.question}</span>
              </button>
              {faq.open === i && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="pb-5 text-sm leading-relaxed text-neutral-600"
                >
                  {item.answer}
                </motion.p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* RSVP */}
      {!(live && !rsvpController) && (
      <section id="rsvp" className="border-t border-black bg-black text-white">
        <div className="mx-auto max-w-xl p-8 md:p-16">
          <NoirLabel>RSVP</NoirLabel>
          <h2 className="mb-8 text-3xl font-black">אישור הגעה</h2>
          <WeddingTemplateRsvp templateId="minimal-noir" controller={rsvpController} />
        </div>
      </section>
      )}
      {/* GIFTS */}
      <section id="gifts" className="border-t border-black">
        <div className="mx-auto max-w-2xl p-8 py-20 text-center md:p-16">
          <NoirLabel>Gifts</NoirLabel>
          <h2 className="mt-2 text-3xl font-black">מתנות</h2>
          <p className="mt-6 leading-relaxed text-neutral-700">{DEMO.giftsNote}</p>
          <button
            type="button"
            className="mt-8 border border-black px-8 py-3 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white"
          >
            Bit / PayBox
          </button>
        </div>
      </section>

      {/* GUESTBOOK */}
      {live ? (
        guestMessageSlot ? <section id="guestbook" className="py-16">{guestMessageSlot}</section> : null
      ) : (
      <section id="guestbook" className="border-t border-black bg-neutral-50">
        <div className="mx-auto max-w-3xl p-8 md:p-16">
          <NoirLabel>Guestbook</NoirLabel>
          <h2 className="mb-8 text-3xl font-black">ספר ברכות</h2>
          <div className="flex gap-2 border border-black bg-white p-2">
            <input
              value={guestbook.message}
              onChange={(e) => guestbook.setMessage(e.target.value)}
              placeholder="ברכה..."
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={guestbook.addMessage}
              className="bg-black px-4 py-2 font-mono text-[10px] uppercase text-white"
            >
              שליחה
            </button>
          </div>
          <div className="mt-8 space-y-0">
            {guestbook.items.map((m) => (
              <div key={`${m.name}-${m.date}`} className="border-t border-black py-4">
                <div className="flex justify-between font-mono text-[10px] uppercase">
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
      <section id="guest-upload" className="border-t border-black">
        <div className="mx-auto max-w-7xl p-8 md:p-16">
          <NoirLabel>Memories</NoirLabel>
          <h2 className="mb-8 text-3xl font-black">זיכרונות מהאירוע</h2>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              upload.setDragging(true);
            }}
            onDragLeave={() => upload.setDragging(false)}
            onDrop={upload.onDrop}
            className={`border-2 border-dashed p-12 text-center transition ${
              upload.dragging ? "border-black bg-neutral-100" : "border-neutral-300"
            }`}
          >
            <p className="font-mono text-xs uppercase tracking-widest">גררו קבצים או</p>
            <label className="mt-4 inline-block cursor-pointer border border-black px-6 py-2 font-mono text-xs uppercase hover:bg-black hover:text-white">
              בחרו קובץ
              <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={upload.onFileChange} />
            </label>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-0 md:grid-cols-4">
            {upload.items.map((item) => (
              <div key={item.id} className="aspect-square border border-black">
                {item.type === "video" ? (
                  <video src={item.url} className="h-full w-full object-cover" muted />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.url} alt="" className="h-full w-full object-cover grayscale" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLAYLIST */}
      <section id="playlist" className="border-t border-black bg-black text-white">
        <div className="mx-auto max-w-xl p-8 md:p-16">
          <NoirLabel>Playlist</NoirLabel>
          <h2 className="mb-4 text-3xl font-black">מוזיקה</h2>
          <p className="mb-8 text-sm text-neutral-400">{DEMO.playlistNote}</p>
          <div className="flex gap-2 border border-white p-2">
            <input
              value={playlist.song}
              onChange={(e) => playlist.setSong(e.target.value)}
              placeholder="שם שיר..."
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={playlist.addSong}
              className="bg-white px-4 py-2 font-mono text-[10px] uppercase text-black"
            >
              +
            </button>
          </div>
          <ul className="mt-6 space-y-2">
            {playlist.songs.map((s) => (
              <li key={s} className="border-t border-white/20 py-3 font-mono text-sm">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="footer" className="border-t border-black">
        <div className="grid grid-cols-2 md:grid-cols-4">
          <div className="col-span-2 border-b border-black p-8 md:col-span-4 md:border-b">
            <p className="text-2xl font-black">{DEMO.coupleNames}</p>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-neutral-500">
              {formatHebrewDate(DEMO.weddingDate)}
            </p>
          </div>
          <div className="col-span-2 p-8 md:col-span-4">
            <p className="text-sm text-neutral-600">{DEMO.footerNote}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
