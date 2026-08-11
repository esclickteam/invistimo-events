"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate, VIDEOS } from "../shared/weddingUtils";
import { useWeddingContent } from "../shared/WeddingSiteContext";
import WeddingSmartNav from "../shared/WeddingSmartNav";
import {
  useFaqAccordion,
  useWeddingRsvp,
} from "../shared/useWeddingInteractions";
import Starfield from "../illustrations/Starfield";
import ShuttleRide from "../illustrations/ShuttleRide";
import MapPinPulse from "../illustrations/MapPinPulse";

const NAV = {
  bg: "rgba(13,11,16,0.9)",
  text: "#F5F0E8",
  muted: "#A89BB0",
  accent: "#D4AF37",
  border: "rgba(212,175,55,0.25)",
  fontDisplay: "'Playfair Display', serif",
  dark: true,
};

const GOLD = "#D4AF37";

const fade = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" as const },
  transition: { duration: 0.75, ease: "easeOut" as const },
};

function Section({
  id,
  className = "",
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section id={id} {...fade} className={`scroll-mt-24 overflow-x-clip ${className}`}>
      {children}
    </motion.section>
  );
}

export default function MidnightVelvetSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const DEMO = useWeddingContent();
  const rsvp = useWeddingRsvp();
  const faq = useFaqAccordion(0);
  const images = DEMO.galleryUrls?.length ? DEMO.galleryUrls : template.galleryImages;

  return (
    <div className="wedding-website-root overflow-x-clip bg-[#0D0B10] text-[#F5F0E8]" dir="rtl">
      {!embed && (
        <WeddingSmartNav theme={NAV} hideDemoLink={hideDemoBadge} mode="fixed" />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed bottom-4 left-4 z-[55] rounded-sm border border-[#D4AF37]/40 bg-[#0D0B10]/90 px-4 py-2 text-xs font-bold text-[#D4AF37]"
        >
          ← תבניות
        </Link>
      )}

      {/* HERO — cinematic widescreen + Starfield */}
      <section id="hero" className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 pb-16 pt-28 md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1520_0%,_#0D0B10_70%)]" />
        <div className="relative z-10 w-full max-w-6xl">
          <div className="relative aspect-[2.35/1] w-full overflow-hidden rounded-sm border border-[#D4AF37]/25 shadow-[0_0_80px_rgba(212,175,55,0.12)]">
            <video
              src={VIDEOS.rings}
              autoPlay
              muted
              loop
              playsInline
              poster={DEMO.heroImageUrl || template.heroImage}
              className="h-full w-full object-cover"
              preload="metadata"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/50" />
            <Starfield count={32} />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <motion.p
                initial={{ opacity: 0, letterSpacing: "0.2em" }}
                animate={{ opacity: 1, letterSpacing: "0.45em" }}
                transition={{ duration: 1.2 }}
                className="mb-3 text-[10px] font-bold uppercase text-[#D4AF37]"
              >
                Midnight Velvet
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.9 }}
                className="font-['Playfair_Display'] text-[clamp(2.4rem,7vw,5.5rem)] font-semibold leading-none"
                style={{ textShadow: "0 0 48px rgba(212,175,55,0.45)" }}
              >
                {DEMO.coupleNames}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-5 max-w-lg text-sm text-[#F5F0E8]/75 md:text-base"
              >
                {DEMO.heroSubtitle}
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 flex flex-wrap justify-center gap-3"
              >
                <a
                  href="#rsvp"
                  className="rounded-sm bg-[#D4AF37] px-7 py-3 text-sm font-bold text-[#0D0B10] shadow-[0_0_28px_rgba(212,175,55,0.35)]"
                >
                  אישור הגעה
                </a>
                <a
                  href="#schedule"
                  className="rounded-sm border border-[#D4AF37]/50 px-7 py-3 text-sm font-bold text-[#D4AF37]"
                >
                  לוח זמנים
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Event details strip */}
      <Section id="event-details" className="border-y border-[#D4AF37]/20 bg-[#141018] py-10">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 text-center md:grid-cols-3">
          {[
            ["תאריך", formatHebrewDate(DEMO.weddingDate)],
            ["שעה", DEMO.weddingTime || "19:30"],
            ["מקום", DEMO.venueName || "האולם"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#A89BB0]">{label}</p>
              <p className="mt-2 font-['Playfair_Display'] text-xl text-[#D4AF37]">{value}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="our-story" className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-['Playfair_Display'] text-4xl text-[#D4AF37]">הסיפור שלנו</h2>
          <div className="mx-auto my-5 h-px w-24 bg-gradient-to-l from-transparent via-[#D4AF37] to-transparent" />
          <div className="space-y-5 text-base leading-relaxed text-[#A89BB0]">
            {(DEMO.storyParagraphs.length
              ? DEMO.storyParagraphs
              : ["אנחנו שמחים לחלוק איתכם את היום המיוחד שלנו."]
            ).map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </Section>

      <Section id="schedule" className="bg-[#141018] py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#D4AF37]">לוח זמנים</h2>
          <div className="mx-auto my-5 h-px w-24 bg-gradient-to-l from-transparent via-[#D4AF37] to-transparent" />
          <ol className="space-y-4">
            {(DEMO.schedule.length
              ? DEMO.schedule
              : [{ time: DEMO.weddingTime || "19:30", title: "תחילת האירוע", description: "" }]
            ).map((item) => (
              <li
                key={`${item.time}-${item.title}`}
                className="rounded-sm border border-[#D4AF37]/25 bg-[#0D0B10] px-5 py-4 shadow-[0_0_24px_rgba(212,175,55,0.08)]"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-semibold text-[#F5F0E8]">{item.title}</p>
                  <span className="font-['Playfair_Display'] text-lg text-[#D4AF37]">{item.time}</span>
                </div>
                {item.description ? (
                  <p className="mt-1 text-sm text-[#A89BB0]">{item.description}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section id="gallery" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#D4AF37]">גלריה</h2>
          <div className="mx-auto my-5 h-px w-24 bg-gradient-to-l from-transparent via-[#D4AF37] to-transparent" />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
            {images.slice(0, 6).map((src, i) => (
              <motion.figure
                key={src}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`overflow-hidden border border-[#D4AF37]/20 ${i === 0 ? "md:col-span-2 md:row-span-2" : ""}`}
              >
                <img
                  src={src}
                  alt=""
                  className={`w-full object-cover ${i === 0 ? "h-full min-h-[280px]" : "aspect-square"}`}
                />
              </motion.figure>
            ))}
          </div>
        </div>
      </Section>

      <Section id="location" className="bg-[#141018] py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <MapPinPulse accent={GOLD} />
          <h2 className="mt-3 font-['Playfair_Display'] text-4xl text-[#D4AF37]">
            {DEMO.venueName || "מיקום"}
          </h2>
          <p className="mt-2 text-[#A89BB0]">{DEMO.venueAddress}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {DEMO.wazeUrl ? (
              <a href={DEMO.wazeUrl} target="_blank" rel="noreferrer" className="rounded-sm bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#0D0B10]">
                Waze
              </a>
            ) : null}
            {DEMO.mapsUrl ? (
              <a href={DEMO.mapsUrl} target="_blank" rel="noreferrer" className="rounded-sm border border-[#D4AF37]/50 px-6 py-3 text-sm font-bold text-[#D4AF37]">
                Google Maps
              </a>
            ) : null}
          </div>
          {DEMO.venueAddress ? (
            <div className="mt-8 overflow-hidden border border-[#D4AF37]/25">
              <iframe
                title="map"
                className="aspect-[16/9] w-full border-0"
                loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(DEMO.venueAddress)}&z=14&output=embed`}
              />
            </div>
          ) : null}
        </div>
      </Section>

      <Section id="transportation" className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#D4AF37]">הגעה והסעות</h2>
          <div className="mx-auto my-5 h-px w-24 bg-gradient-to-l from-transparent via-[#D4AF37] to-transparent" />
          <ShuttleRide accent={GOLD} className="mb-8" />
          <div className="grid gap-4 md:grid-cols-3">
            {(DEMO.transportation.length
              ? DEMO.transportation
              : [{ title: "הגעה", description: "פרטי הגעה יתעדכנו לקראת האירוע" }]
            ).map((item) => (
              <div key={item.title} className="rounded-sm border border-[#D4AF37]/25 bg-[#141018] p-5">
                <h3 className="font-['Playfair_Display'] text-xl text-[#D4AF37]">{item.title}</h3>
                <p className="mt-2 text-sm text-[#A89BB0]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="rsvp" className="bg-[#141018] py-20">
        <div className="mx-auto max-w-md px-6">
          <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#D4AF37]">אישור הגעה</h2>
          <div className="mx-auto my-5 h-px w-24 bg-gradient-to-l from-transparent via-[#D4AF37] to-transparent" />
          {rsvp.sent ? (
            <p className="text-center text-lg text-[#D4AF37]">תודה! קיבלנו את אישור ההגעה.</p>
          ) : (
            <div className="space-y-4 rounded-sm border border-[#D4AF37]/30 bg-[#0D0B10] p-7">
              {rsvp.guestName ? (
                <p className="text-center text-sm text-[#A89BB0]">שלום {rsvp.guestName}</p>
              ) : null}
              <div className="flex gap-3">
                {(["yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => rsvp.setRsvp(v)}
                    className={`flex-1 rounded-sm py-3 text-sm font-bold ${
                      rsvp.rsvp === v
                        ? "bg-[#D4AF37] text-[#0D0B10]"
                        : "border border-[#D4AF37]/40 text-[#A89BB0]"
                    }`}
                  >
                    {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                  </button>
                ))}
              </div>
              {rsvp.rsvp === "yes" ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-[#A89BB0]">מספר אורחים</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={rsvp.count}
                    onChange={(e) => rsvp.setCount(Number(e.target.value))}
                    className="w-20 rounded-sm border border-[#D4AF37]/40 bg-transparent px-3 py-2 text-center text-[#F5F0E8]"
                  />
                </div>
              ) : null}
              {rsvp.error ? <p className="text-center text-sm font-bold text-red-400">{rsvp.error}</p> : null}
              <button
                type="button"
                disabled={!rsvp.rsvp || rsvp.saving}
                onClick={() => void rsvp.submit()}
                className="w-full rounded-sm bg-[#D4AF37] py-3.5 text-sm font-bold text-[#0D0B10] disabled:opacity-40"
              >
                {rsvp.saving ? "שולח..." : "שליחה"}
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section id="gifts" className="py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="font-['Playfair_Display'] text-4xl text-[#D4AF37]">מתנות</h2>
          <div className="mx-auto my-5 h-px w-24 bg-gradient-to-l from-transparent via-[#D4AF37] to-transparent" />
          <p className="text-[#A89BB0]">{DEMO.giftsNote || "הנוכחות שלכם היא המתנה הגדולה מכולן."}</p>
          {DEMO.giftLinks?.creditUrl ? (
            <a
              href={DEMO.giftLinks.creditUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex rounded-sm border border-[#D4AF37] px-7 py-3 text-sm font-bold text-[#D4AF37]"
            >
              מתנה דיגיטלית
            </a>
          ) : null}
        </div>
      </Section>

      <Section id="faq" className="bg-[#141018] py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center font-['Playfair_Display'] text-4xl text-[#D4AF37]">שאלות נפוצות</h2>
          <div className="mx-auto my-5 h-px w-24 bg-gradient-to-l from-transparent via-[#D4AF37] to-transparent" />
          <div className="space-y-3">
            {(DEMO.faq.length
              ? DEMO.faq
              : [{ question: "איך מאשרים הגעה?", answer: "דרך טופס אישור ההגעה בעמוד זה." }]
            ).map((item, i) => (
              <button
                key={item.question}
                type="button"
                onClick={() => faq.toggle(i)}
                className="w-full rounded-sm border border-[#D4AF37]/25 bg-[#0D0B10] px-5 py-4 text-right"
              >
                <p className="font-semibold text-[#F5F0E8]">{item.question}</p>
                {faq.open === i ? <p className="mt-2 text-sm text-[#A89BB0]">{item.answer}</p> : null}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <footer id="footer" className="border-t border-[#D4AF37]/20 px-6 py-16 text-center">
        <p className="font-['Playfair_Display'] text-3xl text-[#D4AF37]">{DEMO.coupleNames}</p>
        <p className="mt-4 text-sm text-[#A89BB0]">{DEMO.footerNote || "נתראה בחגיגה"}</p>
        <p className="mt-6 text-xs tracking-[0.25em] text-[#A89BB0]/50">
          {formatHebrewDate(DEMO.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
