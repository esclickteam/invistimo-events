"use client";

/**
 * True layered physical envelope — not a single photo with effects.
 * Layers (back → front): back panel, invitation card, pocket front, hinged flap,
 * ribbon, wax seal. GSAP opens flap (rotateX) then pulls the card out of the pocket.
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
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const flap = root.querySelector<HTMLElement>("[data-pe-flap]");
    const sealEl = root.querySelector<HTMLElement>("[data-pe-seal]");
    const ribbonEl = root.querySelector<HTMLElement>("[data-pe-ribbon]");
    const card = root.querySelector<HTMLElement>("[data-pe-card]");
    const body = root.querySelector<HTMLElement>("[data-pe-body]");
    const hint = root.querySelector<HTMLElement>("[data-pe-hint]");

    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => {
        gsap.to(root, {
          opacity: 0,
          duration: 0.55,
          ease: "power1.out",
          onComplete: finish,
        });
      },
    });

    tl.to(hint, { opacity: 0, y: 10, duration: 0.25 }, 0)
      .to(
        sealEl,
        {
          y: -34,
          scale: 0.35,
          rotate: -28,
          opacity: 0,
          duration: 0.5,
          ease: "back.in(1.8)",
        },
        0.05
      )
      .to(
        ribbonEl,
        {
          scaleX: 0.15,
          opacity: 0,
          y: 18,
          duration: 0.45,
          ease: "power2.in",
        },
        0.1
      )
      .to(
        flap,
        {
          rotateX: -165,
          duration: 1.05,
          ease: "power3.inOut",
        },
        0.28
      )
      .to(
        card,
        {
          y: "-118%",
          rotateZ: -1.5,
          scale: 1.04,
          duration: 1.15,
          ease: "power3.out",
        },
        0.55
      )
      .to(
        card,
        {
          rotateZ: 0,
          scale: 1.12,
          duration: 0.45,
          ease: "power2.out",
        },
        1.35
      )
      .to(
        body,
        {
          y: 90,
          opacity: 0,
          duration: 0.65,
          ease: "power2.in",
        },
        1.45
      )
      .to(
        card,
        {
          scale: 1.45,
          y: "-145%",
          opacity: 0,
          filter: "blur(2px)",
          duration: 0.7,
          ease: "power2.inOut",
        },
        1.7
      );
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
        <div className="pe-envelope" data-pe-body>
          {/* BACK panel */}
          <div className="pe-back" aria-hidden>
            <div className="pe-paper-fill" />
            <div className="pe-grain" />
          </div>

          {/* INVITATION CARD — tucked inside the pocket */}
          <div className="pe-card" data-pe-card>
            <div className="pe-card-inner">
              <p className="pe-card-kicker">מתחתנים</p>
              <p className="pe-card-names">{coupleNames}</p>
              <div className="pe-card-rule" />
              <p className="pe-card-date">{dateLabel}</p>
              <p className="pe-card-venue">{venueName}</p>
            </div>
          </div>

          {/* FRONT pocket — V cut so card can rise out */}
          <div className="pe-pocket" aria-hidden>
            <div className="pe-paper-fill" />
            <div className="pe-grain" />
            <div className="pe-pocket-shade" />
            <div className="pe-pocket-lip" />
          </div>

          {/* HINGED FLAP — opens with rotateX from top edge */}
          <div className="pe-flap" data-pe-flap aria-hidden>
            <div className="pe-flap-face">
              <div className="pe-paper-fill" />
              <div className="pe-grain" />
              <div className="pe-flap-fold" />
            </div>
            <div className="pe-flap-back">
              <div className="pe-paper-fill pe-paper-fill--dark" />
            </div>
          </div>

          {/* SATIN RIBBON band */}
          <div className="pe-ribbon" data-pe-ribbon aria-hidden>
            <span className="pe-ribbon-sheen" />
          </div>

          {/* WAX SEAL */}
          <div className="pe-seal" data-pe-seal aria-hidden>
            <span className="pe-seal-rim" />
            <span className="pe-seal-face">{monogram}</span>
          </div>
        </div>

        <div className="pe-hint" data-pe-hint>
          <div className="pe-hint-date">{dateLabel}</div>
          <div className="pe-hint-cta">לחצו לפתיחה</div>
        </div>
      </div>
    </div>
  );
}
