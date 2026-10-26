"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  InteractiveInviteEventDetails,
  InteractiveInviteTheme,
  ScrollMotionStyle,
} from "@/types/interactiveInvite";

const NAV = [
  { id: "hero", label: "ראשי" },
  { id: "countdown", label: "ספירה" },
  { id: "story", label: "סיפור" },
  { id: "gallery", label: "גלריה" },
  { id: "schedule", label: "לוח זמנים" },
  { id: "location", label: "הגעה" },
  { id: "rsvp", label: "אישור הגעה" },
  { id: "faq", label: "שאלות" },
];

export function InviteNav() {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const nodes = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-35% 0px -50% 0px", threshold: [0.1, 0.4, 0.7] }
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  return (
    <nav className="ii-nav" aria-label="ניווט הזמנה">
      {NAV.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={active === item.id ? "true" : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export function HeroSection({
  event,
  motion,
}: {
  event: InteractiveInviteEventDetails;
  motion: ScrollMotionStyle;
}) {
  return (
    <section id="hero" className="relative min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.heroImage}
          alt=""
          className="ii-photo"
          data-ii-parallax={motion === "star-parallax" ? "60" : "30"}
          loading="eager"
          decoding="async"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 20%, color-mix(in srgb, var(--ii-bg) 55%, transparent) 58%, var(--ii-bg) 100%)",
          }}
        />
      </div>
      {(motion === "star-parallax" || motion === "petal-float") && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              data-ii-float
              style={{
                position: "absolute",
                left: `${8 + ((i * 17) % 84)}%`,
                top: `${12 + ((i * 23) % 70)}%`,
                width: motion === "petal-float" ? 14 + (i % 3) * 4 : 3 + (i % 3),
                height: motion === "petal-float" ? 18 + (i % 3) * 4 : 3 + (i % 3),
                borderRadius: motion === "petal-float" ? "60% 40% 60% 40%" : "50%",
                background:
                  motion === "petal-float"
                    ? "color-mix(in srgb, var(--ii-accent) 70%, white)"
                    : "var(--ii-accent)",
                opacity: 0.35 + (i % 4) * 0.08,
              }}
            />
          ))}
        </div>
      )}
      {motion === "wave-layers" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              data-ii-wave
              style={{
                height: 48 + i * 18,
                marginTop: -20,
                background: `color-mix(in srgb, var(--ii-accent-soft) ${28 + i * 12}%, transparent)`,
                borderRadius: "60% 60% 0 0",
              }}
            />
          ))}
        </div>
      )}
      <div className="relative z-[2] flex min-h-[100svh] flex-col items-center justify-end px-5 pb-16 text-center">
        <p className="ii-kicker" data-ii-reveal>
          {event.headline}
        </p>
        <h1 className="ii-script mb-3 text-5xl leading-none sm:text-6xl" data-ii-reveal>
          {event.coupleNames}
        </h1>
        <p className="ii-lede" data-ii-reveal>
          {event.subheadline}
        </p>
        <p className="ii-display text-xl" data-ii-reveal>
          {event.weddingDateLabel}
        </p>
        <a href="#rsvp" className="ii-btn ii-btn-primary mt-8" data-ii-reveal>
          אישור הגעה
        </a>
        <div className="mt-10 animate-bounce text-sm opacity-60" aria-hidden>
          גללו להמשך
          <div>⌄</div>
        </div>
      </div>
    </section>
  );
}

