"use client";

import { useMemo, useState } from "react";
import type { TemplateProps } from "../shared/weddingUtils";
import {
  DEMO,
  formatHebrewDate,
  getVenueGoogleMapsLink,
  getVenueWazeLink,
} from "../shared/weddingUtils";
import WeddingMedia from "../editable/WeddingMedia";
import WeddingCountdownGrid from "../shared/WeddingCountdownGrid";
import WeddingTemplateRsvp from "../WeddingTemplateRsvp";
import { useShowWeddingRsvp } from "../shared/useShowWeddingRsvp";
import { useFaqAccordion } from "../shared/useWeddingInteractions";
import PhysicalEnvelope from "./PhysicalEnvelope";
import FriendsDrinkingScene from "./FriendsDrinkingScene";
import {
  getInteractiveWeddingTheme,
  type InteractiveWeddingThemeId,
} from "@/config/weddingWebsite/interactiveThemes";
import "./interactive-wedding.css";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Alef:wght@400;700&family=Assistant:wght@300;400;600;700&family=Caveat:wght@400;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Frank+Ruhl+Libre:wght@400;500;700&family=Great+Vibes&family=Heebo:wght@300;400;500;600;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Noto+Serif+Hebrew:wght@300;400;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Rubik:wght@300;400;500;600&display=swap";

const NAV = [
  { id: "hero", label: "ראשי" },
  { id: "countdown", label: "ספירה" },
  { id: "our-story", label: "סיפור" },
  { id: "gallery", label: "גלריה" },
  { id: "schedule", label: "לוח זמנים" },
  { id: "location", label: "הגעה" },
  { id: "rsvp", label: "אישור הגעה" },
  { id: "faq", label: "שאלות" },
];

const LUNAR_ASSETS = {
  closed: "/interactive-invites/lunar-silk/envelope-photo.webp",
  card: "/interactive-invites/lunar-silk/invite-card.webp",
  friends: "/interactive-invites/lunar-silk/friends-drink.webp",
  proposal: "/interactive-invites/lunar-silk/proposal-art.webp",
};

