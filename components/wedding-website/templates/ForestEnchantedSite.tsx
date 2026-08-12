"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TemplateProps } from "../shared/weddingUtils";
import { formatHebrewDate } from "../shared/weddingUtils";
import { useWeddingContent, useWeddingThemeOverrides, useWeddingSite, isSectionEnabled } from "../shared/WeddingSiteContext";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import { SafeImage, SafeVideo } from "../shared/SafeMedia";
import WeddingActionBar from "../shared/WeddingActionBar";
import { getFlippedCountdownUnits } from "../shared/CountdownUnits";
import { useFaqAccordion, useWeddingRsvp } from "../shared/useWeddingInteractions";
import PathDrawTimeline from "../illustrations/PathDrawTimeline";
import FloatingPetals from "../illustrations/FloatingPetals";
import MapPinPulse from "../illustrations/MapPinPulse";
import ScrollRoute from "../illustrations/ScrollRoute";
import ShuttleRide from "../illustrations/ShuttleRide";

const ACCENT = "#7CB87A";

const fade = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" as const },
  transition: { duration: 0.7, ease: "easeOut" as const },
};

function MossRule() {
  return (
    <div className="mx-auto my-5 flex max-w-[160px] items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#7CB87A] to-transparent" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#7CB87A]" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#7CB87A] to-transparent" />
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

export default function ForestEnchantedSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const DEMO = useWeddingContent();
  const themeOverrides = useWeddingThemeOverrides();
  const rsvp = useWeddingRsvp();
  const faq = useFaqAccordion(0);
  const images = sanitizeGallery(DEMO.galleryUrls?.length ? DEMO.galleryUrls : template.galleryImages, template.galleryImages);
  const schedule = DEMO.schedule.length
    ? DEMO.schedule
    : [{ time: DEMO.weddingTime || "19:30", title: "תחילת האירוע", description: "" }];

  return (
    <div
      dir="rtl"
      className="wedding-website-root relative min-h-screen overflow-x-clip bg-[#0F1810] text-[#E8F0E4]"
      style={{ fontFamily: "'Libre Baskerville', serif" }}
    >
      {!embed && (
        <WeddingActionBar
          accent="#7CB87A"
          text="#0F1810"
          surface="rgba(15,24,16,0.94)"
          border="rgba(124,184,122,0.35)"
        />
      )}
      {!embed && <FloatingPetals color={ACCENT} count={8} />}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] rounded-full border border-[#7CB87A]/40 bg-[#0F1810]/90 px-4 py-2 text-xs font-bold text-[#E8F0E4] shadow-lg"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          ← תבניות
        </Link>
      )}

      {/* HERO — dark forest full-bleed */}
      <section id="hero" className="relative flex min-h-[100svh] items-end justify-center overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${DEMO.heroImageUrl || template.heroImage})` }}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 18, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1810] via-[#0F1810]/55 to-[#0F1810]/25" />
        <div className="relative z-10 w-full px-6 pb-20 text-center">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#7CB87A]"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Under the Trees
          </p>
          <h1 className="mt-4 text-[clamp(2.6rem,8vw,5rem)] font-normal leading-tight">
            {DEMO.coupleNames}
          </h1>
          <MossRule />
          <p className="mx-auto max-w-lg text-base text-[#8AA892] md:text-lg">{DEMO.heroSubtitle}</p>
          <p className="mt-4 text-lg text-[#7CB87A]">
            {formatHebrewDate(DEMO.weddingDate)}
            {DEMO.weddingTime ? ` · ${DEMO.weddingTime}` : ""}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3" style={{ fontFamily: "system-ui, sans-serif" }}>
            <a href="#rsvp" className="rounded-full bg-[#7CB87A] px-8 py-3.5 text-sm font-bold text-[#0F1810]">
              אישור הגעה
            </a>
            <a href="#transportation" className="rounded-full border border-[#7CB87A]/50 px-8 py-3.5 text-sm font-bold text-[#E8F0E4]">
              הזמנת הסעה
            </a>
          </div>
        </div>
      </section>

      <Section id="our-story" className="relative py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-4xl font-normal">הסיפור שלנו</h2>
          <MossRule />
          <div className="space-y-5 text-base leading-relaxed text-[#8AA892] md:text-lg">
            {(DEMO.storyParagraphs.length
              ? DEMO.storyParagraphs
              : ["אנחנו שמחים לחלוק איתכם את היום המיוחד שלנו."]
            ).map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </Section>

      <Section id="schedule" className="relative bg-[#132018] py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center text-4xl font-normal">לוח זמנים</h2>
          <MossRule />
          <p className="mb-10 text-center text-sm text-[#8AA892]">השביל אל החגיגה</p>
          <PathDrawTimeline
            items={schedule}
            accent={ACCENT}
            text="#E8F0E4"
            muted="#8AA892"
          />
        </div>
      </Section>

      <Section id="gallery" className="relative py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-4xl font-normal">רגעים</h2>
          <MossRule />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {images.slice(0, 6).map((src, i) => (
              <motion.figure
                key={src}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="overflow-hidden border border-[#7CB87A]/25"
              >
                <SafeImage src={src} alt="" className="aspect-[4/5] w-full object-cover" />
              </motion.figure>
            ))}
          </div>
        </div>
      </Section>

      <Section id="location" className="relative bg-[#132018] py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <ScrollRoute accent="#7CB87A" />
          <MapPinPulse accent={ACCENT} />
          <h2 className="mt-2 text-4xl font-normal">{DEMO.venueName || "מיקום"}</h2>
          <p className="mt-2 text-[#8AA892]">{DEMO.venueAddress}</p>
          <MossRule />
          <div className="mb-6 flex flex-wrap justify-center gap-3" style={{ fontFamily: "system-ui, sans-serif" }}>
            {DEMO.wazeUrl ? (
              <a href={DEMO.wazeUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[#7CB87A] px-6 py-3 text-sm font-bold text-[#0F1810]">
                Waze
              </a>
            ) : null}
            {DEMO.mapsUrl ? (
              <a href={DEMO.mapsUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#7CB87A] px-6 py-3 text-sm font-bold text-[#7CB87A]">
                Google Maps
              </a>
            ) : null}
          </div>
          {DEMO.venueAddress ? (
            <div className="overflow-hidden border border-[#7CB87A]/30">
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

      <Section id="transportation" className="relative py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-4xl font-normal">הגעה והסעות</h2>
          <MossRule />
          <ShuttleRide accent={ACCENT} className="mb-8" />
          <div className="grid gap-4 md:grid-cols-3" style={{ fontFamily: "system-ui, sans-serif" }}>
            {(DEMO.transportation.length
              ? DEMO.transportation
              : [{ title: "הגעה", description: "פרטי הגעה יתעדכנו לקראת האירוע" }]
            ).map((item) => (
              <div key={item.title} className="border border-[#7CB87A]/25 bg-[#132018] p-5">
                <h3 className="text-lg font-semibold text-[#E8F0E4]">{item.title}</h3>
                <p className="mt-2 text-sm text-[#8AA892]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="rsvp" className="relative bg-[#132018] py-20">
        <div className="mx-auto max-w-md px-6">
          <h2 className="text-center text-4xl font-normal">אישור הגעה</h2>
          <MossRule />
          <div
            className="border border-[#7CB87A]/30 bg-[#0F1810] p-7"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {rsvp.sent ? (
              <p className="text-center text-lg text-[#7CB87A]">תודה! קיבלנו את אישור ההגעה.</p>
            ) : (
              <div className="space-y-4">
                {rsvp.guestName ? (
                  <p className="text-center text-sm text-[#8AA892]">שלום {rsvp.guestName}</p>
                ) : null}
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => rsvp.setRsvp(v)}
                      className={`flex-1 rounded-full py-3 text-sm font-bold ${
                        rsvp.rsvp === v
                          ? "bg-[#7CB87A] text-[#0F1810]"
                          : "border border-[#7CB87A]/40 text-[#8AA892]"
                      }`}
                    >
                      {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                    </button>
                  ))}
                </div>
                {rsvp.rsvp === "yes" ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-sm text-[#8AA892]">מספר אורחים</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={rsvp.count}
                      onChange={(e) => rsvp.setCount(Number(e.target.value))}
                      className="w-20 rounded-full border border-[#7CB87A]/40 bg-transparent px-3 py-2 text-center text-[#E8F0E4]"
                    />
                  </div>
                ) : null}
                {rsvp.error ? (
                  <p className="text-center text-sm font-bold text-red-300">{rsvp.error}</p>
                ) : null}
                <button
                  type="button"
                  disabled={!rsvp.rsvp || rsvp.saving}
                  onClick={() => void rsvp.submit()}
                  className="w-full rounded-full bg-[#7CB87A] py-3.5 text-sm font-bold text-[#0F1810] disabled:opacity-40"
                >
                  {rsvp.saving ? "שולח..." : "שליחה"}
                </button>
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section id="faq" className="relative py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center text-4xl font-normal">שאלות נפוצות</h2>
          <MossRule />
          <div className="space-y-3" style={{ fontFamily: "system-ui, sans-serif" }}>
            {(DEMO.faq.length
              ? DEMO.faq
              : [{ question: "איך מאשרים הגעה?", answer: "דרך טופס אישור ההגעה בעמוד זה." }]
            ).map((item, i) => (
              <button
                key={item.question}
                type="button"
                onClick={() => faq.toggle(i)}
                className="w-full border border-[#7CB87A]/25 bg-[#132018] px-5 py-4 text-right"
              >
                <p className="font-semibold text-[#E8F0E4]">{item.question}</p>
                {faq.open === i ? <p className="mt-2 text-sm text-[#8AA892]">{item.answer}</p> : null}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section id="gifts" className="relative bg-[#132018] py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="text-4xl font-normal">מתנות</h2>
          <MossRule />
          <p className="text-[#8AA892]">
            {DEMO.giftsNote || "הנוכחות שלכם היא המתנה הגדולה מכולן."}
          </p>
          {DEMO.giftLinks?.creditUrl ? (
            <a
              href={DEMO.giftLinks.creditUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex rounded-full border border-[#7CB87A] px-7 py-3 text-sm font-bold text-[#7CB87A]"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              מתנה דיגיטלית
            </a>
          ) : null}
        </div>
      </Section>

      <footer id="footer" className="relative border-t border-[#7CB87A]/20 px-6 py-16 text-center">
        <p className="text-3xl font-normal">{DEMO.coupleNames}</p>
        <MossRule />
        <p className="text-[#7CB87A]">{DEMO.footerNote || "נתראה ביער"}</p>
        <p className="mt-6 text-xs tracking-[0.25em] text-[#8AA892]/60">
          {formatHebrewDate(DEMO.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
