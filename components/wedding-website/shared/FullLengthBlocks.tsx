"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { SafeImage } from "./SafeMedia";
import { useWeddingContent, useWeddingSite, isSectionEnabled } from "./WeddingSiteContext";
import { formatHebrewDate } from "./weddingUtils";
import { useFaqAccordion, useWeddingRsvp, useCountdownTimer } from "./useWeddingInteractions";
import AnimatedCountdown from "./AnimatedCountdown";
import GuestIdentifyRsvp from "./GuestIdentifyRsvp";
import { EditableImage, EditableText } from "../editor/EditablePrimitives";
import HowWeMetPaths from "../illustrations/HowWeMetPaths";
import ProposalKneel from "../illustrations/ProposalKneel";
import ChuppahMeet from "../illustrations/ChuppahMeet";
import BuffetSpread from "../illustrations/BuffetSpread";
import ShuttleRide from "../illustrations/ShuttleRide";
import RsvpCelebrate from "../illustrations/RsvpCelebrate";
import DanceParty from "../illustrations/DanceParty";

export type BlockTone = {
  accent: string;
  muted: string;
  surface?: string;
  border?: string;
  fontDisplay?: string;
  radius?: string;
  buttonClass?: string;
  outlineButtonClass?: string;
};

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" as const },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

export function SiteSection({
  id,
  className = "",
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { sections, edit } = useWeddingSite();
  if (id !== "hero" && !isSectionEnabled(sections, id)) return null;
  const selected =
    edit?.enabled && edit.selected?.kind === "section" && edit.selected.id === id;
  return (
    <motion.section
      id={id}
      {...fade}
      data-ww-section={id}
      className={`scroll-mt-24 overflow-x-clip ${className} ${
        edit?.enabled ? "ww-editable-section" : ""
      } ${selected ? "ww-editable-section-selected" : ""}`}
      onClick={
        edit?.enabled
          ? (e) => {
              // Only select section when clicking empty section chrome, not nested editables
              const target = e.target as HTMLElement;
              if (
                target.closest(
                  "[data-ww-field], [data-ww-image], [data-ww-hero], a, button, input, textarea"
                )
              ) {
                return;
              }
              e.stopPropagation();
              edit.setSelected({ kind: "section", id });
            }
          : undefined
      }
    >
      {edit?.enabled ? (
        <span className="ww-section-edit-badge" aria-hidden>
          סקשן · לחצו לשינוי צבע
        </span>
      ) : null}
      {children}
    </motion.section>
  );
}

export function WelcomeBlock({
  tone,
  title = "ברוכים הבאים",
  className = "",
}: {
  tone: BlockTone;
  title?: string;
  className?: string;
}) {
  const c = useWeddingContent();
  return (
    <SiteSection id="invitation" className={className}>
      <div className="mx-auto max-w-2xl px-6 text-center">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.35em]"
          style={{ color: tone.accent }}
        >
          Welcome
        </p>
        <h2
          className="mt-3 text-4xl font-light md:text-5xl"
          style={{ fontFamily: tone.fontDisplay }}
        >
          {title}
        </h2>
        <EditableText
          field={c.welcomeText ? "welcomeText" : c.invitationText ? "invitationText" : "heroSubtitle"}
          as="p"
          multiline
          className="mx-auto mt-6 max-w-xl text-base leading-[1.9] md:text-lg"
          style={{ color: tone.muted }}
        >
          {c.welcomeText || c.invitationText || c.heroSubtitle}
        </EditableText>
      </div>
    </SiteSection>
  );
}

export function CountdownBlock({
  tone,
  className = "",
  variant = "cards",
}: {
  tone: BlockTone;
  className?: string;
  variant?: "cards" | "inline" | "stacked" | "editorial" | "glow";
}) {
  const c = useWeddingContent();
  const time = useCountdownTimer(c.weddingDate, c.weddingTime);
  const countdownVariant: "cards" | "editorial" | "glow" =
    variant === "inline" || variant === "editorial"
      ? "editorial"
      : variant === "stacked" || variant === "glow"
        ? "glow"
        : "cards";
  return (
    <SiteSection id="countdown" className={className}>
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-4xl font-light md:text-5xl" style={{ fontFamily: tone.fontDisplay }}>
          הספירה לאחור
        </h2>
        <p className="mt-2 text-sm" style={{ color: tone.muted }}>
          {formatHebrewDate(c.weddingDate)}
          {c.weddingTime ? ` · ${c.weddingTime}` : ""}
        </p>
        <div className="mt-8">
          <AnimatedCountdown time={time} accent={tone.accent} variant={countdownVariant} />
        </div>
      </div>
    </SiteSection>
  );
}

