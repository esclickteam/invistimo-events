"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides, useWeddingSite, isSectionEnabled } from "../shared/WeddingSiteContext";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import { SafeImage, SafeVideo } from "../shared/SafeMedia";
import WeddingSmartNav from "../shared/WeddingSmartNav";
import {
  useCountdownTimer,
  useFaqAccordion,
  useWeddingRsvp,
} from "../shared/useWeddingInteractions";
import PolaroidGallery from "../illustrations/PolaroidGallery";
import MapPinPulse from "../illustrations/MapPinPulse";
import ShuttleRide from "../illustrations/ShuttleRide";

const ACCENT = "#E8788A";
const NAV = {
  bg: "rgba(255,245,247,0.95)",
  text: "#3D1F28",
  muted: "#9A6070",
  accent: ACCENT,
  border: "rgba(232,120,138,0.28)",
  fontDisplay: "'Cormorant Garamond', serif",
};

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" as const },
  transition: { duration: 0.65, ease: "easeOut" as const },
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
  const { sections } = useWeddingSite();
  if (id !== "hero" && !isSectionEnabled(sections, id)) return null;
  return (
    <motion.section id={id} {...fade} className={`scroll-mt-24 overflow-x-clip ${className}`}>
      {children}
    </motion.section>
  );
}

