"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import type { ReactNode } from "react";
import { useEaseMobileScroll } from "./shared/weddingMotion";

type Props = {
  id: string;
  className?: string;
  children: ReactNode;
  fullHeight?: boolean;
};

export default function AnimatedSection({
  id,
  className = "",
  children,
  fullHeight = false,
}: Props) {
  const ease = useEaseMobileScroll();
  const { ref, inView } = useInView({
    threshold: 0.12,
    triggerOnce: true,
    skip: ease,
  });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={ease ? false : { opacity: 0, y: 48 }}
      animate={ease || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 48 }}
      transition={{ duration: ease ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
      className={`ww-section ${fullHeight ? "min-h-screen" : ""} ${className}`}
    >
      {children}
    </motion.section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={`mb-10 md:mb-14 ${center ? "text-center" : "text-right"}`}>
      {eyebrow ? (
        <p className="ww-eyebrow mb-3 text-xs font-bold uppercase tracking-[0.35em] text-[var(--ww-accent)]">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className="ww-display text-3xl font-light leading-tight md:text-5xl"
        style={{ fontFamily: "var(--ww-font-display)" }}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--ww-text-muted)] md:text-lg">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`ww-card rounded-[var(--ww-radius)] border border-[var(--ww-border)] bg-[var(--ww-surface)] p-6 shadow-[var(--ww-shadow)] backdrop-blur-xl md:p-8 ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