export function CountdownSection({ event }: { event: InteractiveInviteEventDetails }) {
  const target = useMemo(() => new Date(event.weddingDateIso).getTime(), [event.weddingDateIso]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const cells = [
    { label: "ימים", value: days },
    { label: "שעות", value: hours },
    { label: "דקות", value: minutes },
    { label: "שניות", value: seconds },
  ];

  return (
    <section id="countdown" className="ii-section text-center">
      <p className="ii-kicker" data-ii-reveal>
        ספירה לאחור
      </p>
      <h2 className="ii-title" data-ii-reveal>
        עד החתונה
      </h2>
      <div
        className="mx-auto mt-6 grid max-w-md grid-cols-4 gap-2"
        data-ii-reveal
        style={{ direction: "ltr" }}
      >
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-[var(--ii-radius)] px-2 py-4"
            style={{
              background: "color-mix(in srgb, var(--ii-paper) 90%, white)",
              boxShadow: "var(--ii-shadow)",
            }}
          >
            <div className="ii-display text-2xl font-semibold tabular-nums sm:text-3xl">
              {String(c.value).padStart(2, "0")}
            </div>
            <div className="mt-1 text-[11px] opacity-65">{c.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StorySection({ event }: { event: InteractiveInviteEventDetails }) {
  return (
    <section id="story" className="ii-section">
      <div className="text-center">
        <p className="ii-kicker" data-ii-reveal>
          הסיפור שלנו
        </p>
        <h2 className="ii-title" data-ii-reveal>
          איך הכל התחיל
        </h2>
        <p className="ii-lede" data-ii-reveal>
          {event.storyIntro}
        </p>
      </div>
      <div className="relative mx-auto mt-8 max-w-md space-y-8">
        <div
          data-ii-timeline
          className="absolute start-4 top-2 bottom-2 w-[2px] origin-top"
          style={{ background: "linear-gradient(180deg, var(--ii-accent), transparent)" }}
          aria-hidden
        />
        {event.storyBeats.map((beat) => (
          <article key={beat.title} className="relative ps-10" data-ii-reveal>
            <span
              className="absolute start-[0.55rem] top-1.5 h-3 w-3 rounded-full"
              style={{ background: "var(--ii-accent)", boxShadow: "0 0 0 4px color-mix(in srgb, var(--ii-accent) 25%, transparent)" }}
              aria-hidden
            />
            <h3 className="ii-display text-xl">{beat.title}</h3>
            {beat.date ? <p className="text-xs opacity-60">{beat.date}</p> : null}
            <p className="mt-2 text-sm leading-7 opacity-80">{beat.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function GallerySection({
  event,
  motion,
}: {
  event: InteractiveInviteEventDetails;
  motion: ScrollMotionStyle;
}) {
  return (
    <section id="gallery" className="ii-section">
      <div className="text-center">
        <p className="ii-kicker" data-ii-reveal>
          רגעים
        </p>
        <h2 className="ii-title" data-ii-reveal>
          גלריה
        </h2>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3">
        {event.galleryImages.map((src, i) => (
          <figure
            key={src}
            data-ii-photo
            data-ii-reveal
            className="overflow-hidden"
            style={{
              borderRadius: "var(--ii-radius)",
              transform:
                motion === "scrapbook-stack"
                  ? `rotate(${i % 2 === 0 ? -2.5 : 2.5}deg)`
                  : undefined,
              boxShadow:
                motion === "scrapbook-stack"
                  ? "0 10px 28px rgba(0,0,0,0.18)"
                  : "var(--ii-shadow)",
              background: "var(--ii-paper)",
              padding: motion === "scrapbook-stack" ? "8px 8px 18px" : 0,
              gridColumn: i === 0 || i === 5 ? "span 2" : undefined,
              aspectRatio: i === 0 || i === 5 ? "16/10" : "4/5",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="ii-photo"
              loading="lazy"
              decoding="async"
              style={{ borderRadius: motion === "scrapbook-stack" ? 4 : undefined }}
            />
          </figure>
        ))}
      </div>
    </section>
  );
}

export function ScheduleSection({ event }: { event: InteractiveInviteEventDetails }) {
  const items = [
    { time: event.receptionTime, title: "קבלת פנים", note: "ברכות וכוס ראשונה" },
    { time: event.ceremonyTime, title: "חופה", note: "הרגע שלנו" },
    { time: "אחרי", title: "מסיבה", note: event.partyNote },
  ];

  return (
    <section id="schedule" className="ii-section">
      <div className="text-center">
        <p className="ii-kicker" data-ii-reveal>
          לוח האירועים
        </p>
        <h2 className="ii-title" data-ii-reveal>
          {event.weddingDateLabel}
        </h2>
      </div>
      <ol className="relative mx-auto mt-8 max-w-md space-y-5">
        <div
          data-ii-timeline
          className="absolute start-5 top-3 bottom-3 w-[2px] origin-top"
          style={{ background: "var(--ii-accent)" }}
          aria-hidden
        />
        {items.map((item) => (
          <li
            key={item.title}
            className="relative rounded-[var(--ii-radius)] py-4 pe-4 ps-12"
            data-ii-reveal
            style={{
              background: "color-mix(in srgb, var(--ii-paper) 92%, white)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
            }}
          >
            <span
              className="absolute start-[0.85rem] top-5 h-3.5 w-3.5 rounded-full"
              style={{ background: "var(--ii-accent)" }}
              aria-hidden
            />
            <div className="text-xs font-semibold tracking-wide opacity-60" style={{ direction: "ltr" }}>
              {item.time}
            </div>
            <div className="ii-display text-xl">{item.title}</div>
            <div className="text-sm opacity-70">{item.note}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LocationSection({ event }: { event: InteractiveInviteEventDetails }) {
  return (
    <section id="location" className="ii-section">
      <div className="text-center">
        <p className="ii-kicker" data-ii-reveal>
          איך מגיעים
        </p>
        <h2 className="ii-title" data-ii-reveal>
          {event.venueName}
        </h2>
        <p className="ii-lede" data-ii-reveal>
          {event.venueAddress}
          <br />
          {event.city}
        </p>
      </div>
      <div
        className="mx-auto mt-4 overflow-hidden rounded-[var(--ii-radius)]"
        data-ii-reveal
        style={{
          aspectRatio: "16/10",
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--ii-accent-soft) 35%, var(--ii-paper)), var(--ii-bg-deep))",
          boxShadow: "var(--ii-shadow)",
        }}
      >
        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
          <div className="ii-display text-2xl">{event.venueName}</div>
          <div className="text-sm opacity-70">{event.venueAddress}</div>
          <div
            className="mt-2 h-2 w-2 rounded-full"
            style={{ background: "var(--ii-seal)", boxShadow: "0 0 0 8px color-mix(in srgb, var(--ii-seal) 25%, transparent)" }}
            aria-hidden
          />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2" data-ii-reveal>
        <a className="ii-btn ii-btn-primary" href={event.wazeUrl} target="_blank" rel="noreferrer">
          ניווט ב־Waze
        </a>
        <a className="ii-btn ii-btn-ghost" href={event.mapsUrl} target="_blank" rel="noreferrer">
          Google Maps
        </a>
      </div>
      {event.dressCode ? (
        <p className="mt-6 text-center text-sm opacity-70" data-ii-reveal>
          לבוש מומלץ: {event.dressCode}
        </p>
      ) : null}
    </section>
  );
}

export function RsvpSection({ event }: { event: InteractiveInviteEventDetails }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [coming, setComing] = useState<"yes" | "no" | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !coming) return;
    // Preview only — no production RSVP / guest DB write
    setSent(true);
  };

  return (
    <section id="rsvp" className="ii-section">
      <div className="text-center">
        <p className="ii-kicker" data-ii-reveal>
          אישור הגעה
        </p>
        <h2 className="ii-title" data-ii-reveal>
          נשמח לדעת אם תגיעו
        </h2>
        <p className="ii-lede" data-ii-reveal>
          זוהי תצוגת Preview בלבד — האישור לא נשמר במערכת ההזמנות של INVISTIMO.
        </p>
      </div>
      <form
        onSubmit={submit}
        className="mx-auto mt-4 max-w-md space-y-3 rounded-[var(--ii-radius)] p-5"
        data-ii-reveal
        style={{
          background: "color-mix(in srgb, var(--ii-paper) 94%, white)",
          boxShadow: "var(--ii-shadow)",
        }}
      >
        {sent ? (
          <div className="py-8 text-center">
            <p className="ii-display text-2xl">תודה!</p>
            <p className="mt-2 text-sm opacity-70">
              קיבלנו את התשובה שלכם בתצוגה המקדימה
              {coming === "yes" ? " — נתראה בחתונה" : ""}.
            </p>
          </div>
        ) : (
          <>
            <label className="block text-sm">
              שם מלא
              <input
                className="ii-field mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>
            <label className="block text-sm">
              טלפון
              <input
                className="ii-field mt-1"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
            <div>
              <p className="mb-2 text-sm">האם תגיעו?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="ii-choice"
                  aria-pressed={coming === "yes"}
                  onClick={() => setComing("yes")}
                >
                  נגיע בשמחה
                </button>
                <button
                  type="button"
                  className="ii-choice"
                  aria-pressed={coming === "no"}
                  onClick={() => setComing("no")}
                >
                  לצערנו לא נוכל
                </button>
              </div>
            </div>
            <label className="block text-sm">
              הערות (אלרגיות / נגישות)
              <textarea
                className="ii-field mt-1 min-h-[90px] resize-y"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button type="submit" className="ii-btn ii-btn-primary w-full">
              שליחת אישור
            </button>
            <p className="text-center text-[11px] opacity-55">
              לכבוד {event.partnerA} ו{event.partnerB} · Preview בלבד
            </p>
          </>
        )}
      </form>
    </section>
  );
}

export function FaqSection({ event }: { event: InteractiveInviteEventDetails }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="ii-section">
      <div className="text-center">
        <p className="ii-kicker" data-ii-reveal>
          שאלות נפוצות
        </p>
        <h2 className="ii-title" data-ii-reveal>
          כל מה שחשוב לדעת
        </h2>
      </div>
      <div className="mx-auto mt-6 max-w-md divide-y" data-ii-reveal style={{ borderColor: "color-mix(in srgb, var(--ii-ink) 10%, transparent)" }}>
        {event.faq.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="py-3" style={{ borderColor: "color-mix(in srgb, var(--ii-ink) 10%, transparent)" }}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 text-start"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span className="font-medium">{item.q}</span>
                <span aria-hidden style={{ color: "var(--ii-accent)" }}>
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen ? <p className="mt-2 text-sm leading-7 opacity-75">{item.a}</p> : null}
            </div>
          );
        })}
      </div>
      {event.contactWhatsapp ? (
        <div className="mt-8 text-center" data-ii-reveal>
          <a className="ii-btn ii-btn-ghost" href={event.contactWhatsapp} target="_blank" rel="noreferrer">
            שאלה? כתבו לנו בוואטסאפ
          </a>
        </div>
      ) : null}
    </section>
  );
}

export function FooterSection({ event }: { event: InteractiveInviteEventDetails }) {
  return (
    <footer className="ii-section pb-28 text-center">
      <p className="ii-kicker" data-ii-reveal>
        נתראה
      </p>
      <h2 className="ii-script text-4xl" data-ii-reveal>
        {event.closingLine}
      </h2>
      <p className="ii-display mt-4 text-2xl" data-ii-reveal>
        {event.coupleNames}
      </p>
      <p className="mt-2 text-sm opacity-65" data-ii-reveal>
        {event.weddingDateLabel}
      </p>
      <p className="mt-10 text-[11px] opacity-45">
        תבנית אינטראקטיבית · INVISTIMO Preview
      </p>
    </footer>
  );
}

export function themeToCssVars(theme: InteractiveInviteTheme): React.CSSProperties {
  return {
    ["--ii-bg" as string]: theme.bg,
    ["--ii-bg-deep" as string]: theme.bgDeep,
    ["--ii-paper" as string]: theme.paper,
    ["--ii-ink" as string]: theme.ink,
    ["--ii-muted" as string]: theme.muted,
    ["--ii-accent" as string]: theme.accent,
    ["--ii-accent-soft" as string]: theme.accentSoft,
    ["--ii-seal" as string]: theme.seal,
    ["--ii-ribbon" as string]: theme.ribbon,
    ["--ii-envelope" as string]: theme.envelope,
    ["--ii-envelope-flap" as string]: theme.envelopeFlap,
    ["--ii-grain" as string]: String(theme.grainOpacity),
    ["--ii-font-display" as string]: theme.fontDisplay,
    ["--ii-font-body" as string]: theme.fontBody,
    ["--ii-font-script" as string]: theme.fontScript,
    ["--ii-radius" as string]: theme.radius,
    ["--ii-shadow" as string]: theme.shadow,
  };
}
