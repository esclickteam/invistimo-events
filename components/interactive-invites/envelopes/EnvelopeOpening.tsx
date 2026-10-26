"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import type { EnvelopeVariant } from "@/types/interactiveInvite";
import { usePrefersReducedMotion } from "../engine/usePrefersReducedMotion";

type Props = {
  variant: EnvelopeVariant;
  monogram: string;
  dateLabel: string;
  coupleNames: string;
  onOpened: () => void;
};

export default function EnvelopeOpening({
  variant,
  monogram,
  dateLabel,
  coupleNames,
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

    const flap = root.querySelector<HTMLElement>(".ii-envelope-flap");
    const seal = root.querySelector<HTMLElement>(".ii-seal");
    const ribbon = root.querySelector<HTMLElement>(".ii-ribbon");
    const card = root.querySelector<HTMLElement>(".ii-invite-card");
    const body = root.querySelector<HTMLElement>(".ii-envelope-body");
    const scene = root;
    const extras = root.querySelectorAll<HTMLElement>("[data-ii-extra]");

    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => {
        gsap.to(scene, {
          opacity: 0,
          duration: 0.55,
          ease: "power1.out",
          onComplete: finish,
        });
      },
    });

    if (variant === "shell-clasp") {
      tl.to(seal, { scale: 0.2, opacity: 0, duration: 0.35, ease: "back.in(1.4)" }, 0)
        .to(extras, { opacity: 0, y: -12, stagger: 0.05, duration: 0.3 }, 0.05)
        .to(flap!, { rotateX: -160, duration: 0.85, ease: "power3.inOut" }, 0.15)
        .to(card!, { yPercent: -118, scale: 1.04, duration: 0.95, ease: "power3.out" }, 0.35)
        .to([body, flap], { y: 80, opacity: 0.2, duration: 0.55 }, 0.85);
      return;
    }

    if (variant === "deco-diamond") {
      tl.to(seal, { scale: 1.2, opacity: 0, duration: 0.28 }, 0)
        .to(extras, { rotate: 18, opacity: 0, duration: 0.35 }, 0)
        .to(flap!, { rotateX: -175, duration: 0.7, ease: "power4.inOut" }, 0.1)
        .fromTo(
          card!,
          { yPercent: 40, rotate: -2, opacity: 0.85 },
          { yPercent: -125, rotate: 0, opacity: 1, duration: 0.85, ease: "power3.out" },
          0.28
        )
        .to([body, flap], { y: 100, opacity: 0, duration: 0.45 }, 0.8);
      return;
    }

    if (variant === "botanical-wrap") {
      tl.to(extras, { y: -30, opacity: 0, stagger: 0.06, duration: 0.45, ease: "power1.out" }, 0)
        .to(ribbon, { scaleX: 0.2, opacity: 0, duration: 0.4 }, 0.05)
        .to(seal, { y: 20, scale: 0.4, opacity: 0, duration: 0.4 }, 0.1)
        .to(flap!, { rotateX: -150, duration: 0.9 }, 0.2)
        .to(card!, { yPercent: -120, duration: 1, ease: "power2.out" }, 0.4)
        .to([body, flap], { y: 70, opacity: 0.15, duration: 0.5 }, 0.9);
      return;
    }

    if (variant === "wax-twine") {
      tl.to(ribbon, { rotate: 12, y: 18, opacity: 0, duration: 0.45 }, 0)
        .to(seal, { scale: 0.15, rotate: -25, opacity: 0, duration: 0.4, ease: "back.in(2)" }, 0.08)
        .to(flap!, { rotateX: -155, duration: 0.85 }, 0.18)
        .to(card!, { yPercent: -122, rotate: -1.5, duration: 1, ease: "power3.out" }, 0.35)
        .to([body, flap], { y: 90, opacity: 0.1, duration: 0.55 }, 0.85);
      return;
    }

    if (variant === "clay-stamp") {
      tl.to(seal, { scale: 0.3, y: 10, opacity: 0, duration: 0.4 }, 0)
        .to(ribbon, { opacity: 0, duration: 0.3 }, 0.05)
        .to(flap!, { rotateX: -145, duration: 0.9, ease: "power2.inOut" }, 0.15)
        .to(card!, { yPercent: -115, duration: 1.05, ease: "power2.out" }, 0.35)
        .to([body, flap], { y: 75, opacity: 0.2, duration: 0.5 }, 0.9);
      return;
    }

    // classic-flap / lunar silk default
    tl.to(seal, { scale: 0.25, opacity: 0, duration: 0.38, ease: "back.in(1.6)" }, 0)
      .to(ribbon, { opacity: 0, scaleX: 0.6, duration: 0.35 }, 0.05)
      .to(flap!, { rotateX: -158, duration: 0.9, ease: "power3.inOut" }, 0.18)
      .to(card!, { yPercent: -120, duration: 1, ease: "power3.out" }, 0.38)
      .to([body, flap], { y: 85, opacity: 0.15, duration: 0.55 }, 0.88);
  };

  if (reduced) return null;

  return (
    <div className="ii-envelope-scene" ref={rootRef} data-variant={variant}>
      <button type="button" className="ii-skip" onClick={finish}>
        דלגו על הפתיחה
      </button>

      <div
        className="ii-envelope-wrap"
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
        <div className="ii-envelope-body" aria-hidden>
          {variant === "shell-clasp" && (
            <div
              data-ii-extra
              style={{
                position: "absolute",
                inset: "8%",
                borderRadius: "50% 50% 45% 45%",
                border: "1px solid color-mix(in srgb, var(--ii-accent) 35%, transparent)",
                opacity: 0.55,
              }}
            />
          )}
          {variant === "deco-diamond" && (
            <>
              <div
                data-ii-extra
                style={{
                  position: "absolute",
                  inset: "18%",
                  border: "1px solid var(--ii-accent)",
                  transform: "rotate(45deg)",
                  opacity: 0.5,
                }}
              />
              <div
                data-ii-extra
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "12%",
                  width: 1,
                  height: "30%",
                  background: "var(--ii-accent)",
                  opacity: 0.6,
                }}
              />
            </>
          )}
          {variant === "botanical-wrap" && (
            <>
              <Leaf style={{ left: "6%", top: "18%", transform: "rotate(-18deg)" }} />
              <Leaf style={{ right: "8%", top: "22%", transform: "rotate(22deg)" }} />
              <Leaf style={{ left: "12%", bottom: "16%", transform: "rotate(10deg)" }} />
            </>
          )}
        </div>

        <div className="ii-invite-card" aria-hidden>
          <p className="ii-kicker" style={{ marginBottom: 6 }}>
            הזמנה לחתונה
          </p>
          <p className="ii-script" style={{ fontSize: "1.55rem", margin: 0 }}>
            {coupleNames}
          </p>
        </div>

        <div className="ii-envelope-flap" aria-hidden />

        {(variant === "classic-flap" ||
          variant === "clay-stamp" ||
          variant === "botanical-wrap" ||
          variant === "wax-twine" ||
          variant === "shell-clasp") && <div className="ii-ribbon" aria-hidden />}

        {variant === "wax-twine" && (
          <div
            data-ii-extra
            aria-hidden
            style={{
              position: "absolute",
              left: "20%",
              right: "20%",
              top: "42%",
              height: 2,
              zIndex: 5,
              background:
                "repeating-linear-gradient(90deg, var(--ii-ribbon), var(--ii-ribbon) 6px, transparent 6px, transparent 10px)",
              transform: "rotate(-3deg)",
            }}
          />
        )}

        <div className="ii-seal" aria-hidden>
          {variant === "shell-clasp" ? "✦" : monogram}
        </div>

        <div className="ii-open-hint">
          <div style={{ marginBottom: 6, opacity: 0.85 }}>{dateLabel}</div>
          לחצו לפתיחה
        </div>
      </div>
    </div>
  );
}

function Leaf({ style }: { style: CSSProperties }) {
  return (
    <span
      data-ii-extra
      style={{
        position: "absolute",
        width: 28,
        height: 42,
        borderRadius: "60% 40% 60% 40%",
        background:
          "linear-gradient(140deg, color-mix(in srgb, var(--ii-seal) 80%, white), var(--ii-seal))",
        opacity: 0.75,
        zIndex: 3,
        ...style,
      }}
    />
  );
}
