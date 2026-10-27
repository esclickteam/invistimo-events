"use client";

/**
 * Photoreal closed stationery → invitation card rises from the pocket.
 * No flat CSS flap/pocket mid-state (that read as PowerPoint shapes).
 */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type Props = {
  monogram: string;
  dateLabel: string;
  coupleNames: string;
  venueName: string;
  accent: string;
  seal: string;
  ribbon: string;
  paper: string;
  ink: string;
  closedImage: string;
  cardImage: string;
  onOpened: () => void;
};

export default function PhysicalEnvelope({
  monogram,
  dateLabel,
  coupleNames,
  venueName,
  accent,
  seal,
  ribbon,
  paper,
  ink,
  closedImage,
  cardImage,
  onOpened,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onOpened();
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const idle = gsap.timeline({ repeat: -1, yoyo: true });
    idle
      .to(root.querySelector("[data-pe-closed]"), { y: -4, duration: 3.2, ease: "sine.inOut" }, 0)
      .to(root.querySelector("[data-pe-hint-cta]"), { opacity: 0.42, duration: 1.6, ease: "sine.inOut" }, 0);
    return () => {
      idle.kill();
    };
  }, []);

  const open = () => {
    if (busy || done.current) {
      finish();
      return;
    }
    setBusy(true);
    const root = rootRef.current;
    if (!root) {
      finish();
      return;
    }

    const closed = root.querySelector<HTMLElement>("[data-pe-closed]");
    const card = root.querySelector<HTMLElement>("[data-pe-card]");
    const hint = root.querySelector<HTMLElement>("[data-pe-hint]");
    const glow = root.querySelector<HTMLElement>("[data-pe-glow]");

    gsap.killTweensOf([closed, card, hint, glow]);

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(root, {
          opacity: 0,
          duration: 0.75,
          ease: "power1.out",
          onComplete: finish,
        });
      },
    });

    tl.to(hint, { opacity: 0, y: 18, duration: 0.28 }, 0)
      .to(glow, { opacity: 0.55, duration: 0.45, ease: "power1.out" }, 0.05)
      .set(card, { visibility: "visible" }, 0.12)
      .fromTo(
        card,
        {
          yPercent: 42,
          scale: 0.9,
          opacity: 0.85,
          rotateZ: -1.2,
          filter: "brightness(0.92)",
        },
        {
          yPercent: -22,
          scale: 1.04,
          opacity: 1,
          rotateZ: 0,
          filter: "brightness(1)",
          duration: 1.35,
          ease: "power3.out",
        },
        0.18
      )
      .to(
        closed,
        {
          y: 88,
          scale: 0.94,
          opacity: 0,
          filter: "blur(2px)",
          duration: 0.95,
          ease: "power2.in",
        },
        0.42
      )
      .to(
        card,
        {
          yPercent: -6,
          scale: 1.1,
          duration: 0.55,
          ease: "power2.out",
        },
        1.25
      )
      .to(
        card,
        {
          scale: 1.42,
          yPercent: -48,
          opacity: 0.08,
          filter: "blur(2px)",
          duration: 0.8,
          ease: "power2.inOut",
        },
        1.75
      )
      .to(glow, { opacity: 0, duration: 0.5 }, 1.85);
  };

  return (
    <div
      className="pe-scene"
      ref={rootRef}
      style={
        {
          ["--pe-accent" as string]: accent,
          ["--pe-seal" as string]: seal,
          ["--pe-ribbon" as string]: ribbon,
          ["--pe-paper" as string]: paper,
          ["--pe-ink" as string]: ink,
        } as React.CSSProperties
      }
    >
      <button type="button" className="pe-skip" onClick={finish}>
        דלגו
      </button>

      <div className="pe-glow" data-pe-glow aria-hidden />

      <div
        className="pe-stage"
        role="button"
        tabIndex={0}
        aria-label="לחצו לפתיחת ההזמנה"
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
      >
        <div className="pe-rise-card" data-pe-card aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImage} alt="" className="pe-rise-card-art" draggable={false} />
          <div className="pe-rise-card-copy">
            <p className="pe-card-kicker">מתחתנים</p>
            <p className="pe-card-names">{coupleNames}</p>
            <div className="pe-card-rule" />
            <p className="pe-card-date">{dateLabel}</p>
            <p className="pe-card-venue">{venueName}</p>
            <span className="sr-only">{monogram}</span>
          </div>
        </div>

        <div className="pe-closed" data-pe-closed aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={closedImage} alt="" draggable={false} />
        </div>

        <div className="pe-hint" data-pe-hint>
          <div className="pe-hint-date">{dateLabel}</div>
          <div className="pe-hint-cta" data-pe-hint-cta>
            לחצו לפתיחה
          </div>
          <div className="pe-hint-names">{coupleNames}</div>
        </div>
      </div>
    </div>
  );
}
