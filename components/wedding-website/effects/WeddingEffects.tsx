"use client";

import { motion } from "framer-motion";
import WeddingMedia from "@/components/wedding-website/editable/WeddingMedia";

export default function FloatingParticles({ count = 24 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: `${Math.random() * 100}%`,
    delay: Math.random() * 5,
    duration: 6 + Math.random() * 8,
    size: 2 + Math.random() * 4,
  }));

  return (
    <div className="ww-desktop-fx pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-[var(--ww-accent)]"
          style={{
            left: p.x,
            bottom: "-10%",
            width: p.size,
            height: p.size,
            opacity: 0.35,
          }}
          animate={{
            y: [0, -900],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

export function HeroParallax({ image }: { image: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 scale-110"
        initial={{ scale: 1.15 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <WeddingMedia
          slot="hero"
          src={image}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        />
      </motion.div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--ww-hero-overlay)" }}
      />
    </div>
  );
}

export function ScrollIndicator() {
  return (
    <motion.div
      className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2"
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70">
        גללו
      </span>
      <div className="h-10 w-px bg-gradient-to-b from-white/80 to-transparent" />
    </motion.div>
  );
}
