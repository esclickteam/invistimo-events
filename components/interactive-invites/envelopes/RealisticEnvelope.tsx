"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "../engine/usePrefersReducedMotion";

const ASSETS = {
  linen: "/interactive-invites/lunar-silk/stage-linen.webp",
  closed: "/interactive-invites/lunar-silk/envelope-photo.webp",
  ribbon: "/interactive-invites/lunar-silk/silk-ribbon.webp",
  seal: "/interactive-invites/lunar-silk/wax-seal.webp",
  sprig: "/interactive-invites/lunar-silk/sprig.webp",
  card: "/interactive-invites/lunar-silk/invite-card.webp",
  grain: "/interactive-invites/lunar-silk/paper-grain.webp",
  flap: "/interactive-invites/lunar-silk/flap-photo.webp",
  pocket: "/interactive-invites/lunar-silk/pocket-photo.webp",
} as const;

type Props = {
  monogram: string;
  dateLabel: string;
  coupleNames: string;
  partnerA: string;
  partnerB: string;
  venueName: string;
  onOpened: () => void;
};

export default function RealisticEnvelope({
  monogram,
  dateLabel,
  coupleNames,
  partnerA,
  partnerB,
  venueName,
  onOpened,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const openedRef = useRef(false);

  const finish = () => {
    if (openedRef.current) return;
    openedRef.current = true;
    onOpened();
  };

  useEffect(() => {
    if (reduced) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    const idle = gsap.timeline({ repeat: -1, yoyo: true });
    idle
      .to(root.querySelector(".ii-real-seal"), {
        y: -2.5,
        rotation: 0.5,
        duration: 2.6,
        ease: "sine.inOut",
      }, 0)
      .to(root.querySelector(".ii-real-ribbon-overlay"), {
        y: 1.5,
        duration: 3,
        ease: "sine.inOut",
      }, 0)
      .to(root.querySelector(".ii-real-sprig"), {
        rotation: "+=2",
        duration: 3.4,
        ease: "sine.inOut",
      }, 0)
      .to(root.querySelector(".ii-real-hint-pulse"), {
        opacity: 0.5,
        duration: 1.5,
        ease: "sine.inOut",
      }, 0);
    return () => {
      idle.kill();
    };
  }, [reduced]);

  const open = () => {
    if (busy || openedRef.current || reduced) {
      finish();
      return;
    }
    setBusy(true);
    const root = rootRef.current;
    if (!root) {
      finish();
      return;
    }

    const seal = root.querySelector<HTMLElement>(".ii-real-seal");
    const ribbon = root.querySelector<HTMLElement>(".ii-real-ribbon-overlay");
    const sprig = root.querySelector<HTMLElement>(".ii-real-sprig");
    const closed = root.querySelector<HTMLElement>(".ii-real-closed-plate");
    const flap = root.querySelector<HTMLElement>(".ii-real-flap");
    const card = root.querySelector<HTMLElement>(".ii-real-card");
    const pocket = root.querySelector<HTMLElement>(".ii-real-pocket");
    const back = root.querySelector<HTMLElement>(".ii-real-back");
    const stack = root.querySelector<HTMLElement>(".ii-real-stack");
    const hint = root.querySelector<HTMLElement>(".ii-real-hint");
    const glow = root.querySelector<HTMLElement>(".ii-real-glow");

    gsap.killTweensOf([
      seal,
      ribbon,
      sprig,
      closed,
      flap,
      card,
      pocket,
      back,
      stack,
    ]);

    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => {
        gsap.to(root, {
          opacity: 0,
          duration: 0.7,
          ease: "power1.out",
          onComplete: finish,
        });
      },
    });

    tl.to(hint, { opacity: 0, y: 14, duration: 0.28 }, 0)
      // Materialize breakaway overlays on top of the photo, then shatter them
      .set([seal, ribbon, sprig], { opacity: 1 }, 0)
      .to(
        seal,
        {
          y: -40,
          scale: 0.58,
          rotate: -24,
          opacity: 0,
          duration: 0.62,
          ease: "back.in(1.85)",
        },
        0.06
      )
      .to(
        sprig,
        { y: -52, x: 24, rotate: 26, opacity: 0, duration: 0.52, ease: "power2.in" },
        0.1
      )
      .to(
        ribbon,
        {
          scaleX: 1.22,
          y: 34,
          opacity: 0,
          filter: "blur(3px)",
          duration: 0.62,
          ease: "power2.in",
        },
        0.12
      )
      // Reveal physical stack under the photo plate
      .set(stack, { visibility: "visible" }, 0.3)
      .fromTo(stack, { opacity: 0 }, { opacity: 1, duration: 0.28 }, 0.3)
      .to(closed, { opacity: 0, scale: 0.98, duration: 0.5, ease: "power1.out" }, 0.32)
      // Open flap
      .to(
        flap,
        {
          rotateX: -172,
          duration: 1.1,
          ease: "power3.inOut",
        },
        0.38
      )
      .to(glow, { opacity: 0.6, duration: 0.7 }, 0.5)
      // Pull invitation card out with depth
      .to(
        card,
        {
          yPercent: -132,
          rotateX: 6,
          rotateZ: -1.4,
          scale: 1.05,
          duration: 1.25,
          ease: "power3.out",
        },
        0.62
      )
      .to(
        card,
        {
          rotateZ: 0,
          rotateX: 0,
          scale: 1.14,
          duration: 0.55,
          ease: "power2.out",
        },
        1.45
      )
      // Envelope drops away; card becomes the portal into the site
      .to(
        [pocket, back, flap],
        {
          y: 120,
          opacity: 0,
          duration: 0.75,
          ease: "power2.in",
        },
        1.55
      )
      .to(
        card,
        {
          scale: 1.42,
          yPercent: -150,
          filter: "blur(1.5px)",
          opacity: 0.12,
          duration: 0.75,
          ease: "power2.inOut",
        },
        1.85
      );
  };

  if (reduced) return null;

  return (
    <div
      className="ii-real-scene"
      ref={rootRef}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(243,238,228,0.35), rgba(229,219,204,0.72)), url(${ASSETS.linen})`,
      }}
    >
      <button type="button" className="ii-skip" onClick={finish}>
        דלגו
      </button>

      <div className="ii-real-glow" aria-hidden />

      <div
        className="ii-real-wrap"
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
        {/* Photoreal closed composite — primary closed look */}
        <div className="ii-real-closed-plate" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.closed} alt="" className="ii-real-closed-img" draggable={false} />
        </div>

        {/* Animated physical stack (revealed while opening) */}
        <div className="ii-real-stack" aria-hidden>
          <div className="ii-real-back">
            <div
              className="ii-real-paper-body"
              style={{ backgroundImage: `url(${ASSETS.grain})` }}
            />
          </div>

          <div className="ii-real-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSETS.card} alt="" className="ii-real-card-art" draggable={false} />
            <div className="ii-real-card-copy">
              <p className="ii-real-card-kicker">מתחתנים</p>
              <p className="ii-real-card-names">
                {partnerA} & {partnerB}
              </p>
              <p className="ii-real-card-date">{dateLabel}</p>
              <p className="ii-real-card-venue">{venueName}</p>
            </div>
          </div>

          <div className="ii-real-pocket">
            <div
              className="ii-real-paper-body ii-real-pocket-face"
              style={{ backgroundImage: `url(${ASSETS.grain})` }}
            />
            <div className="ii-real-pocket-shade" />
          </div>

          <div className="ii-real-flap">
            <div
              className="ii-real-flap-face"
              style={{ backgroundImage: `url(${ASSETS.grain})` }}
            />
            <div className="ii-real-flap-edge" />
          </div>
        </div>

        {/* Interactive overlays aligned to the photo seal/ribbon for the break-away */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.ribbon}
          alt=""
          className="ii-real-ribbon-overlay"
          draggable={false}
          aria-hidden
        />

        <div className="ii-real-seal" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.seal} alt="" draggable={false} />
          <span className="ii-real-monogram">{monogram}</span>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.sprig}
          alt=""
          className="ii-real-sprig"
          draggable={false}
          aria-hidden
        />

        <div className="ii-real-hint">
          <div className="ii-real-hint-date">{dateLabel}</div>
          <div className="ii-real-hint-pulse">לחצו לפתיחה</div>
          <div className="ii-real-hint-names">{coupleNames}</div>
        </div>
      </div>
    </div>
  );
}