export function StoryBlock({
  tone,
  className = "",
  title = "הסיפור שלנו",
}: {
  tone: BlockTone;
  className?: string;
  title?: string;
}) {
  const c = useWeddingContent();
  const paragraphs =
    c.storyParagraphs?.length > 0
      ? c.storyParagraphs
      : ["אנחנו שמחים לחלוק איתכם את היום המיוחד שלנו."];
  return (
    <SiteSection id="our-story" className={className}>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-4xl font-light md:text-5xl" style={{ fontFamily: tone.fontDisplay }}>
          {title}
        </h2>
        <EditableText
          field="storyParagraphs"
          as="div"
          multiline
          className="mt-8 space-y-5 text-base leading-relaxed md:text-lg whitespace-pre-line"
          style={{ color: tone.muted }}
        >
          {paragraphs.join("\n\n")}
        </EditableText>
      </div>
    </SiteSection>
  );
}

export function HowWeMetBlock({
  tone,
  className = "",
  image,
  imageIndex = 0,
}: {
  tone: BlockTone;
  className?: string;
  image?: string;
  imageIndex?: number;
}) {
  const c = useWeddingContent();
  if (!c.howWeMet && !image) return null;
  return (
    <SiteSection id="how-we-met" className={className}>
      <div className="mx-auto max-w-5xl px-6">
        <HowWeMetPaths accent={tone.accent} className="mb-6" />
        <div className="grid items-center gap-8 md:grid-cols-2">
          {image ? (
            <div
              className="overflow-hidden"
              style={{
                borderRadius: tone.radius || "1.25rem",
                border: `1px solid ${tone.border || tone.accent}55`,
              }}
            >
              <EditableImage
                field="galleryUrls"
                index={imageIndex}
                src={image}
                className="aspect-[4/5] w-full"
                style={{ height: "100%", objectFit: "cover" }}
              />
            </div>
          ) : null}
          <div className={image ? "" : "md:col-span-2 text-center"}>
            <h2
              className="text-3xl font-light md:text-4xl"
              style={{ fontFamily: tone.fontDisplay }}
            >
              איך נפגשנו
            </h2>
            <EditableText
              field="howWeMet"
              as="p"
              multiline
              className="mt-5 min-h-[6rem] text-base leading-[1.9]"
              style={{ color: tone.muted }}
              placeholder="ספרו בקצרה איך נפגשתם"
            >
              {c.howWeMet || "נפגשנו במבט אחד — ומאז אנחנו ביחד."}
            </EditableText>
          </div>
        </div>
      </div>
    </SiteSection>
  );
}