export default function InteractiveWeddingSite({
  themeId,
  template,
  live,
  rsvpController,
  guestMessageSlot,
}: TemplateProps & { themeId: InteractiveWeddingThemeId }) {
  const theme = getInteractiveWeddingTheme(themeId)!;
  const [opened, setOpened] = useState(false);
  const showRsvp = useShowWeddingRsvp(live, rsvpController);
  const { open: openFaq, toggle: toggleFaq } = useFaqAccordion();

  const cssVars = useMemo(
    () =>
      ({
        ["--iw-bg" as string]: theme.css.bg,
        ["--iw-bg-deep" as string]: theme.css.bgDeep,
        ["--iw-paper" as string]: theme.css.paper,
        ["--iw-ink" as string]: theme.css.ink,
        ["--iw-muted" as string]: theme.css.muted,
        ["--iw-accent" as string]: theme.css.accent,
        ["--iw-accent-soft" as string]: theme.css.accentSoft,
        ["--iw-seal" as string]: theme.css.seal,
        ["--iw-ribbon" as string]: theme.css.ribbon,
        ["--iw-envelope" as string]: theme.css.envelope,
        ["--iw-envelope-flap" as string]: theme.css.envelopeFlap,
        ["--iw-font-display" as string]: theme.css.fontDisplay,
        ["--iw-font-body" as string]: theme.css.fontBody,
        ["--iw-font-script" as string]: theme.css.fontScript,
      }) as React.CSSProperties,
    [theme]
  );

  const monogram = `${DEMO.coupleNames.split(/[&ו]/)[0]?.trim()?.[0] || "א"}&${
    DEMO.coupleNames.split(/[&ו]/)[1]?.trim()?.[0] || "ב"
  }`;
  const dateLabel = formatHebrewDate(DEMO.weddingDate);
  const closedImage = themeId === "lunar-silk" ? LUNAR_ASSETS.closed : LUNAR_ASSETS.closed;
  const cardImage = theme.heroImage || LUNAR_ASSETS.card;
  const friendsArt = LUNAR_ASSETS.friends;
  const proposalArt = LUNAR_ASSETS.proposal;

  return (
    <div className="iw-root wedding-website-root" style={cssVars} dir="rtl" lang="he" data-template={themeId}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={FONT_HREF} />

      {!opened && (
        <PhysicalEnvelope
          monogram={monogram}
          dateLabel={dateLabel}
          coupleNames={DEMO.coupleNames}
          venueName={DEMO.venueName}
          accent={theme.css.accent}
          seal={theme.css.seal}
          ribbon={theme.css.ribbon}
          paper={theme.css.paper}
          ink={theme.css.ink}
          closedImage={closedImage}
          cardImage={cardImage}
          onOpened={() => setOpened(true)}
        />
      )}

      {opened && (
        <div className="iw-column iw-grain">
          <nav className="iw-nav" aria-label="ניווט הזמנה">
            {NAV.map((item) => (
              <a key={item.id} href={`#${item.id}`}>
                {item.label}
              </a>
            ))}
          </nav>

          <section id="hero" className="iw-hero">
            <WeddingMedia
              slot="hero"
              src={template.heroImage}
              alt=""
              className="iw-hero-art"
            />
            <div className="iw-hero-fade" aria-hidden />
            <div className="iw-hero-copy">
              <p className="iw-kicker">{DEMO.heroSubtitle ? "מתחתנים" : "מתחתנים"}</p>
              <h1 className="iw-script text-5xl leading-none sm:text-6xl">{DEMO.coupleNames}</h1>
              <div className="iw-divider" />
              <p className="iw-lede" style={{ marginBottom: "0.6rem" }}>
                {DEMO.heroSubtitle}
              </p>
              <p className="iw-display text-xl">
                {dateLabel}
              </p>
              <p className="mt-1 text-sm opacity-65">
                {DEMO.weddingTime} · {DEMO.venueName}
              </p>
              {showRsvp ? (
                <a href="#rsvp" className="iw-btn mt-7">
                  אישור הגעה
                </a>
              ) : null}
              <div className="iw-scroll-hint" aria-hidden>
                גללו
                <span>⌄</span>
                <span>⌄</span>
                <span>⌄</span>
              </div>
            </div>
          </section>

          <section id="countdown" className="iw-section text-center">
            <p className="iw-kicker">ספירה לאחור</p>
            <h2 className="iw-title">עד החתונה</h2>
            <div className="iw-divider" />
            <WeddingCountdownGrid className="mx-auto mt-2 grid max-w-md grid-cols-4 gap-2">
              {(u) => (
                <div
                  key={u.label}
                  className="rounded-xl px-2 py-4"
                  style={{
                    background: "color-mix(in srgb, var(--iw-paper) 88%, white)",
                    boxShadow: "0 14px 32px rgba(50,35,18,0.08)",
                    border: "1px solid color-mix(in srgb, var(--iw-accent) 18%, transparent)",
                  }}
                >
                  <div className="iw-display text-2xl font-semibold tabular-nums sm:text-3xl">
                    {String(u.value).padStart(2, "0")}
                  </div>
                  <div className="mt-1 text-[11px] opacity-65">{u.label}</div>
                </div>
              )}
            </WeddingCountdownGrid>
          </section>

          <section id="invitation" className="iw-section text-center">
            <p className="iw-kicker">הזמנה</p>
            <h2 className="iw-title">מוזמנים לחגוג איתנו</h2>
            <div className="iw-divider" />
            <p className="iw-lede">{DEMO.invitationText}</p>
          </section>

          <section id="our-story" className="iw-section">
            <p className="iw-kicker">הסיפור שלנו</p>
            <h2 className="iw-title">איך הכל התחיל</h2>
            <div className="iw-divider" />
            <div className="mx-auto max-w-md space-y-5">
              {DEMO.storyParagraphs.map((p, i) => (
                <p key={i} className="text-center text-[0.98rem] leading-8 opacity-85">
                  {p}
                </p>
              ))}
            </div>
            <FriendsDrinkingScene artSrc={friendsArt} />
          </section>

          <section id="how-we-met" className="iw-section">
            <p className="iw-kicker">Chapter I</p>
            <h2 className="iw-title">איך נפגשנו</h2>
            <div className="iw-divider" />
            <figure className="iw-scrap mx-auto max-w-sm" style={{ transform: "rotate(-1.4deg)" }}>
              <WeddingMedia
                slot="how-we-met"
                src={template.galleryImages[0]}
                alt=""
                className="aspect-[4/5] w-full object-cover"
              />
            </figure>
            <p className="iw-lede mt-6">{DEMO.howWeMet}</p>
          </section>

          <section id="proposal" className="iw-section">
            <p className="iw-kicker">Chapter II</p>
            <h2 className="iw-title">ההצעה</h2>
            <div className="iw-divider" />
            <figure className="iw-scrap mx-auto max-w-sm overflow-hidden" style={{ transform: "rotate(1.2deg)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proposalArt} alt="ההצעה" className="aspect-[4/3] w-full object-cover" loading="lazy" />
            </figure>
            <p className="iw-lede mt-6">{DEMO.proposalStory}</p>
            <p className="iw-script mt-2 text-center text-2xl" style={{ color: "var(--iw-accent)" }}>
              and she said YES
            </p>
          </section>

          <section id="gallery" className="iw-section">
            <p className="iw-kicker">רגעים</p>
            <h2 className="iw-title">גלריה</h2>
            <div className="iw-divider" />
            <div className="mt-2 grid grid-cols-2 gap-4">
              {template.galleryImages.map((src, i) => (
                <figure
                  key={src}
                  className="iw-scrap"
                  style={{
                    transform: `rotate(${i % 2 === 0 ? -2.4 : 2.1}deg)`,
                    gridColumn: i === 0 ? "span 2" : undefined,
                    marginTop: i > 0 ? (i % 2 === 0 ? "0.35rem" : "1rem") : undefined,
                  }}
                >
                  <WeddingMedia
                    slot={`gallery.${i}`}
                    src={src}
                    alt=""
                    loading="lazy"
                    className={`w-full object-cover ${i === 0 ? "aspect-[16/10]" : "aspect-[4/5]"}`}
                  />
                </figure>
              ))}
            </div>
          </section>

          <section id="event-details" className="iw-section text-center">
            <p className="iw-kicker">פרטים</p>
            <h2 className="iw-title">פרטי האירוע</h2>
            <div className="iw-divider" />
            <div className="mx-auto grid max-w-md gap-3">
              {[
                { label: "תאריך", value: dateLabel },
                { label: "שעה", value: DEMO.weddingTime },
                { label: "מיקום", value: DEMO.venueName },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl px-4 py-4"
                  style={{
                    background: "color-mix(in srgb, var(--iw-accent) 9%, var(--iw-paper))",
                    boxShadow: "0 10px 28px rgba(50,35,18,0.06)",
                  }}
                >
                  <div className="text-xs tracking-wide opacity-55">{item.label}</div>
                  <div className="iw-display mt-1 text-lg">{item.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section id="schedule" className="iw-section">
            <p className="iw-kicker">לוח האירועים</p>
            <h2 className="iw-title">סדר היום</h2>
            <div className="iw-divider" />
            <ol className="relative mx-auto mt-2 max-w-md space-y-4">
              <div
                className="absolute start-4 top-2 bottom-2 w-px"
                style={{ background: "linear-gradient(180deg, var(--iw-accent), transparent)" }}
                aria-hidden
              />
              {DEMO.schedule.map((item) => (
                <li
                  key={item.time}
                  className="relative rounded-2xl py-3 pe-3 ps-10"
                  style={{
                    background: "color-mix(in srgb, var(--iw-paper) 92%, white)",
                    boxShadow: "0 10px 26px rgba(50,35,18,0.06)",
                  }}
                >
                  <span
                    className="absolute start-[0.7rem] top-5 h-3 w-3 rounded-full"
                    style={{
                      background: "var(--iw-accent)",
                      boxShadow: "0 0 0 4px color-mix(in srgb, var(--iw-accent) 20%, transparent)",
                    }}
                    aria-hidden
                  />
                  <div className="text-xs opacity-55" style={{ direction: "ltr" }}>
                    {item.time}
                  </div>
                  <div className="iw-display text-lg">{item.title}</div>
                  {item.description ? <div className="text-sm opacity-70">{item.description}</div> : null}
                </li>
              ))}
            </ol>
          </section>

          <section id="location" className="iw-section text-center">
            <p className="iw-kicker">איך מגיעים</p>
            <h2 className="iw-title">{DEMO.venueName}</h2>
            <div className="iw-divider" />
            <p className="iw-lede">{DEMO.venueAddress}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <a className="iw-btn" href={getVenueWazeLink()} target="_blank" rel="noreferrer">
                ניווט ב־Waze
              </a>
              <a className="iw-btn iw-btn-ghost" href={getVenueGoogleMapsLink()} target="_blank" rel="noreferrer">
                Google Maps
              </a>
            </div>
          </section>

          <section id="dress-code" className="iw-section text-center">
            <p className="iw-kicker">לבוש</p>
            <h2 className="iw-title">קוד לבוש</h2>
            <div className="iw-divider" />
            <p className="iw-lede">{DEMO.dressCode}</p>
          </section>

          {showRsvp ? (
            <section id="rsvp" className="iw-section">
              <p className="iw-kicker">אישור הגעה</p>
              <h2 className="iw-title">נשמח לדעת אם תגיעו</h2>
              <div className="iw-divider" />
              <div className="mx-auto mt-2 max-w-md">
                <WeddingTemplateRsvp templateId={template.id} controller={rsvpController} />
              </div>
            </section>
          ) : null}

          <section id="faq" className="iw-section">
            <p className="iw-kicker">שאלות נפוצות</p>
            <h2 className="iw-title">כל מה שחשוב לדעת</h2>
            <div className="iw-divider" />
            <div className="mx-auto max-w-md divide-y" style={{ borderColor: "color-mix(in srgb, var(--iw-ink) 10%, transparent)" }}>
              {DEMO.faq.map((item, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={item.question} className="py-3">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-start"
                      aria-expanded={isOpen}
                      onClick={() => toggleFaq(i)}
                    >
                      <span className="font-medium">{item.question}</span>
                      <span aria-hidden style={{ color: "var(--iw-accent)" }}>
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen ? <p className="mt-2 text-sm leading-7 opacity-75">{item.answer}</p> : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section id="gifts" className="iw-section text-center">
            <p className="iw-kicker">מתנות</p>
            <h2 className="iw-title">ברכה ומתנה</h2>
            <div className="iw-divider" />
            <p className="iw-lede">{DEMO.giftsNote}</p>
          </section>

          {guestMessageSlot ? (
            <section id="guestbook" className="iw-section">
              {guestMessageSlot}
            </section>
          ) : null}

          <footer id="footer" className="iw-section pb-24 text-center">
            <p className="iw-kicker">נתראה</p>
            <h2 className="iw-script text-4xl">{DEMO.footerNote || "נתראה בחתונה"}</h2>
            <p className="iw-display mt-4 text-2xl">{DEMO.coupleNames}</p>
            <p className="mt-2 text-sm opacity-65">
              {dateLabel} · {DEMO.weddingTime}
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}