export default function SunsetBlushSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const DEMO = useWeddingContent();
  const themeOverrides = useWeddingThemeOverrides();
  const time = useCountdownTimer(DEMO.weddingDate, DEMO.weddingTime);
  const rsvp = useWeddingRsvp();
  const faq = useFaqAccordion(0);
  const images = sanitizeGallery(DEMO.galleryUrls?.length ? DEMO.galleryUrls : template.galleryImages, template.galleryImages);
  const heroBg = DEMO.heroImageUrl || template.heroImage;

  return (
    <div
      dir="rtl"
      className="wedding-website-root min-h-screen overflow-x-clip bg-[#FFF5F7] text-[#3D1F28]"
      style={{ fontFamily: "'Cormorant Garamond', serif" }}
    >
      {!embed && (
        <WeddingSmartNav theme={NAV} hideDemoLink={hideDemoBadge} mode="fixed" />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed bottom-4 left-4 z-[55] rounded-full border border-[#E8788A]/35 bg-white/90 px-4 py-2 text-xs font-bold shadow-lg"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          ← תבניות
        </Link>
      )}

      {/* HERO — soft dusk gradient */}
      <section
        id="hero"
        className={`relative flex min-h-[100svh] items-center justify-center overflow-hidden px-6 text-center ${embed ? "" : "pt-14"}`}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(165deg, #FFE8EE 0%, #FFD0DC 42%, #E8788A 100%)",
          }}
        />
        {heroBg ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-soft-light"
            style={{ backgroundImage: `url(${heroBg})` }}
          />
        ) : null}
        <div className="relative z-10 max-w-2xl py-20">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#9A6070]"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Save the Date
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
            className="mt-6 text-[clamp(3rem,10vw,5.5rem)] font-light leading-[1.05] text-[#3D1F28]"
          >
            {DEMO.coupleNames}
          </motion.h1>
          <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-[#9A6070]">
            {DEMO.heroSubtitle}
          </p>
          <p className="mt-4 text-xl text-[#E8788A]">
            {formatHebrewDate(DEMO.weddingDate)}
            {DEMO.weddingTime ? ` · ${DEMO.weddingTime}` : ""}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3" style={{ fontFamily: "system-ui, sans-serif" }}>
            <a href="#rsvp" className="rounded-full bg-[#E8788A] px-8 py-3.5 text-sm font-bold text-white shadow-[0_14px_36px_rgba(232,120,138,0.35)]">
              אישור הגעה
            </a>
            <a href="#our-story" className="rounded-full border border-white/70 bg-white/50 px-8 py-3.5 text-sm font-bold text-[#3D1F28] backdrop-blur-sm">
              הסיפור שלנו
            </a>
          </div>
        </div>
      </section>

      <Section id="countdown" className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-light">הספירה לאחור</h2>
          <p className="mt-2 text-[#9A6070]">עד היום הגדול</p>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4" style={{ fontFamily: "system-ui, sans-serif" }}>
            {[
              ["ימים", time.days],
              ["שעות", time.hours],
              ["דקות", time.minutes],
              ["שניות", time.seconds],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-[28px] border border-[#E8788A]/25 bg-white/80 px-4 py-7 shadow-[0_12px_40px_rgba(232,120,138,0.1)]"
              >
                <p className="text-4xl font-light text-[#E8788A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {value}
                </p>
                <p className="mt-2 text-xs font-bold tracking-widest text-[#9A6070]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="our-story" className="bg-[#FFE8EE]/50 py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-4xl font-light">הסיפור שלנו</h2>
          <p className="mt-2 text-[#9A6070]">איך הכל התחיל</p>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-[#9A6070]">
            {(DEMO.storyParagraphs.length
              ? DEMO.storyParagraphs
              : ["אנחנו שמחים לחלוק איתכם את היום המיוחד שלנו."]
            ).map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </Section>

      <Section id="gallery" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-4xl font-light">רגעים</h2>
          <p className="mt-2 text-center text-[#9A6070]">כמו פולארוידים מהלב</p>
          <div className="mt-10">
            <PolaroidGallery images={images.slice(0, 6)} accent={ACCENT} />
          </div>
        </div>
      </Section>

      <Section id="schedule" className="bg-[#FFE8EE]/50 py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center text-4xl font-light">לוח זמנים</h2>
          <ol className="mt-10 space-y-4" style={{ fontFamily: "system-ui, sans-serif" }}>
            {(DEMO.schedule.length
              ? DEMO.schedule
              : [{ time: DEMO.weddingTime || "19:30", title: "תחילת האירוע", description: "" }]
            ).map((item) => (
              <li
                key={`${item.time}-${item.title}`}
                className="rounded-[24px] border border-[#E8788A]/25 bg-white/90 px-5 py-4 shadow-[0_10px_30px_rgba(232,120,138,0.08)]"
              >
                <div className="flex items-baseline gap-4">
                  <span className="text-lg font-bold text-[#E8788A]">{item.time}</span>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    {item.description ? (
                      <p className="mt-1 text-sm text-[#9A6070]">{item.description}</p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section id="location" className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <MapPinPulse accent={ACCENT} />
          <h2 className="mt-2 text-4xl font-light">{DEMO.venueName || "מיקום"}</h2>
          <p className="mt-2 text-[#9A6070]">{DEMO.venueAddress}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3" style={{ fontFamily: "system-ui, sans-serif" }}>
            {DEMO.wazeUrl ? (
              <a href={DEMO.wazeUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[#E8788A] px-6 py-3 text-sm font-bold text-white">
                Waze
              </a>
            ) : null}
            {DEMO.mapsUrl ? (
              <a href={DEMO.mapsUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#E8788A] px-6 py-3 text-sm font-bold text-[#E8788A]">
                Google Maps
              </a>
            ) : null}
          </div>
          {DEMO.venueAddress ? (
            <div className="mt-8 overflow-hidden rounded-[28px] border border-[#E8788A]/30 shadow-[0_16px_50px_rgba(232,120,138,0.12)]">
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

      <Section id="transportation" className="bg-[#FFE8EE]/50 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-4xl font-light">הגעה והסעות</h2>
          <ShuttleRide accent={ACCENT} className="my-8" />
          <div className="grid gap-4 md:grid-cols-3" style={{ fontFamily: "system-ui, sans-serif" }}>
            {(DEMO.transportation.length
              ? DEMO.transportation
              : [{ title: "הגעה", description: "פרטי הגעה יתעדכנו לקראת האירוע" }]
            ).map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-[#E8788A]/25 bg-white/90 p-5 shadow-[0_10px_30px_rgba(232,120,138,0.08)]"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-[#9A6070]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="rsvp" className="py-20">
        <div className="mx-auto max-w-md px-6">
          <h2 className="text-center text-4xl font-light">אישור הגעה</h2>
          <p className="mt-2 text-center text-[#9A6070]">נשמח לדעת אם תגיעו</p>
          <div
            className="mt-8 rounded-[32px] border border-[#E8788A]/30 bg-white/90 p-7 shadow-[0_18px_50px_rgba(232,120,138,0.12)]"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {rsvp.sent ? (
              <p className="text-center text-lg text-[#E8788A]">תודה! קיבלנו את אישור ההגעה.</p>
            ) : (
              <div className="space-y-4">
                {rsvp.guestName ? (
                  <p className="text-center text-sm text-[#9A6070]">שלום {rsvp.guestName}</p>
                ) : null}
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => rsvp.setRsvp(v)}
                      className={`flex-1 rounded-full py-3 text-sm font-bold ${
                        rsvp.rsvp === v
                          ? "bg-[#E8788A] text-white"
                          : "border border-[#E8788A]/40 text-[#9A6070]"
                      }`}
                    >
                      {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                    </button>
                  ))}
                </div>
                {rsvp.rsvp === "yes" ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-sm text-[#9A6070]">מספר אורחים</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={rsvp.count}
                      onChange={(e) => rsvp.setCount(Number(e.target.value))}
                      className="w-20 rounded-full border border-[#E8788A]/40 px-3 py-2 text-center"
                    />
                  </div>
                ) : null}
                {rsvp.error ? (
                  <p className="text-center text-sm font-bold text-red-600">{rsvp.error}</p>
                ) : null}
                <button
                  type="button"
                  disabled={!rsvp.rsvp || rsvp.saving}
                  onClick={() => void rsvp.submit()}
                  className="w-full rounded-full bg-[#E8788A] py-3.5 text-sm font-bold text-white disabled:opacity-40"
                >
                  {rsvp.saving ? "שולח..." : "שליחה"}
                </button>
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section id="gifts" className="bg-[#FFE8EE]/50 py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="text-4xl font-light">מתנות</h2>
          <p className="mt-4 text-[#9A6070]">
            {DEMO.giftsNote || "הנוכחות שלכם היא המתנה הגדולה מכולן."}
          </p>
          {DEMO.giftLinks?.creditUrl ? (
            <a
              href={DEMO.giftLinks.creditUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex rounded-full border border-[#E8788A] px-7 py-3 text-sm font-bold text-[#E8788A]"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              מתנה דיגיטלית
            </a>
          ) : null}
        </div>
      </Section>

      <Section id="faq" className="py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center text-4xl font-light">שאלות נפוצות</h2>
          <div className="mt-8 space-y-3" style={{ fontFamily: "system-ui, sans-serif" }}>
            {(DEMO.faq.length
              ? DEMO.faq
              : [{ question: "איך מאשרים הגעה?", answer: "דרך טופס אישור ההגעה בעמוד זה." }]
            ).map((item, i) => (
              <button
                key={item.question}
                type="button"
                onClick={() => faq.toggle(i)}
                className="w-full rounded-[24px] border border-[#E8788A]/25 bg-white/90 px-5 py-4 text-right shadow-[0_8px_24px_rgba(232,120,138,0.08)]"
              >
                <p className="font-semibold">{item.question}</p>
                {faq.open === i ? <p className="mt-2 text-sm text-[#9A6070]">{item.answer}</p> : null}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <footer id="footer" className="bg-gradient-to-b from-[#E8788A] to-[#D4657A] px-6 py-16 text-center text-white">
        <p className="text-3xl font-light">{DEMO.coupleNames}</p>
        <p className="mt-3 text-white/85">{DEMO.footerNote || "נתראה בחגיגה"}</p>
        <p className="mt-6 text-xs tracking-[0.25em] text-white/50">
          {formatHebrewDate(DEMO.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
