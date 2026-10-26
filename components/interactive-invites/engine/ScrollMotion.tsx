"use client";

import { useEffect, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ScrollMotionStyle } from "@/types/interactiveInvite";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollMotion({
  style,
  enabled,
  children,
}: {
  style: ScrollMotionStyle;
  enabled: boolean;
  children: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!enabled || reduced) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-ii-reveal]").forEach((el) => {
        const y = style === "sharp-reveal" ? 48 : style === "wave-layers" ? 36 : 28;
        gsap.fromTo(
          el,
          { opacity: 0, y, filter: style === "sharp-reveal" ? "blur(4px)" : "none" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: style === "sharp-reveal" ? 0.55 : 0.9,
            ease: style === "sharp-reveal" ? "power3.out" : "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              end: "top 40%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-ii-parallax]").forEach((el) => {
        const speed = Number(el.dataset.iiParallax || 40);
        gsap.to(el, {
          y: speed,
          ease: "none",
          scrollTrigger: {
            trigger: el.parentElement || el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-ii-timeline]").forEach((line) => {
        gsap.fromTo(
          line,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            transformOrigin: "top center",
            scrollTrigger: {
              trigger: line.parentElement || line,
              start: "top 75%",
              end: "bottom 40%",
              scrub: true,
            },
          }
        );
      });

      if (style === "scrapbook-stack") {
        gsap.utils.toArray<HTMLElement>("[data-ii-photo]").forEach((photo, i) => {
          gsap.fromTo(
            photo,
            { rotate: i % 2 === 0 ? -8 : 8, y: 40, opacity: 0 },
            {
              rotate: i % 2 === 0 ? -3 : 3,
              y: 0,
              opacity: 1,
              duration: 0.85,
              ease: "power2.out",
              scrollTrigger: {
                trigger: photo,
                start: "top 90%",
                toggleActions: "play none none reverse",
              },
            }
          );
        });
      }

      if (style === "petal-float" || style === "star-parallax") {
        gsap.utils.toArray<HTMLElement>("[data-ii-float]").forEach((el, i) => {
          gsap.to(el, {
            y: i % 2 === 0 ? -24 : 18,
            x: i % 2 === 0 ? 10 : -12,
            rotation: i % 2 === 0 ? 8 : -6,
            ease: "none",
            scrollTrigger: {
              trigger: el.closest("section") || el,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        });
      }

      if (style === "wave-layers") {
        gsap.utils.toArray<HTMLElement>("[data-ii-wave]").forEach((el, i) => {
          gsap.to(el, {
            xPercent: i % 2 === 0 ? 8 : -8,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        });
      }
    });

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [enabled, reduced, style]);

  return <>{children}</>;
}
