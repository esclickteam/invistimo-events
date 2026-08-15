"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { WW_IMAGES } from "@/config/weddingWebsite/media";

/** Shared romantic photo stage — real wedding imagery + continuous motion. */
function SceneStage({
  src,
  accent,
  className = "",
  children,
  kenBurns = true,
}: {
  src: string;
  accent: string;
  className?: string;
  children?: ReactNode;
  kenBurns?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`relative mx-auto w-full max-w-2xl overflow-hidden rounded-[1.75rem] shadow-[0_20px_50px_rgba(36,26,20,0.14)] ${className}`}
      aria-hidden
      style={{ minHeight: 220 }}
    >
      <motion.img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ height: "100%", width: "100%", objectFit: "cover" }}
        initial={false}
        animate={
          reduce || !kenBurns
            ? { scale: 1.05 }
            : { scale: [1.05, 1.14, 1.05], x: [0, -8, 0] }
        }
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${accent}22 0%, transparent 38%, rgba(20,14,10,0.55) 100%)`,
        }}
      />
      {/* Floating light orbs */}
      {!reduce
        ? [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute h-2 w-2 rounded-full bg-white/70"
              style={{ left: `${18 + i * 28}%`, bottom: 28 }}
              animate={{ y: [0, -70, -120], opacity: [0, 0.9, 0] }}
              transition={{
                duration: 3.8 + i * 0.4,
                repeat: Infinity,
                delay: i * 0.7,
                ease: "easeOut",
              }}
            />
          ))
        : null}
      <div className="relative z-10 flex min-h-[220px] flex-col justify-end p-5 text-white">
        {children}
      </div>
    </div>
  );
}

/** Bride & groom approach under a chuppah — photo + continuous motion. */
export default function ChuppahMeet({
  accent = "#B8844F",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={`relative mx-auto w-full max-w-2xl ${className}`} aria-hidden>
      <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-[1.75rem]">
        <motion.div
          className="relative min-h-[200px] overflow-hidden"
          initial={reduce ? false : { x: -40, opacity: 0.6 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: false, amount: 0.4 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        >
          <motion.img
            src={WW_IMAGES.kiss}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectFit: "cover", height: "100%", width: "100%" }}
            animate={reduce ? undefined : { scale: [1.08, 1.15, 1.08] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
        <motion.div
          className="relative min-h-[200px] overflow-hidden"
          initial={reduce ? false : { x: 40, opacity: 0.6 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: false, amount: 0.4 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        >
          <motion.img
            src={WW_IMAGES.aisleWalk}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectFit: "cover", height: "100%", width: "100%" }}
            animate={reduce ? undefined : { scale: [1.1, 1.04, 1.1] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
      {/* Center chuppah badge */}
      <motion.div
        className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full px-5 py-3 text-center text-xs font-black text-white shadow-xl"
        style={{ background: accent }}
        animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        נפגשים תחת החופה
      </motion.div>
      <div
        className="pointer-events-none absolute inset-0 rounded-[1.75rem]"
        style={{
          boxShadow: `inset 0 0 0 2px ${accent}55`,
        }}
      />
    </div>
  );
}

export function BuffetSpread({
  accent = "#B8844F",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  return (
    <SceneStage src={WW_IMAGES.tableSetting} accent={accent} className={className}>
      <motion.p
        className="text-lg font-semibold drop-shadow"
        animate={{ opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        שולחנות האירוע נפרסים
      </motion.p>
      <p className="mt-1 text-sm text-white/85">אווירת חגיגה · כיבוד · שמחה</p>
    </SceneStage>
  );
}

export function DanceParty({
  accent = "#B8844F",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <SceneStage src={WW_IMAGES.celebration} accent={accent} className={className}>
      {!reduce
        ? ["♪", "♫", "♪"].map((n, i) => (
            <motion.span
              key={i}
              className="absolute text-2xl text-white/80"
              style={{ right: 24 + i * 36, bottom: 90 }}
              animate={{ y: [0, -40, 0], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.35 }}
            >
              {n}
            </motion.span>
          ))
        : null}
      <p className="text-lg font-semibold drop-shadow">רוקדים יחד כל הלילה</p>
      <p className="mt-1 text-sm text-white/85">רחבת הריקודים פתוחה</p>
    </SceneStage>
  );
}

export function ProposalKneel({
  accent = "#B8844F",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <SceneStage src={WW_IMAGES.ringsHands} accent={accent} className={className}>
      {!reduce
        ? [0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="absolute text-lg"
              style={{ left: `${20 + i * 18}%`, top: 28 }}
              animate={{ y: [0, -16, 0], opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.4 }}
            >
              ♥
            </motion.span>
          ))
        : null}
      <p className="text-lg font-semibold drop-shadow">הרגע של ההצעה</p>
      <p className="mt-1 text-sm text-white/85">כריעה על ברך — והתשובה הייתה כן</p>
    </SceneStage>
  );
}

export function HowWeMetPaths({
  accent = "#B8844F",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={`relative mx-auto w-full max-w-2xl ${className}`} aria-hidden>
      <div className="relative overflow-hidden rounded-[1.75rem]" style={{ minHeight: 200 }}>
        <motion.img
          src={WW_IMAGES.outdoorCouple}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectFit: "cover", height: "100%", width: "100%" }}
          animate={reduce ? undefined : { scale: [1.06, 1.12, 1.06] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${accent}99 0%, transparent 45%, ${accent}99 100%)`,
          }}
        />
        <motion.div
          className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/95 px-4 py-2 text-xs font-black shadow"
          style={{ color: accent }}
          animate={reduce ? undefined : { x: [0, 18, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          הוא
        </motion.div>
        <motion.div
          className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/95 px-4 py-2 text-xs font-black shadow"
          style={{ color: accent }}
          animate={reduce ? undefined : { x: [0, -18, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          היא
        </motion.div>
        <motion.div
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full px-5 py-3 text-xs font-black text-white shadow-xl"
          style={{ background: accent }}
          animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          נפגשנו כאן
        </motion.div>
      </div>
    </div>
  );
}
