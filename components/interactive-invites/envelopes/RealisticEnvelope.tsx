"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "../engine/usePrefersReducedMotion";

const ASSETS = {
  linen: "/interactive-invites/lunar-silk/stage-linen.webp",
  grain: "/interactive-invites/lunar-silk/paper-grain.webp",
  pocket: "/interactive-invites/lunar-silk/pocket-photo.webp",
  flap: "/interactive-invites/lunar-silk/flap-photo.webp",
  envelope: "/interactive-invites/lunar-silk/envelope-photo.webp",
  ribbon: "/interactive-invites/lunar-silk/silk-ribbon.webp",
  seal: "/interactive-invites/lunar-silk/wax-seal.webp",
  sprig: "/interactive-invites/lunar-silk/sprig.webp",
  card: "/interactive-invites/lunar-silk/invite-card.webp",
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
        y: -3,
        rotation: 0.6,
        duration: 2.4,
        ease: "sine.inOut",
      }, 0)
      .to(root.querySelector(".ii-real-ribbon"), {
        y: 2,
        duration: 2.8,
        ease: "sine.inOut",
      }, 0)
      .to(root.querySelector(".ii-real-sprig"), {
        rotation: 2,
        duration: 3.2,
        ease: "sine.inOut",
      }, 0)
      .to(root.querySelector(".ii-real-hint-pulse"), {
        opacity: 0.45,
        duration: 1.6,
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
    const ribbon = root.querySelector<HTMLElement>(".ii-real-ribbon");
    const sprig = root.querySelector<HTMLElement>(".ii-real-sprig");
    const flap = root.querySelector<HTMLElement>(".ii-real-flap");
    const card = root.querySelector<HTMLElement>(".ii-real-card");
    const pocket = root.querySelector<HTMLElement>(".ii-real-pocket");
    const back = root.querySelector<HTMLElement>(".ii-real-back");
    const closedPlate = root.querySelector<HTMLElement>(".ii-real-closed-plate");
    const hint = root.querySelector<HTMLElement>(".ii-real-hint");
    const glow = root.querySelector<HTMLElement>(".ii-real-glow");

    gsap.killTweensOf([seal, ribbon, sprig, flap, card, pocket, back, closedPlate]);

    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => {
        gsap.to(root, {
          opacity: 0,
          duration: 0.65,
          ease: "power1.out",
          onComplete: finish,
        });
      },
    });

    tl.to(hint, { opacity: 0, y: 12, duration: 0.25 }, 0)
      .to(
        seal,
        {
          y: -28,
          scale: 0.55,
          rotate: -18,
          opacity: 0,
          duration: 0.55,
          ease: "back.in(1.7)",
        },
        0.05
      )
      .to(
        sprig,
        { y: -40, x: 18, rotate: 18, opacity: 0, duration: 0.5, ease: "power2.in" },
        0.08
      )
      .to(
        ribbon,
        {
          scaleX: 1.15,
          y: 24,
          opacity: 0,
          filter: "blur(2px)",
          duration: 0.55,
          ease: "power2.in",
        },
        0.12
      )
      .to(closedPlate, { opacity: 0, duration: 0.35 }, 0.18)
      .set([back, pocket, flap, card], { visibility: "visible" }, 0.2)
      .fromTo(
        [back, pocket],
        { opacity: 0 },
        { opacity: 1, duration: 0.3 },
        0.2
      )
      .fromTo(card, { opacity: 0.85 }, { opacity: 1, duration: 0.2 }, 0.22)
      .to(
        flap,
        {
          rotateX: -168,
          duration: 1.05,
          ease: "power3.inOut",
        },
        0.28
      )
      .to(glow, { opacity: 0.55, duration: 0.6 }, 0.45)
      .to(
        card,
        {
          yPercent: -128,
          rotate: -1.2,
          scale: 1.06,
          z: 80,
          duration: 1.2,
          ease: "power3.out",
        },
        0.55
      )
      .to(
        card,
        {
          rotate: 0,
          scale: 1.12,
          duration: 0.55,
          ease: "power2.out",
        },
        1.35
      )
      .to(
        [pocket, back, flap],
        {
          y: 110,
          opacity: 0,
          duration: 0.7,
          ease: "power2.in",
        },
        1.45
      )
      .to(
        card,
        {
          scale: 1.35,
          yPercent: -145,
          filter: "blur(1px)",
          opacity: 0.15,
          duration: 0.7,
          ease: "power2.inOut",
        },
        1.7
      );
  };

  if (reduced) return null;

  return (
    <div
      className="ii-real-scene"
      ref={rootRef}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(243,238,228,0.55), rgba(230,221,208,0.75)), url(${ASSETS.linen})`,
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
        {/* Closed photoreal plate — shown until open starts */}
        <div className="ii-real-closed-plate" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.envelope} alt="" className="ii-real-closed-img" draggable={false} />
        </div>

        {/* Layered physical envelope — revealed during open */}
        <div className="ii-real-stack" aria-hidden>
          <div className="ii-real-back">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSETS.pocket} alt="" draggable={false} />
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSETS.pocket} alt="" draggable={false} />
            <div className="ii-real-pocket-shade" />
          </div>

          <div className="ii-real-flap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSETS.flap} alt="" draggable={false} />
            <div className="ii-real-flap-edge" />
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.ribbon}
          alt=""
          className="ii-real-ribbon"
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
