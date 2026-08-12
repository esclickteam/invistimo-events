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
import {
  useFaqAccordion,
  useWeddingRsvp,
} from "../shared/useWeddingInteractions";
import WatercolorReveal from "../illustrations/WatercolorReveal";
import ShuttleRide from "../illustrations/ShuttleRide";
import MapPinPulse from "../illustrations/MapPinPulse";
import ScrollRoute from "../illustrations/ScrollRoute";


const ROSE = "#C4705A";

const fade = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" as const },
  transition: { duration: 0.7, ease: "easeOut" as const },
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

export default function DesertRoseSite({ template, embed, hideDemoBadge }: TemplateProps) {
  const DEMO = useWeddingContent();
  const themeOverrides = useWeddingThemeOverrides();
  const rsvp = useWeddingRsvp();
  const faq = useFaqAccordion(0);
  const images = sanitizeGallery(DEMO.galleryUrls?.length ? DEMO.galleryUrls : template.galleryImages, template.galleryImages);

  return (
    <div className="wedding-website-root overflow-x-clip " data-style-preset={themeOverrides.stylePreset || ""} style={{ backgroundColor: "var(--ww-bg)", color: "var(--ww-text)", fontFamily: "var(--ww-font-body)", ["--ww-heading-scale" as any]: themeOverrides.headingScale || 1 }} dir="rtl">
      {!embed && (
        <WeddingActionBar
          accent="#C4705A"
          text="#FFFFFF"
          surface="rgba(251,245,240,0.94)"
          border="rgba(196,112,90,0.35)"
        />
      )}
      {!embed && !hideDemoBadge && (
        <Link
          href="/wedding-website"
          className="fixed top-4 left-4 z-[55] px-4 py-2 text-xs font-bold text-[#C4705A] shadow-lg"
          style={{
            background: "rgba(251,245,240,0.95)",
            clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0 100%)",
            border: "1px solid rgba(196,112,90,0.35)",
          }}
        >
          ← תבניות
        </Link>
      )}

      {/* HERO — diagonal clip-path image */}
      <section id="hero" className="relative min-h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${DEMO.heroImageUrl || template.heroImage})`,
            clipPath: "polygon(0 0, 100% 0, 100% 78%, 0 100%)",
          }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-l from-[#FBF5F0]/95 via-[#FBF5F0]/55 to-transparent"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 78%, 0 100%)" }}
        />
        <div className="relative z-10 flex min-h-[100svh] items-center px-6 py-24 md:px-12">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#C4705A]">Desert Rose</p>
            <h1 className="mt-4 font-['Cormorant_Garamond'] text-[clamp(3rem,9vw,5.8rem)] font-light leading-[0.95]">
              {DEMO.coupleNames}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#9A6B5C] md:text-lg">
              {DEMO.heroSubtitle}
            </p>
            <p className="mt-4 font-['Cormorant_Garamond'] text-xl text-[#C4705A]">
              {formatHebrewDate(DEMO.weddingDate)}
              {DEMO.weddingTime ? ` · ${DEMO.weddingTime}` : ""}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="#rsvp"
                className="bg-[#C4705A] px-8 py-3.5 text-sm font-bold text-white"
                style={{ clipPath: "polygon(6% 0, 100% 0, 94% 100%, 0 100%)" }}
              >
                אישור הגעה
              </a>
              <a
                href="#transportation"
                className="border border-[#C4705A] px-8 py-3.5 text-sm font-bold text-[#C4705A]"
                style={{ clipPath: "polygon(6% 0, 100% 0, 94% 100%, 0 100%)" }}
              >
                הזמנת הסעה
              </a>
            </div>
          </div>
        </div>
      </section>

      <Section id="invitation" className="py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-['Cormorant_Garamond'] text-4xl font-light">הזמנה</h2>
          <div
            className="mx-auto my-6 h-1 w-16 bg-[#C4705A]"
            style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)" }}
          />
          <p className="text-lg leading-[2] text-[#9A6B5C]">
            {DEMO.invitationText || DEMO.heroSubtitle}
          </p>
        </div>
      </Section>

      <Section id="our-story" className="bg-[#F3E8E0] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-['Cormorant_Garamond'] text-4xl font-light">הסיפור שלנו</h2>
          <div
            className="mx-auto my-6 h-1 w-16 bg-[#C4705A]"
            style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)" }}
          />
          <WatercolorReveal className="rounded-sm">
            <div className="space-y-5 bg-[#FBF5F0]/80 px-6 py-10 text-base leading-relaxed text-[#9A6B5C] md:text-lg">
              {(DEMO.storyParagraphs.length
                ? DEMO.storyParagraphs
                : ["אנחנו שמחים לחלוק איתכם את היום המיוחד שלנו."]
              ).map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>
          </WatercolorReveal>
        </div>
      </Section>

      <Section id="gallery" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">גלריה</h2>
          <div
            className="mx-auto my-6 h-1 w-16 bg-[#C4705A]"
            style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)" }}
          />
          <WatercolorReveal>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {images.slice(0, 6).map((src, i) => (
                <figure
                  key={src}
                  className="overflow-hidden"
                  style={{
                    clipPath:
                      i % 2 === 0
                        ? "polygon(0 0, 100% 4%, 96% 100%, 0 96%)"
                        : "polygon(4% 0, 100% 0, 100% 96%, 0 100%)",
                  }}
                >
                  <SafeImage src={src} alt="" className="aspect-[4/5] w-full object-cover" />
                </figure>
              ))}
            </div>
          </WatercolorReveal>
        </div>
      </Section>

      <Section id="schedule" className="bg-[#F3E8E0] py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">לוח זמנים</h2>
          <div
            className="mx-auto my-6 h-1 w-16 bg-[#C4705A]"
            style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)" }}
          />
          <ol className="space-y-3">
            {(DEMO.schedule.length
              ? DEMO.schedule
              : [{ time: DEMO.weddingTime || "19:30", title: "תחילת האירוע", description: "" }]
            ).map((item) => (
              <li
                key={`${item.time}-${item.title}`}
                className="grid grid-cols-[88px_1fr] gap-4 bg-[#FBF5F0] px-5 py-4"
                style={{ clipPath: "polygon(2% 0, 100% 0, 98% 100%, 0 100%)" }}
              >
                <span className="font-['Cormorant_Garamond'] text-xl text-[#C4705A]">{item.time}</span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  {item.description ? <p className="mt-1 text-sm text-[#9A6B5C]">{item.description}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section id="location" className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <ScrollRoute accent="#C4705A" />
          <MapPinPulse accent={ROSE} />
          <h2 className="mt-3 font-['Cormorant_Garamond'] text-4xl font-light">
            {DEMO.venueName || "מיקום"}
          </h2>
          <p className="mt-2 text-[#9A6B5C]">{DEMO.venueAddress}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {DEMO.wazeUrl ? (
              <a
                href={DEMO.wazeUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-[#C4705A] px-6 py-3 text-sm font-bold text-white"
                style={{ clipPath: "polygon(6% 0, 100% 0, 94% 100%, 0 100%)" }}
              >
                Waze
              </a>
            ) : null}
            {DEMO.mapsUrl ? (
              <a
                href={DEMO.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="border border-[#C4705A] px-6 py-3 text-sm font-bold text-[#C4705A]"
                style={{ clipPath: "polygon(6% 0, 100% 0, 94% 100%, 0 100%)" }}
              >
                Google Maps
              </a>
            ) : null}
          </div>
          {DEMO.venueAddress ? (
            <div
              className="mt-8 overflow-hidden"
              style={{ clipPath: "polygon(0 0, 100% 3%, 97% 100%, 0 97%)" }}
            >
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

      <Section id="transportation" className="bg-[#F3E8E0] py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">הגעה והסעות</h2>
          <div
            className="mx-auto my-6 h-1 w-16 bg-[#C4705A]"
            style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)" }}
          />
          <ShuttleRide accent={ROSE} className="mb-8" />
          <div className="grid gap-4 md:grid-cols-3">
            {(DEMO.transportation.length
              ? DEMO.transportation
              : [{ title: "הגעה", description: "פרטי הגעה יתעדכנו לקראת האירוע" }]
            ).map((item) => (
              <div
                key={item.title}
                className="bg-[#FBF5F0] p-5"
                style={{ clipPath: "polygon(3% 0, 100% 0, 97% 100%, 0 100%)" }}
              >
                <h3 className="font-['Cormorant_Garamond'] text-xl">{item.title}</h3>
                <p className="mt-2 text-sm text-[#9A6B5C]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="rsvp" className="py-20">
        <div className="mx-auto max-w-md px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">אישור הגעה</h2>
          <div
            className="mx-auto my-6 h-1 w-16 bg-[#C4705A]"
            style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)" }}
          />
          {rsvp.sent ? (
            <p className="text-center text-lg text-[#C4705A]">תודה! קיבלנו את אישור ההגעה.</p>
          ) : (
            <div
              className="space-y-4 bg-white p-7 shadow-[0_18px_50px_rgba(74,46,40,0.08)]"
              style={{ clipPath: "polygon(3% 0, 100% 0, 97% 100%, 0 100%)" }}
            >
              {rsvp.guestName ? (
                <p className="text-center text-sm text-[#9A6B5C]">שלום {rsvp.guestName}</p>
              ) : null}
              <div className="flex gap-3">
                {(["yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => rsvp.setRsvp(v)}
                    className={`flex-1 py-3 text-sm font-bold ${
                      rsvp.rsvp === v
                        ? "bg-[#C4705A] text-white"
                        : "border border-[#C4705A]/40 text-[#9A6B5C]"
                    }`}
                    style={{ clipPath: "polygon(6% 0, 100% 0, 94% 100%, 0 100%)" }}
                  >
                    {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                  </button>
                ))}
              </div>
              {rsvp.rsvp === "yes" ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-[#9A6B5C]">מספר אורחים</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={rsvp.count}
                    onChange={(e) => rsvp.setCount(Number(e.target.value))}
                    className="w-20 border border-[#C4705A]/40 px-3 py-2 text-center"
                  />
                </div>
              ) : null}
              {rsvp.error ? <p className="text-center text-sm font-bold text-red-600">{rsvp.error}</p> : null}
              <button
                type="button"
                disabled={!rsvp.rsvp || rsvp.saving}
                onClick={() => void rsvp.submit()}
                className="w-full bg-[#C4705A] py-3.5 text-sm font-bold text-white disabled:opacity-40"
                style={{ clipPath: "polygon(4% 0, 100% 0, 96% 100%, 0 100%)" }}
              >
                {rsvp.saving ? "שולח..." : "שליחה"}
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section id="gifts" className="bg-[#F3E8E0] py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="font-['Cormorant_Garamond'] text-4xl font-light">מתנות</h2>
          <div
            className="mx-auto my-6 h-1 w-16 bg-[#C4705A]"
            style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)" }}
          />
          <p className="text-[#9A6B5C]">{DEMO.giftsNote || "הנוכחות שלכם היא המתנה הגדולה מכולן."}</p>
          {DEMO.giftLinks?.creditUrl ? (
            <a
              href={DEMO.giftLinks.creditUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex border border-[#C4705A] px-7 py-3 text-sm font-bold text-[#C4705A]"
              style={{ clipPath: "polygon(6% 0, 100% 0, 94% 100%, 0 100%)" }}
            >
              מתנה דיגיטלית
            </a>
          ) : null}
        </div>
      </Section>

      <Section id="faq" className="py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center font-['Cormorant_Garamond'] text-4xl font-light">שאלות נפוצות</h2>
          <div
            className="mx-auto my-6 h-1 w-16 bg-[#C4705A]"
            style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)" }}
          />
          <div className="space-y-3">
            {(DEMO.faq.length
              ? DEMO.faq
              : [{ question: "איך מאשרים הגעה?", answer: "דרך טופס אישור ההגעה בעמוד זה." }]
            ).map((item, i) => (
              <button
                key={item.question}
                type="button"
                onClick={() => faq.toggle(i)}
                className="w-full bg-white px-5 py-4 text-right shadow-[0_8px_28px_rgba(74,46,40,0.05)]"
                style={{ clipPath: "polygon(2% 0, 100% 0, 98% 100%, 0 100%)" }}
              >
                <p className="font-semibold">{item.question}</p>
                {faq.open === i ? <p className="mt-2 text-sm text-[#9A6B5C]">{item.answer}</p> : null}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <footer id="footer" className="bg-[#4A2E28] px-6 py-16 text-center text-[#FBF5F0]">
        <p className="font-['Cormorant_Garamond'] text-3xl font-light">{DEMO.coupleNames}</p>
        <p className="mt-4 text-[#E8C4B8]">{DEMO.footerNote || "נתראה במדבר הפורח"}</p>
        <p className="mt-6 text-xs tracking-[0.25em] text-white/35">
          {formatHebrewDate(DEMO.weddingDate)}
        </p>
      </footer>
    </div>
  );
}
