"use client";

/**
 * Friends drinking scene — premium line illustration + bottle liquid scrubbed by scroll.
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  artSrc: string;
  caption?: string;
};

export default function FriendsDrinkingScene({
  artSrc,
  caption = "חברים סביב השולחן — גללו ותראו איך הבקבוק מתרוקן",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const liquid = root.querySelector<HTMLElement>("[data-drink-liquid]");
    if (!liquid) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        liquid,
        { scaleY: 1 },
        {
          scaleY: 0.04,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top 78%",
            end: "bottom 38%",
            scrub: 0.9,
          },
        }
      );
    }, root);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div className="iw-drink" ref={rootRef}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={artSrc} alt="חברים שותים יחד" className="iw-drink-art" loading="lazy" />
      <div className="iw-drink-bottle" aria-hidden>
        <div className="iw-drink-bottle-glass">
          <div className="iw-drink-liquid" data-drink-liquid />
        </div>
      </div>
      <p className="iw-drink-caption">{caption}</p>
    </div>
  );
}