export function ProposalBlock({
  tone,
  className = "",
  image,
  imageIndex = 2,
}: {
  tone: BlockTone;
  className?: string;
  image?: string;
  imageIndex?: number;
}) {
  const c = useWeddingContent();
  return (
    <SiteSection id="proposal" className={className}>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-light md:text-4xl" style={{ fontFamily: tone.fontDisplay }}>
          ההצעה
        </h2>
        <ProposalKneel accent={tone.accent} className="mt-4" />
        <EditableText
          field="proposalStory"
          as="p"
          multiline
          className="mt-5 min-h-[5rem] text-base leading-[1.9] md:text-lg"
          style={{ color: tone.muted }}
          placeholder="ספרו על ההצעה"
        >
          {c.proposalStory || "כריעה על ברך אחת — והתשובה הייתה כן."}
        </EditableText>
        {image ? (
          <div
            className="mx-auto mt-8 max-w-md overflow-hidden"
            style={{ borderRadius: tone.radius || "1.25rem" }}
          >
            <EditableImage
              field="galleryUrls"
              index={imageIndex}
              src={image}
              className="aspect-[3/4] w-full"
              style={{ height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : null}
      </div>
    </SiteSection>
  );
}

export function DateRevealBlock({
  tone,
  className = "",
}: {
  tone: BlockTone;
  className?: string;
}) {
  const c = useWeddingContent();
  return (
    <SiteSection id="event-details" className={className}>
      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.4em]" style={{ color: tone.accent }}>
          The Day
        </p>
        <h2
          className="mt-4 text-[clamp(2.4rem,8vw,4.5rem)] font-light leading-none"
          style={{ fontFamily: tone.fontDisplay }}
        >
          {formatHebrewDate(c.weddingDate)}
        </h2>
        <p className="mt-4 text-lg" style={{ color: tone.muted }}>
          {c.weddingTime ? `בשעה ${c.weddingTime}` : ""}
          {c.venueName ? ` · ${c.venueName}` : ""}
        </p>
      </div>
    </SiteSection>
  );
}

export function CouplePhotosBlock({
  images,
  tone,
  className = "",
  layout = "split",
  sectionId = "video",
}: {
  images: string[];
  tone: BlockTone;
  className?: string;
  layout?: "split" | "overlap" | "framed";
  /** Avoid colliding with main gallery — default uses video slot */
  sectionId?: string;
}) {
  const a = images[0];
  const b = images[1] || images[0];
  const c = images[2] || images[0];
  if (!a) return null;
  return (
    <SiteSection id={sectionId} className={className}>
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-3xl font-light md:text-4xl" style={{ fontFamily: tone.fontDisplay }}>
          אנחנו
        </h2>
        {layout === "overlap" ? (
          <div className="relative mx-auto mt-10 h-[420px] max-w-lg">
            <div className="absolute left-0 top-0 w-[58%] rotate-[-6deg] overflow-hidden border-8 border-white shadow-xl">
              <SafeImage src={a} alt="" className="aspect-[3/4] w-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 w-[58%] rotate-[5deg] overflow-hidden border-8 border-white shadow-xl">
              <SafeImage src={b} alt="" className="aspect-[3/4] w-full object-cover" />
            </div>
          </div>
        ) : layout === "framed" ? (
          <div
            className="mx-auto mt-10 max-w-md overflow-hidden p-3 shadow-2xl"
            style={{ border: `2px solid ${tone.accent}`, background: tone.surface || "#fff" }}
          >
            <SafeImage src={a} alt="" className="aspect-[4/5] w-full object-cover" />
            <p className="mt-3 text-center text-sm" style={{ color: tone.muted }}>
              Forever starts here
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[a, b, c].map((src, i) => (
              <motion.div
                key={`${src}-${i}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="overflow-hidden"
                style={{ borderRadius: tone.radius || "1rem" }}
              >
                <SafeImage src={src} alt="" className="aspect-[4/5] w-full object-cover" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </SiteSection>
  );
}

export function FullBleedPhoto({
  src,
  caption,
  className = "",
  imageIndex = 1,
}: {
  src: string;
  caption?: string;
  className?: string;
  imageIndex?: number;
}) {
  return (
    <section className={`relative min-h-[55vh] overflow-hidden ${className}`}>
      <EditableImage
        field="galleryUrls"
        index={imageIndex}
        src={src}
        className="absolute inset-0 h-full w-full"
        style={{ height: "100%", width: "100%" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
      {caption ? (
        <div className="relative z-10 flex min-h-[55vh] items-end justify-center px-6 pb-12 text-center text-white">
          <p className="max-w-xl text-lg font-light md:text-2xl">{caption}</p>
        </div>
      ) : (
        <div className="min-h-[55vh]" />
      )}
    </section>
  );
}

export function QuoteBlock({
  tone,
  className = "",
}: {
  tone: BlockTone;
  className?: string;
}) {
  const c = useWeddingContent();
  const quote =
    c.romanticQuote ||
    c.footerNote ||
    "אהבה היא לא להביט אחד בשני — אלא להביט יחד באותו כיוון.";
  return (
    <motion.section {...fade} className={`overflow-x-clip py-20 ${className}`}>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <div
          className="mx-auto mb-6 h-px w-16"
          style={{ background: `linear-gradient(90deg, transparent, ${tone.accent}, transparent)` }}
        />
        <EditableText
          field="romanticQuote"
          as="blockquote"
          multiline
          className="text-2xl font-light leading-relaxed md:text-3xl"
          style={{ fontFamily: tone.fontDisplay }}
          placeholder="הוסיפו ציטוט רומנטי"
        >
          “{quote}”
        </EditableText>
        <EditableText
          field="hashtag"
          as="p"
          className="mt-6 text-sm font-bold tracking-[0.2em]"
          style={{ color: tone.accent }}
          placeholder="#YourHashtag"
        >
          {c.hashtag
            ? c.hashtag.startsWith("#")
              ? c.hashtag
              : `#${c.hashtag}`
            : ""}
        </EditableText>
      </div>
    </motion.section>
  );
}

export function ScheduleBlock({
  tone,
  className = "",
  children,
}: {
  tone: BlockTone;
  className?: string;
  children?: React.ReactNode;
}) {
  const c = useWeddingContent();
  const items =
    c.schedule?.length > 0
      ? c.schedule
      : [{ time: c.weddingTime || "19:30", title: "תחילת האירוע", description: "" }];

  const sceneFor = (title: string, description?: string) => {
    const hay = `${title} ${description || ""}`;
    if (/חופה|ceremony|chuppah/i.test(hay)) return "chuppah" as const;
    if (/ריקוד|dance|מסיב|party/i.test(hay)) return "dance" as const;
    if (/קבלה|בופה|ארוחה|כיבוד|שולח|buffet|reception|עוגה/i.test(hay))
      return "buffet" as const;
    return null;
  };

  return (
    <SiteSection id="schedule" className={className}>
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center text-4xl font-light md:text-5xl" style={{ fontFamily: tone.fontDisplay }}>
          לוח זמנים
        </h2>
        {children}
        <ol className="mt-8 space-y-5">
          {items.map((item) => {
            const scene = sceneFor(item.title, item.description);
            return (
              <li key={`${item.time}-${item.title}`} className="space-y-3">
                <div
                  className="grid grid-cols-[88px_1fr] gap-4 px-5 py-4"
                  style={{
                    border: `1px solid ${tone.border || tone.accent}40`,
                    background: tone.surface || "transparent",
                    borderRadius: tone.radius || "1rem",
                  }}
                >
                  <span className="text-lg font-semibold tabular-nums" style={{ color: tone.accent }}>
                    {item.time}
                  </span>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    {item.description ? (
                      <p className="mt-1 text-sm" style={{ color: tone.muted }}>
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                {scene === "chuppah" ? (
                  <ChuppahMeet accent={tone.accent} />
                ) : null}
                {scene === "buffet" ? (
                  <BuffetSpread accent={tone.accent} />
                ) : null}
                {scene === "dance" ? (
                  <DanceParty accent={tone.accent} />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </SiteSection>
  );
}

export function LocationBlock({
  tone,
  className = "",
  children,
}: {
  tone: BlockTone;
  className?: string;
  children?: React.ReactNode;
}) {
  const c = useWeddingContent();
  return (
    <SiteSection id="location" className={className}>
      <div className="mx-auto max-w-4xl px-6 text-center">
        {children}
        <h2 className="text-4xl font-light md:text-5xl" style={{ fontFamily: tone.fontDisplay }}>
          {c.venueName || "מיקום"}
        </h2>
        <p className="mt-2" style={{ color: tone.muted }}>
          {c.venueAddress}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {c.wazeUrl ? (
            <a
              href={c.wazeUrl}
              target="_blank"
              rel="noreferrer"
              className={tone.buttonClass || "rounded-full px-6 py-3 text-sm font-bold text-white"}
              style={!tone.buttonClass ? { background: tone.accent } : undefined}
            >
              Waze
            </a>
          ) : null}
          {c.mapsUrl ? (
            <a
              href={c.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className={
                tone.outlineButtonClass ||
                "rounded-full border px-6 py-3 text-sm font-bold"
              }
              style={!tone.outlineButtonClass ? { borderColor: tone.accent, color: tone.accent } : undefined}
            >
              Google Maps
            </a>
          ) : null}
        </div>
        {c.venueAddress ? (
          <div
            className="mt-8 overflow-hidden"
            style={{
              borderRadius: tone.radius || "1.25rem",
              border: `1px solid ${tone.border || tone.accent}40`,
            }}
          >
            <iframe
              title="map"
              className="aspect-[16/9] w-full border-0"
              loading="lazy"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(c.venueAddress)}&z=14&output=embed`}
            />
          </div>
        ) : null}
      </div>
    </SiteSection>
  );
}

export function DressCodeBlock({
  tone,
  className = "",
}: {
  tone: BlockTone;
  className?: string;
}) {
  const c = useWeddingContent();
  return (
    <SiteSection id="dress-code" className={className}>
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-4xl font-light md:text-5xl" style={{ fontFamily: tone.fontDisplay }}>
          קוד לבוש
        </h2>
        <EditableText
          field="dressCode"
          as="p"
          multiline
          className="mt-6 text-base leading-[1.9] md:text-lg"
          style={{ color: tone.muted }}
        >
          {c.dressCode || "חגיגי אלגנטי — בואו מוקפדים ומרגשים."}
        </EditableText>
      </div>
    </SiteSection>
  );
}

export function TransportationBlock({
  tone,
  className = "",
  children,
}: {
  tone: BlockTone;
  className?: string;
  children?: React.ReactNode;
}) {
  const c = useWeddingContent();
  const items =
    c.transportation?.length > 0
      ? c.transportation
      : [
          { title: "הסעות", description: "פרטי הסעות יישלחו לאורחים שאישרו הגעה." },
          { title: "חנייה", description: c.parkingText || "חניה במתחם" },
        ];
  return (
    <SiteSection id="transportation" className={className}>
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center text-4xl font-light md:text-5xl" style={{ fontFamily: tone.fontDisplay }}>
          הגעה והסעות
        </h2>
        {children ?? <ShuttleRide accent={tone.accent} className="mt-6 mb-2" />}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="p-5"
              style={{
                border: `1px solid ${tone.border || tone.accent}40`,
                background: tone.surface || "transparent",
                borderRadius: tone.radius || "1rem",
              }}
            >
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm" style={{ color: tone.muted }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
        <EditableText
          field="parkingText"
          as="p"
          multiline
          className="mt-6 min-h-[2.5rem] text-center text-sm"
          style={{ color: tone.muted }}
          placeholder="פרטי חניה / הגעה"
        >
          {c.parkingText || ""}
        </EditableText>
      </div>
    </SiteSection>
  );
}

export function AccommodationsBlock({
  tone,
  className = "",
}: {
  tone: BlockTone;
  className?: string;
}) {
  const c = useWeddingContent();
  const items =
    c.accommodations?.length > 0
      ? c.accommodations
      : [{ name: "מלונות באזור", note: "מומלץ להזמין מראש", link: "" }];
  return (
    <SiteSection id="accommodations" className={className}>
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center text-4xl font-light md:text-5xl" style={{ fontFamily: tone.fontDisplay }}>
          לינה
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.name}
              className="p-5 text-center"
              style={{
                border: `1px solid ${tone.border || tone.accent}40`,
                background: tone.surface || "transparent",
                borderRadius: tone.radius || "1rem",
              }}
            >
              <h3 className="font-semibold">{item.name}</h3>
              <p className="mt-2 text-sm" style={{ color: tone.muted }}>
                {item.note}
              </p>
              {item.link ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-bold"
                  style={{ color: tone.accent }}
                >
                  פרטים
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </SiteSection>
  );
}

export function FaqBlock({
  tone,
  className = "",
}: {
  tone: BlockTone;
  className?: string;
}) {
  const c = useWeddingContent();
  const faq = useFaqAccordion(0);
  const items =
    c.faq?.length > 0
      ? c.faq
      : [{ question: "איך מאשרים הגעה?", answer: "דרך טופס אישור ההגעה בעמוד זה." }];
  return (
    <SiteSection id="faq" className={className}>
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="text-center text-4xl font-light md:text-5xl" style={{ fontFamily: tone.fontDisplay }}>
          שאלות נפוצות
        </h2>
        <div className="mt-8 space-y-3">
          {items.map((item, i) => (
            <button
              key={item.question}
              type="button"
              onClick={() => faq.toggle(i)}
              className="w-full px-5 py-4 text-right"
              style={{
                border: `1px solid ${tone.border || tone.accent}40`,
                background: tone.surface || "transparent",
                borderRadius: tone.radius || "1rem",
              }}
            >
              <p className="font-semibold">{item.question}</p>
              {faq.open === i ? (
                <p className="mt-2 text-sm" style={{ color: tone.muted }}>
                  {item.answer}
                </p>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </SiteSection>
  );
}

export function GiftsBlock({
  tone,
  className = "",
}: {
  tone: BlockTone;
  className?: string;
}) {
  const c = useWeddingContent();
  return (
    <SiteSection id="gifts" className={className}>
      <div className="mx-auto max-w-xl px-6 text-center">
        <h2 className="text-4xl font-light md:text-5xl" style={{ fontFamily: tone.fontDisplay }}>
          מתנות
        </h2>
        <EditableText
          field="giftsNote"
          as="p"
          multiline
          className="mt-6"
          style={{ color: tone.muted }}
        >
          {c.giftsNote || "הנוכחות שלכם היא המתנה הגדולה מכולן."}
        </EditableText>
        {c.giftLinks?.creditUrl ? (
          <a
            href={c.giftLinks.creditUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex rounded-full border px-7 py-3 text-sm font-bold"
            style={{ borderColor: tone.accent, color: tone.accent }}
          >
            מתנה דיגיטלית
          </a>
        ) : null}
      </div>
    </SiteSection>
  );
}

export function RsvpBlock({
  tone,
  className = "",
  children,
}: {
  tone: BlockTone;
  className?: string;
  children?: React.ReactNode;
}) {
  const c = useWeddingContent();
  const rsvp = useWeddingRsvp();
  const { mode } = useWeddingSite();
  const celebrate = rsvp.rsvp === "yes" || rsvp.sent;

  return (
    <SiteSection id="rsvp" className={className}>
      <div className="mx-auto max-w-md px-6">
        <h2 className="text-center text-4xl font-light md:text-5xl" style={{ fontFamily: tone.fontDisplay }}>
          אישור הגעה
        </h2>
        <EditableText
          field="rsvpText"
          as="p"
          multiline
          className="mt-3 text-center text-sm"
          style={{ color: tone.muted }}
          placeholder="טקסט לאישור הגעה"
        >
          {c.rsvpText || ""}
        </EditableText>
        {children}
        <RsvpCelebrate accent={tone.accent} active={celebrate} className="mt-2" />
        <div
          className="mt-8 space-y-4 p-7"
          style={{
            border: `1px solid ${tone.border || tone.accent}40`,
            background: tone.surface || "transparent",
            borderRadius: tone.radius || "1.25rem",
          }}
        >
          {mode !== "demo" ? (
            <GuestIdentifyRsvp
              accent={tone.accent}
              identified={rsvp.identified}
              onBind={(token, meta) => rsvp.bindToken?.(token, meta)}
            />
          ) : null}
          {rsvp.identified || mode === "demo" ? (
            rsvp.sent ? (
              <p className="text-center text-lg" style={{ color: tone.accent }}>
                תודה! קיבלנו את אישור ההגעה.
              </p>
            ) : (
              <>
                {rsvp.guestName ? (
                  <p className="text-center text-sm" style={{ color: tone.muted }}>
                    שלום {rsvp.guestName}
                  </p>
                ) : null}
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => rsvp.setRsvp(v)}
                      className="flex-1 rounded-full py-3 text-sm font-bold"
                      style={
                        rsvp.rsvp === v
                          ? { background: tone.accent, color: "#fff" }
                          : { border: `1px solid ${tone.accent}55`, color: tone.muted }
                      }
                    >
                      {v === "yes" ? "מגיע/ה" : "לא מגיע/ה"}
                    </button>
                  ))}
                </div>
                {rsvp.rsvp === "yes" ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-sm" style={{ color: tone.muted }}>
                      מספר אורחים
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={rsvp.maxGuests > 0 ? rsvp.maxGuests : 20}
                      value={rsvp.count}
                      onChange={(e) => rsvp.setCount(Number(e.target.value))}
                      className="w-20 rounded-full border px-3 py-2 text-center bg-transparent"
                      style={{ borderColor: `${tone.accent}66` }}
                    />
                  </div>
                ) : null}
                {rsvp.error ? (
                  <p className="text-center text-sm font-bold text-red-600">{rsvp.error}</p>
                ) : null}
                <button
                  type="button"
                  disabled={!rsvp.rsvp || rsvp.saving || !rsvp.canSubmit}
                  onClick={() => void rsvp.submit()}
                  className="w-full rounded-full py-3.5 text-sm font-bold text-white disabled:opacity-40"
                  style={{ background: tone.accent }}
                >
                  {rsvp.saving ? "שולח..." : "שליחה"}
                </button>
              </>
            )
          ) : null}
        </div>
      </div>
    </SiteSection>
  );
}

export function ContactPeopleBlock({
  tone,
  className = "",
}: {
  tone: BlockTone;
  className?: string;
}) {
  const c = useWeddingContent();
  return (
    <SiteSection id="contact" className={className}>
      <div className="mx-auto max-w-xl px-6 text-center">
        <h2 className="text-3xl font-light md:text-4xl" style={{ fontFamily: tone.fontDisplay }}>
          ליצירת קשר
        </h2>
        <EditableText
          field="contactNote"
          as="p"
          multiline
          className="mt-4"
          style={{ color: tone.muted }}
        >
          {c.contactNote || "לשאלות דחופות — פנו אלינו."}
        </EditableText>
        <EditableText
          field="contactPhone"
          as="p"
          className="mt-4 inline-block text-lg font-bold"
          style={{ color: tone.accent }}
          placeholder="טלפון ליצירת קשר"
        >
          {c.contactPhone || ""}
        </EditableText>
      </div>
    </SiteSection>
  );
}

export function FinalMomentBlock({
  tone,
  image,
  className = "",
}: {
  tone: BlockTone;
  image?: string;
  className?: string;
}) {
  const c = useWeddingContent();
  return (
    <section className={`relative overflow-hidden ${className}`}>
      {image ? (
        <>
          <SafeImage src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/45" />
        </>
      ) : null}
      <div
        className={`relative z-10 px-6 py-24 text-center ${image ? "text-white" : ""}`}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.4em]" style={{ color: image ? "#fff" : tone.accent }}>
          See you there
        </p>
        <EditableText
          field="coupleNames"
          as="h2"
          className="mt-4 text-[clamp(2rem,6vw,3.5rem)] font-light"
          style={{ fontFamily: tone.fontDisplay }}
        >
          {c.coupleNames}
        </EditableText>
        <EditableText
          field="footerNote"
          as="p"
          className="mt-4 text-sm opacity-80"
        >
          {c.footerNote || "נתראה בחגיגה"}
        </EditableText>
        {c.hashtag ? (
          <p className="mt-6 text-sm font-bold tracking-[0.25em]" style={{ color: image ? "#fff" : tone.accent }}>
            {c.hashtag.startsWith("#") ? c.hashtag : `#${c.hashtag}`}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function RichGalleryGrid({
  images,
  tone,
  className = "",
  title = "גלריה",
  max = 9,
}: {
  images: string[];
  tone: BlockTone;
  className?: string;
  title?: string;
  max?: number;
}) {
  const list = images.slice(0, max);
  return (
    <SiteSection id="gallery" className={className}>
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-4xl font-light md:text-5xl" style={{ fontFamily: tone.fontDisplay }}>
          {title}
        </h2>
        <div className="mt-10 columns-2 gap-3 md:columns-3">
          {list.map((src, i) => (
            <motion.figure
              key={`${src}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 3) * 0.05 }}
              className="mb-3 break-inside-avoid overflow-hidden"
              style={{ borderRadius: tone.radius || "0.75rem" }}
            >
              <EditableImage
                field="galleryUrls"
                index={i}
                src={src}
                className={`w-full ${i % 3 === 1 ? "aspect-[3/4]" : "aspect-square"}`}
                style={{ objectFit: "cover", height: "100%", width: "100%" }}
              />
            </motion.figure>
          ))}
        </div>
      </div>
    </SiteSection>
  );
}

/** Thin progress line for scroll storytelling */
export function ScrollProgressLine({ color = "#111" }: { color?: string }) {
  const { scrollYProgress } = useScroll();
  const width = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return (
    <motion.div
      style={{ width, background: color }}
      className="fixed left-0 top-0 z-[60] h-0.5"
    />
  );
}
