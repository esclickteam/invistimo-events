"use client";

/**
 * Scroll-driven "friends drinking" scene — people (not animals).
 * Bottle liquid level is scrubbed by GSAP ScrollTrigger as the section scrolls.
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  accent: string;
  ink: string;
  caption?: string;
};

export default function FriendsDrinkingScene({
  accent,
  ink,
  caption = "הדייט הראשון — והבקבוק מתרוקן יחד איתנו",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const liquid = root.querySelector<SVGElement>("[data-drink-liquid]");
    const bubbles = root.querySelectorAll<SVGElement>("[data-drink-bubble]");
    if (!liquid) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        liquid,
        { scaleY: 1 },
        {
          scaleY: 0.05,
          transformOrigin: "50% 100%",
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top 75%",
            end: "bottom 35%",
            scrub: 0.85,
          },
        }
      );

      bubbles.forEach((b, i) => {
        gsap.to(b, {
          opacity: 0,
          y: -8 - i * 4,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top 70%",
            end: "center 40%",
            scrub: true,
          },
        });
      });
    }, root);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div className="iw-drink" ref={rootRef} aria-hidden={false}>
      <svg viewBox="0 0 320 240" role="img" aria-label="חברים שותים יחד — הבקבוק מתרוקן בגלילה">
        <title>חברים שותים</title>
        {/* Table */}
        <ellipse cx="160" cy="210" rx="120" ry="12" fill={accent} opacity="0.18" />
        <path d="M40 208 H280" stroke={ink} strokeWidth="1.2" opacity="0.35" />

        {/* Friend 1 — left, raising glass */}
        <g stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="78" cy="78" r="16" />
          <path d="M78 94 v38" />
          <path d="M78 118 c-18 8 -28 22 -30 36" />
          <path d="M78 118 c12 10 22 20 26 34" />
          {/* raised arm + glass */}
          <path d="M78 108 c-22 -18 -34 -28 -42 -22" />
          <path d="M28 78 h18 v22 h-18 z" />
          <path d="M37 100 v10" />
          <ellipse cx="37" cy="112" rx="7" ry="3" />
        </g>
        {/* liquid in left glass — static sip */}
        <rect x="30" y="88" width="14" height="10" fill={accent} opacity="0.55" rx="1" />

        {/* Friend 2 — center, pouring from bottle */}
        <g stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="160" cy="72" r="17" />
          <path d="M160 89 v42" />
          <path d="M160 116 c-20 10 -32 24 -34 40" />
          <path d="M160 116 c18 10 30 24 34 40" />
          {/* arm holding bottle */}
          <path d="M160 104 c28 -6 42 -4 52 10" />
        </g>

        {/* Wine bottle (tilted) */}
        <g transform="translate(210 78) rotate(28)">
          <path
            d="M-10 8 h20 v48 c0 10 -4 16 -10 16 s-10 -6 -10 -16 z"
            stroke={ink}
            strokeWidth="1.5"
            fill="none"
          />
          <path d="M-4 8 v-14 h8 v14" stroke={ink} strokeWidth="1.5" fill="none" />
          <rect x="-3" y="-18" width="6" height="6" rx="1" stroke={ink} strokeWidth="1.2" fill="none" />
          {/* Liquid that empties on scroll */}
          <defs>
            <clipPath id="iw-bottle-clip">
              <path d="M-9 10 h18 v46 c0 9 -3.5 14 -9 14 s-9 -5 -9 -14 z" />
            </clipPath>
          </defs>
          <g clipPath="url(#iw-bottle-clip)">
            <rect
              data-drink-liquid
              x="-9"
              y="12"
              width="18"
              height="56"
              fill={accent}
              opacity="0.72"
            />
            <circle data-drink-bubble cx="-2" cy="40" r="1.6" fill="#fff" opacity="0.55" />
            <circle data-drink-bubble cx="3" cy="52" r="1.2" fill="#fff" opacity="0.45" />
            <circle data-drink-bubble cx="0" cy="28" r="1.1" fill="#fff" opacity="0.4" />
          </g>
        </g>

        {/* Friend 3 — right, toasting */}
        <g stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="250" cy="80" r="15" />
          <path d="M250 95 v36" />
          <path d="M250 116 c-16 10 -26 24 -28 38" />
          <path d="M250 116 c14 8 24 20 28 36" />
          <path d="M250 108 c18 -14 28 -22 34 -14" />
          <path d="M278 84 h16 v20 h-16 z" />
          <path d="M286 104 v8" />
          <ellipse cx="286" cy="114" rx="6" ry="2.5" />
        </g>
        <rect x="280" y="92" width="12" height="10" fill={accent} opacity="0.5" rx="1" />

        {/* Soft stream from bottle toward center glass hint */}
        <path
          d="M225 118 c-10 14 -22 24 -34 28"
          stroke={accent}
          strokeWidth="1.2"
          strokeDasharray="3 4"
          opacity="0.35"
          fill="none"
        />
      </svg>
      <p className="iw-drink-caption">{caption}</p>
    </div>
  );
}
