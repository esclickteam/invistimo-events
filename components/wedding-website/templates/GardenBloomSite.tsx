"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent } from "../shared/WeddingSiteContext";
import WeddingSmartNav from "../shared/WeddingSmartNav";
import {
  useFaqAccordion,
  useWeddingRsvp,
} from "../shared/useWeddingInteractions";
import FloatingPetals from "../illustrations/FloatingPetals";
import ShuttleRide from "../illustrations/ShuttleRide";
import MapPinPulse from "../illustrations/MapPinPulse";

const NAV = {
  bg: "rgba(244,250,244,0.94)",
  text: "#2F4A36",
  muted: "#6B8F74",
  accent: "#6B9E78",
  border: "rgba(107,158,120,0.28)",
  fontDisplay: "'Libre Baskerville', serif",
};

const GREEN = "#6B9E78";

const fade = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" as const },
  transition: { duration: 0.7, ease: "easeOut" as const },
};

function Leaf() {
  return (
    <div className="mx-auto my-5 flex items-center justify-center gap-2">
      <span className="h-px w-10 bg-[#6B9E78]/50" />
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M9 2C6 5 4 8 4 11a5 5 0 0 0 10 0c0-3-2-6-5-9Z" fill="#6B9E78" fillOpacity="0.55" />
      </svg>
      <span className="h-px w-10 bg-[#6B9E78]/50" />
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
  return (
    <motion.section id={id} {...fade} className={`scroll-mt-24 overflow-x-clip ${className}`}>
      {children}
    </motion.section>
  );
}

export default function GardenBloomSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const DEMO = useWeddingContent();
  const rsvp = useWeddingRsvp();
  const faq = useFaqAccordion(0);
  const images = DEMO.galleryUrls?.length ? DEMO.galleryUrls : template.galleryImages;

  return (
    <div className="wedding-website-root overflow-x-clip bg-[#F4FAF4] text-[#2F4A36]" dir="rtl">
      {!embed && <WeddingSmartNav theme={NAV} hideDemoLink={hideDemoBadge} />}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed bottom-4 left-4 z-[55] rounded-full border border-[#6B9E78]/40 bg-white/90 px-4 py-2 text-xs font-bold text-[#6B9E78] shadow-lg"
        >
          ← תבניות
        </Link>
      )}

      {/* HERO — soft portrait + petals */}
      <section id="hero" className="relative flex min-h-[100svh] items-end justify-center overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${DEMO.heroImageUrl || template.heroImage})` }}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 14, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F4FAF4] via-[#F4FAF4]/55 to-[#2F4A36]/25" />
        <FloatingPetals color={GREEN} count={12} />
        <div className="relative z-10 w-full px-6 pb-20 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#6B9E78]">Garden Bloom</p>
          <h1 className="mt-4 font-['Libre_Baskerville'] text-[clamp(2.6rem,8vw,5.2rem)] font-normal leading-tight text-[#2F4A36]">
            {DEMO.coupleNames}
          </h1>
          <Leaf />
          <p className="mx-auto max-w-lg text-base text-[#4A6B52] md:text-lg">{DEMO.heroSubtitle}</p>
          <p className="mt-4 font-['Libre_Baskerville'] text-lg text-[#6B9E78]">
            {formatHebrewDate(DEMO.weddingDate)}
            {DEMO.weddingTime ? ` · ${DEMO.weddingTime}` : ""}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a href="#rsvp" className="rounded-full bg-[#6B9E78] px-8 py-3.5 text-sm font-bold text-white shadow-[0_14px_36px_rgba(107,158,120,0.3)]">
              אישור הגעה
            </a>
            <a href="#our-story" className="rounded-full border border-[#6B9E78] bg-white/70 px-8 py-3.5 text-sm font-bold text-[#6B9E78] backdrop-blur-sm">
              הסיפור שלנו
            </a>
          </div>
        </div>
      </section>

      <Section id="our-story" className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-['Libre_Baskerville'] text-4xl">הסיפור שלנו</h2>
          <Leaf />
          <div className="space-y-5 text-base leading-relaxed text-[#4A6B52]">
            {(DEMO.storyParagraphs.length
              ? DEMO.storyParagraphs
              : ["אנחנו שמחים לחלוק איתכם את היום המיוחד שלנו."]
            ).map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </Section>

      <Section id="how-we-met" className="bg-[#E8F3EA] py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-['Libre_Baskerville'] text-4xl">איך נפגשנו</h2>
          <Leaf />
          <div className="rounded-[2rem] border border-[#6B9E78]/25 bg-white/80 px-8 py-10 shadow-[0_18px_50px_rgba(47,74,54,0.06)]">
            <p className="text-base leading-[1.9] text-[#4A6B52]">
              {DEMO.howWeMet || "סיפור המפגש שלנו יתעדכן בקרוב."}
            </p>
          </div>
        </div>
      </Section>

      <Section id="gallery" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">רגעים מהגן</h2>
          <Leaf />
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {images.slice(0, 6).map((src, i) => (
              <motion.figure
                key={src}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="overflow-hidden rounded-[1.75rem] border border-[#6B9E78]/20 bg-white p-2 shadow-[0_16px_40px_rgba(47,74,54,0.07)]"
              >
                <img src={src} alt="" className="aspect-[4/5] w-full rounded-[1.4rem] object-cover" />
              </motion.figure>
            ))}
          </div>
        </div>
      </Section>

      <Section id="schedule" className="bg-[#E8F3EA] py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">לוח זמנים</h2>
          <Leaf />
          <ol className="space-y-3">
            {(DEMO.schedule.length
              ? DEMO.schedule
              : [{ time: DEMO.weddingTime || "19:30", title: "תחילת האירוע", description: "" }]
            ).map((item) => (
              <li
                key={`${item.time}-${item.title}`}
                className="flex items-start gap-4 rounded-3xl border border-[#6B9E78]/20 bg-white px-5 py-4"
              >
                <span className="shrink-0 rounded-full bg-[#6B9E78]/15 px-3 py-1 text-sm font-bold text-[#6B9E78]">
                  {item.time}
                </span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  {item.description ? <p className="mt-1 text-sm text-[#4A6B52]">{item.description}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section id="location" className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <MapPinPulse accent={GREEN} />
          <h2 className="mt-3 font-['Libre_Baskerville'] text-4xl">{DEMO.venueName || "מיקום"}</h2>
          <p className="mt-2 text-[#4A6B52]">{DEMO.venueAddress}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {DEMO.wazeUrl ? (
              <a href={DEMO.wazeUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[#6B9E78] px-6 py-3 text-sm font-bold text-white">
                Waze
              </a>
            ) : null}
            {DEMO.mapsUrl ? (
              <a href={DEMO.mapsUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#6B9E78] px-6 py-3 text-sm font-bold text-[#6B9E78]">
                Google Maps
              </a>
            ) : null}
          </div>
          {DEMO.venueAddress ? (
            <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#6B9E78]/25">
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

      <Section id="transportation" className="bg-[#E8F3EA] py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">הגעה והסעות</h2>
          <Leaf />
          <ShuttleRide accent={GREEN} className="mb-8" />
          <div className="grid gap-4 md:grid-cols-3">
            {(DEMO.transportation.length
              ? DEMO.transportation
              : [{ title: "הגעה", description: "פרטי הגעה יתעדכנו לקראת האירוע" }]
            ).map((item) => (
              <div key={item.title} className="rounded-3xl border border-[#6B9E78]/20 bg-white p-5">
                <h3 className="font-['Libre_Baskerville'] text-xl">{item.title}</h3>
                <p className="mt-2 text-sm text-[#4A6B52]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="dress-code" className="py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="font-['Libre_Baskerville'] text-4xl">קוד לבוש</h2>
          <Leaf />
          <div className="rounded-[2rem] border border-[#6B9E78]/25 bg-[#E8F3EA] px-8 py-10">
            <p className="text-base leading-relaxed text-[#4A6B52]">
              {DEMO.dressCode || "חגיגי ועדין — גוונים ירוקים, שמנת וזהב רך."}
            </p>
          </div>
        </div>
      </Section>

      <Section id="rsvp" className="bg-[#E8F3EA] py-20">
        <div className="mx-auto max-w-md px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">אישור הגעה</h2>
          <Leaf />
          {rsvp.sent ? (
            <p className="text-center text-lg text-[#6B9E78]">תודה! קיבלנו את אישור ההגעה.</p>
          ) : (
            <div className="space-y-4 rounded-[2rem] border border-[#6B9E78]/25 bg-white p-7 shadow-[0_18px_50px_rgba(47,74,54,0.06)]">
              {rsvp.guestName ? (
                <p className="text-center text-sm text-[#4A6B52]">שלום {rsvp.guestName}</p>
              ) : null}
              <div className="flex gap-3">
                {(["yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => rsvp.setRsvp(v)}
                    className={`flex-1 rounded-full py-3 text-sm font-bold ${
                      rsvp.rsvp === v ? "bg-[#6B9E78] text-white" : "border border-[#6B9E78]/40 text-[#4A6B52]"
                    }`}
                  >
                    {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                  </button>
                ))}
              </div>
              {rsvp.rsvp === "yes" ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-[#4A6B52]">מספר אורחים</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={rsvp.count}
                    onChange={(e) => rsvp.setCount(Number(e.target.value))}
                    className="w-20 rounded-full border border-[#6B9E78]/40 px-3 py-2 text-center"
                  />
                </div>
              ) : null}
              {rsvp.error ? <p className="text-center text-sm font-bold text-red-600">{rsvp.error}</p> : null}
              <button
                type="button"
                disabled={!rsvp.rsvp || rsvp.saving}
                onClick={() => void rsvp.submit()}
                className="w-full rounded-full bg-[#6B9E78] py-3.5 text-sm font-bold text-white disabled:opacity-40"
              >
                {rsvp.saving ? "שולח..." : "שליחה"}
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section id="faq" className="py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center font-['Libre_Baskerville'] text-4xl">שאלות נפוצות</h2>
          <Leaf />
          <div className="space-y-3">
            {(DEMO.faq.length
              ? DEMO.faq
              : [{ question: "איך מאשרים הגעה?", answer: "דרך טופס אישור ההגעה בעמוד זה." }]
            ).map((item, i) => (
              <button
                key={item.question}
                type="button"
                onClick={() => faq.toggle(i)}
                className="w-full rounded-3xl border border-[#6B9E78]/25 bg-white px-5 py-4 text-right"
              >
                <p className="font-semibold">{item.question}</p>
                {faq.open === i ? <p className="mt-2 text-sm text-[#4A6B52]">{item.answer}</p> : null}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section id="gifts" className="bg-[#E8F3EA] py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="font-['Libre_Baskerville'] text-4xl">מתנות</h2>
          <Leaf />
          <p className="text-[#4A6B52]">{DEMO.giftsNote || "הנוכחות שלכם היא המתנה הגדולה מכולן."}</p>
          {DEMO.giftLinks?.creditUrl ? (
            <a
              href={DEMO.giftLinks.creditUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex rounded-full border border-[#6B9E78] px-7 py-3 text-sm font-bold text-[#6B9E78]"
            >
              מתנה דיגיטלית
            </a>
          ) : null}
        </div>
      </Section>

      <footer id="footer" className="bg-[#2F4A36] px-6 py-16 text-center text-[#F4FAF4]">
        <p className="font-['Libre_Baskerville'] text-3xl">{DEMO.coupleNames}</p>
        <Leaf />
        <p className="text-[#B8D4BE]">{DEMO.footerNote || "נתראה בגן"}</p>
        <p className="mt-6 text-xs tracking-[0.25em] text-white/35">
          {formatHebrewDate(DEMO.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
