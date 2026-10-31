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

const LUNAR_ASSETS = {
  closed: "/interactive-invites/lunar-silk/envelope-photo.webp",
  card: "/interactive-invites/lunar-silk/invite-card.webp",
  friends: "/interactive-invites/lunar-silk/friends-drink.webp",
  proposal: "/interactive-invites/lunar-silk/proposal-art.webp",
};

const GALLERY_TILT = [-3.2, 2.8, -1.8, 3.4, -2.6];

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
  const closedImage = LUNAR_ASSETS.closed;
  const cardImage = theme.heroImage || LUNAR_ASSETS.card;
  const friendsArt = LUNAR_ASSETS.friends;
  const proposalArt = LUNAR_ASSETS.proposal;
  const gallery = template.galleryImages?.length
    ? template.galleryImages
    : theme.galleryImages;

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
          <section id="hero" className="iw-hero">
            <WeddingMedia
              slot="hero"
              src={template.heroImage || theme.heroImage}
              alt=""
              className="iw-hero-art"
              placeholder={false}
            />
            <div className="iw-hero-fade" aria-hidden />
            <div className="iw-hero-copy">
              <p className="iw-kicker">מתחתנים</p>
              <h1 className="iw-script iw-hero-names">{DEMO.coupleNames}</h1>
              <div className="iw-divider" />
              <p className="iw-lede iw-hero-sub">{DEMO.heroSubtitle}</p>
              <p className="iw-display iw-hero-date">{dateLabel}</p>
              <p className="iw-hero-meta">
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
            <div className="iw-ornament" aria-hidden>
              <span />
              <i />
              <span />
            </div>
            <WeddingCountdownGrid className="iw-count-grid">
              {(u) => (
                <div key={u.label} className="iw-count-cell">
                  <div className="iw-display iw-count-value">
                    {String(u.value).padStart(2, "0")}
                  </div>
                  <div className="iw-count-label">{u.label}</div>
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
                src={gallery[0]}
                alt=""
                className="aspect-[4/5] w-full object-cover"
                placeholder={false}
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
            <p className="iw-script iw-yes">and she said YES</p>
          </section>

          <section id="gallery" className="iw-section">
            <p className="iw-kicker">רגעים</p>
            <h2 className="iw-title">גלריה</h2>
            <div className="iw-divider" />
            <div className="iw-gallery">
              {gallery.map((src, i) => (
                <figure
                  key={`${src}-${i}`}
                  className="iw-scrap"
                  style={{
                    transform: `rotate(${GALLERY_TILT[i % GALLERY_TILT.length]}deg)`,
                    gridColumn: i === 0 ? "span 2" : undefined,
                    marginTop: i > 0 ? (i % 2 === 0 ? "0.2rem" : "1.1rem") : undefined,
                  }}
                >
                  <WeddingMedia
                    slot={`gallery.${i}`}
                    src={src}
                    alt=""
                    loading="lazy"
                    className={`w-full object-cover ${i === 0 ? "aspect-[16/10]" : "aspect-[4/5]"}`}
                    placeholder={false}
                  />
                </figure>
              ))}
            </div>
          </section>

          <section id="event-details" className="iw-section text-center">
            <p className="iw-kicker">פרטים</p>
            <h2 className="iw-title">פרטי האירוע</h2>
            <div className="iw-divider" />
            <div className="iw-detail-list">
              {[
                { label: "תאריך", value: dateLabel },
                { label: "שעה", value: DEMO.weddingTime },
                { label: "מיקום", value: DEMO.venueName },
              ].map((item) => (
                <div key={item.label} className="iw-detail-row">
                  <div className="iw-detail-label">{item.label}</div>
                  <div className="iw-display iw-detail-value">{item.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section id="schedule" className="iw-section">
            <p className="iw-kicker">לוח האירועים</p>
            <h2 className="iw-title">סדר היום</h2>
            <div className="iw-divider" />
            <ol className="iw-timeline">
              <div className="iw-timeline-line" aria-hidden />
              {DEMO.schedule.map((item) => (
                <li key={item.time} className="iw-timeline-item">
                  <span className="iw-timeline-dot" aria-hidden />
                  <div className="iw-timeline-time" style={{ direction: "ltr" }}>
                    {item.time}
                  </div>
                  <div className="iw-display iw-timeline-title">{item.title}</div>
                  {item.description ? <div className="iw-timeline-desc">{item.description}</div> : null}
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
            <div className="iw-faq">
              {DEMO.faq.map((item, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={item.question} className="iw-faq-item">
                    <button
                      type="button"
                      className="iw-faq-q"
                      aria-expanded={isOpen}
                      onClick={() => toggleFaq(i)}
                    >
                      <span>{item.question}</span>
                      <span aria-hidden>{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen ? <p className="iw-faq-a">{item.answer}</p> : null}
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
