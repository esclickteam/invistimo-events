"use client";

/**
 * Premium stationery open:
 * - Closed look is a photoreal product photo (paper, ribbon, wax, sprig).
 * - On click: seal/ribbon break away, invitation card physically rises from
 *   the pocket with perspective, envelope drops away into the site.
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
      .to(root.querySelector("[data-pe-closed]"), { y: -3, duration: 2.8, ease: "sine.inOut" }, 0)
      .to(root.querySelector("[data-pe-hint-cta]"), { opacity: 0.45, duration: 1.5, ease: "sine.inOut" }, 0);
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
    const sealEl = root.querySelector<HTMLElement>("[data-pe-seal]");
    const ribbonEl = root.querySelector<HTMLElement>("[data-pe-ribbon]");
    const card = root.querySelector<HTMLElement>("[data-pe-card]");
    const flap = root.querySelector<HTMLElement>("[data-pe-flap]");
    const pocket = root.querySelector<HTMLElement>("[data-pe-pocket]");
    const stack = root.querySelector<HTMLElement>("[data-pe-stack]");
    const hint = root.querySelector<HTMLElement>("[data-pe-hint]");

    gsap.killTweensOf([closed, sealEl, ribbonEl, card, flap, pocket, stack]);

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(root, { opacity: 0, duration: 0.65, ease: "power1.out", onComplete: finish });
      },
    });

    tl.to(hint, { opacity: 0, y: 12, duration: 0.25 }, 0)
      .set([sealEl, ribbonEl], { opacity: 1 }, 0)
      .to(
        sealEl,
        { y: -42, scale: 0.5, rotate: -26, opacity: 0, duration: 0.55, ease: "back.in(1.9)" },
        0.05
      )
      .to(
        ribbonEl,
        { scaleX: 1.18, y: 28, opacity: 0, filter: "blur(2px)", duration: 0.55, ease: "power2.in" },
        0.1
      )
      .set(stack, { visibility: "visible" }, 0.28)
      .fromTo(stack, { opacity: 0 }, { opacity: 1, duration: 0.28 }, 0.28)
      .to(closed, { opacity: 0, scale: 0.985, duration: 0.45, ease: "power1.out" }, 0.3)
      .to(flap, { rotateX: -168, duration: 1.05, ease: "power3.inOut" }, 0.38)
      .to(
        card,
        {
          yPercent: -128,
          rotateZ: -1.4,
          scale: 1.05,
          duration: 1.2,
          ease: "power3.out",
        },
        0.58
      )
      .to(card, { rotateZ: 0, scale: 1.14, duration: 0.5, ease: "power2.out" }, 1.4)
      .to([pocket, flap], { y: 110, opacity: 0, duration: 0.7, ease: "power2.in" }, 1.5)
      .to(
        card,
        {
          scale: 1.4,
          yPercent: -152,
          opacity: 0.1,
          filter: "blur(1.5px)",
          duration: 0.7,
          ease: "power2.inOut",
        },
        1.8
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
        {/* Photoreal closed stationery */}
        <div className="pe-closed" data-pe-closed aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={closedImage} alt="" draggable={false} />
        </div>

        {/* Layered open stack */}
        <div className="pe-stack" data-pe-stack aria-hidden>
          <div className="pe-pocket" data-pe-pocket>
            <div className="pe-paper-slab" />
            <div className="pe-pocket-shade" />
          </div>

          <div className="pe-card" data-pe-card>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardImage} alt="" className="pe-card-art" draggable={false} />
            <div className="pe-card-copy">
              <p className="pe-card-kicker">מתחתנים</p>
              <p className="pe-card-names">{coupleNames}</p>
              <div className="pe-card-rule" />
              <p className="pe-card-date">{dateLabel}</p>
              <p className="pe-card-venue">{venueName}</p>
            </div>
          </div>

          <div className="pe-flap" data-pe-flap>
            <div className="pe-flap-face" />
          </div>
        </div>

        {/* Breakaway overlays matched to the photo */}
        <div className="pe-ribbon-overlay" data-pe-ribbon aria-hidden />
        <div className="pe-seal-overlay" data-pe-seal aria-hidden>
          <span>{monogram}</span>
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
