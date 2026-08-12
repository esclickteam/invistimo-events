"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { WeddingTemplate } from "@/types/weddingWebsite";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate, VIDEOS } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides, useWeddingSite, isSectionEnabled } from "../shared/WeddingSiteContext";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import { SafeImage, SafeVideo } from "../shared/SafeMedia";
import WeddingActionBar from "../shared/WeddingActionBar";
import AnimatedCountdown from "../shared/AnimatedCountdown";
import {
  useCountdownTimer,
  useFaqAccordion,
  useWeddingRsvp,
} from "../shared/useWeddingInteractions";
import GoldScrollLine from "../illustrations/GoldScrollLine";
import ShuttleRide from "../illustrations/ShuttleRide";
import MapPinPulse from "../illustrations/MapPinPulse";
import ScrollRoute from "../illustrations/ScrollRoute";


const fade = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" as const },
  transition: { duration: 0.7, ease: "easeOut" as const },
};

function Divider() {
  return (
    <div className="mx-auto my-6 flex max-w-[220px] items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A962] to-[#E8D5A8]" />
      <span className="h-2.5 w-2.5 rotate-45 border border-[#C9A962]" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C9A962] to-[#E8D5A8]" />
    </div>
  );
}

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

export default function EternalGoldSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const DEMO = useWeddingContent();
  const themeOverrides = useWeddingThemeOverrides();
  const time = useCountdownTimer(DEMO.weddingDate, DEMO.weddingTime);
  const rsvp = useWeddingRsvp();
  const faq = useFaqAccordion(0);
  const images = sanitizeGallery(DEMO.galleryUrls?.length ? DEMO.galleryUrls : template.galleryImages, template.galleryImages);

  return (
    <div className="wedding-website-root overflow-x-clip bg-[#FAF7F2] text-[#2A2118]" data-style-preset={themeOverrides.stylePreset || ""} style={{ backgroundColor: "var(--ww-bg)", color: "var(--ww-text)", fontFamily: "var(--ww-font-body)", ["--ww-heading-scale" as any]: themeOverrides.headingScale || 1 }}>
      {!embed && (
        <WeddingActionBar
          accent="#C9A962"
          text="#2A2118"
          surface="rgba(250,247,242,0.94)"
          border="rgba(201,169,98,0.35)"
        />
      )}
      {!embed && <GoldScrollLine />}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] rounded-full border border-[#C9A962]/40 bg-white/90 px-4 py-2 text-xs font-bold shadow-lg"
        >
          ← תבניות
        </Link>
      )}

      {/* HERO — classic full-bleed */}
      <section id="hero" className="relative flex min-h-[100svh] items-end justify-center overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${DEMO.heroImageUrl || template.heroImage})` }}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 16, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2A2118]/90 via-[#2A2118]/35 to-transparent" />
        <div className="relative z-10 w-full px-6 pb-20 text-center text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.45em] text-[#E8D5A8]">Save the Date</p>
          <h1 className="mt-4 font-['Cormorant_Garamond'] text-[clamp(3rem,10vw,6.5rem)] font-light leading-none">
            {DEMO.coupleNames}
          </h1>
          <Divider />
          <p className="mx-auto max-w-xl text-base text-white/85 md:text-lg">{DEMO.heroSubtitle}</p>
          <p className="mt-4 font-['Cormorant_Garamond'] text-xl text-[#E8D5A8]">
            {formatHebrewDate(DEMO.weddingDate)}
            {DEMO.weddingTime ? ` · ${DEMO.weddingTime}` : ""}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href="#rsvp" className="rounded-full bg-[#C9A962] px-8 py-3.5 text-sm font-bold text-white shadow-[0_16px_40px_rgba(201,169,98,0.35)]">
              אישור הגעה
            </a>
            <a href="#transportation" className="rounded-full border border-white/45 bg-white/10 px-8 py-3.5 text-sm font-bold backdrop-blur-sm">
              הזמנת הסעה
            </a>
          </div>
        </div>
      </section>

      <Section id="countdown" className="bg-[#F3EBE0] py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-['Cormorant_Garamond'] text-4xl font-light">הספירה לאחור</h2>
          <Divider />
          <AnimatedCountdown time={time} accent="#C9A962" variant="cards" />
        </div>
      </Section>

      <Section id="invitation" className="py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-['Cormorant_Garamond'] text-4xl font-light">הזמנה</h2>
          <Divider />
          <p className="text-lg leading-[2] text-[#8A7560]">
            {DEMO.invitationText || DEMO.heroSubtitle}
          </p>
        </div>
      </Section>

      <Section id="our-story" className="bg-[#F3EBE0] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-['Cormorant_Garamond'] text-4xl font-light">הסיפור שלנו</h2>
          <Divider />
          <div className="space-y-5 text-base leading-relaxed text-[#8A7560] md:text-lg">
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
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">רגעים</h2>
          <Divider />
          <div className="ww-gallery-grid">
            {images.slice(0, 6).map((src, i) => (
              <motion.figure
                key={src}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="border border-[#C9A962]/35 bg-white p-1.5 shadow-[0_18px_50px_rgba(92,65,35,0.08)]"
              >
                <SafeImage src={src} alt="" className="h-full w-full object-cover" />
              </motion.figure>
            ))}
          </div>
        </div>
      </Section>

      <Section id="schedule" className="bg-[#F3EBE0] py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">לוח זמנים</h2>
          <Divider />
          <ol className="space-y-4">
            {(DEMO.schedule.length
              ? DEMO.schedule
              : [{ time: DEMO.weddingTime || "19:30", title: "תחילת האירוע", description: "" }]
            ).map((item) => (
              <li
                key={`${item.time}-${item.title}`}
                className="grid grid-cols-[88px_1fr] gap-4 border border-[#C9A962]/30 bg-white px-5 py-4"
              >
                <span className="font-['Cormorant_Garamond'] text-xl text-[#C9A962]">{item.time}</span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  {item.description ? <p className="mt-1 text-sm text-[#8A7560]">{item.description}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section id="location" className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <ScrollRoute accent="#C9A962" />
          <MapPinPulse accent="#C9A962" />
          <h2 className="mt-3 font-['Cormorant_Garamond'] text-4xl font-light">
            {DEMO.venueName || "מיקום"}
          </h2>
          <p className="mt-2 text-[#8A7560]">{DEMO.venueAddress}</p>
          <Divider />
          <div className="mb-6 flex flex-wrap justify-center gap-3">
            {DEMO.wazeUrl ? (
              <a href={DEMO.wazeUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[#C9A962] px-6 py-3 text-sm font-bold text-white">
                Waze
              </a>
            ) : null}
            {DEMO.mapsUrl ? (
              <a href={DEMO.mapsUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#C9A962] px-6 py-3 text-sm font-bold text-[#C9A962]">
                Google Maps
              </a>
            ) : null}
          </div>
          {DEMO.venueAddress ? (
            <div className="overflow-hidden border-2 border-[#C9A962]/35">
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

      <Section id="transportation" className="bg-[#F3EBE0] py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">הגעה והסעות</h2>
          <Divider />
          <ShuttleRide accent="#C9A962" className="mb-8" />
          <div className="grid gap-4 md:grid-cols-3">
            {(DEMO.transportation.length
              ? DEMO.transportation
              : [{ title: "הגעה", description: "פרטי הגעה יתעדכנו לקראת האירוע" }]
            ).map((item) => (
              <div key={item.title} className="border border-[#C9A962]/30 bg-white p-5">
                <h3 className="font-['Cormorant_Garamond'] text-xl">{item.title}</h3>
                <p className="mt-2 text-sm text-[#8A7560]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="rsvp" className="py-20">
        <div className="mx-auto max-w-md px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">אישור הגעה</h2>
          <Divider />
          {rsvp.sent ? (
            <p className="text-center text-lg text-[#C9A962]">תודה! קיבלנו את אישור ההגעה.</p>
          ) : (
            <div className="space-y-4 border border-[#C9A962]/35 bg-white p-7">
              {rsvp.guestName ? <p className="text-center text-sm text-[#8A7560]">שלום {rsvp.guestName}</p> : null}
              <div className="flex gap-3">
                {(["yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => rsvp.setRsvp(v)}
                    className={`flex-1 rounded-full py-3 text-sm font-bold ${
                      rsvp.rsvp === v ? "bg-[#C9A962] text-white" : "border border-[#C9A962]/40 text-[#8A7560]"
                    }`}
                  >
                    {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                  </button>
                ))}
              </div>
              {rsvp.rsvp === "yes" ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-[#8A7560]">מספר אורחים</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={rsvp.count}
                    onChange={(e) => rsvp.setCount(Number(e.target.value))}
                    className="w-20 rounded-full border border-[#C9A962]/40 px-3 py-2 text-center"
                  />
                </div>
              ) : null}
              {rsvp.error ? <p className="text-center text-sm font-bold text-red-600">{rsvp.error}</p> : null}
              <button
                type="button"
                disabled={!rsvp.rsvp || rsvp.saving}
                onClick={() => void rsvp.submit()}
                className="w-full rounded-full bg-[#C9A962] py-3.5 text-sm font-bold text-white disabled:opacity-40"
              >
                {rsvp.saving ? "שולח..." : "שליחה"}
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section id="faq" className="bg-[#F3EBE0] py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">שאלות נפוצות</h2>
          <Divider />
          <div className="space-y-3">
            {(DEMO.faq.length
              ? DEMO.faq
              : [{ question: "איך מאשרים הגעה?", answer: "דרך טופס אישור ההגעה בעמוד זה." }]
            ).map((item, i) => (
              <button
                key={item.question}
                type="button"
                onClick={() => faq.toggle(i)}
                className="w-full border border-[#C9A962]/30 bg-white px-5 py-4 text-right"
              >
                <p className="font-semibold">{item.question}</p>
                {faq.open === i ? <p className="mt-2 text-sm text-[#8A7560]">{item.answer}</p> : null}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section id="gifts" className="py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="font-['Cormorant_Garamond'] text-4xl font-light">מתנות</h2>
          <Divider />
          <p className="text-[#8A7560]">
            {DEMO.giftsNote || "הנוכחות שלכם היא המתנה הגדולה מכולן."}
          </p>
          {DEMO.giftLinks?.creditUrl ? (
            <a
              href={DEMO.giftLinks.creditUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex rounded-full border border-[#C9A962] px-7 py-3 text-sm font-bold text-[#C9A962]"
            >
              מתנה דיגיטלית
            </a>
          ) : null}
        </div>
      </Section>

      <Section id="video" className="bg-[#F3EBE0] py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="overflow-hidden border border-[#C9A962]/35 bg-black">
            <SafeVideo
              src={DEMO.videoUrl || VIDEOS.romantic}
              poster={DEMO.heroImageUrl || template.heroImage}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full object-cover"
            />
          </div>
        </div>
      </Section>

      <footer id="footer" className="bg-[#2A2118] px-6 py-16 text-center text-white">
        <p className="font-['Cormorant_Garamond'] text-3xl font-light">{DEMO.coupleNames}</p>
        <Divider />
        <p className="text-[#E8D5A8]">{DEMO.footerNote || "נתראה בחגיגה"}</p>
        <p className="mt-6 text-xs tracking-[0.25em] text-white/35">
          {formatHebrewDate(DEMO.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
