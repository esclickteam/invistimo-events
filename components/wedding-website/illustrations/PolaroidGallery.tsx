"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { sanitizeGallery, WW_IMAGES } from "@/config/weddingWebsite/media";
import { EditableImage, useWeddingEdit } from "../editor/EditablePrimitives";
import { SafeImage } from "../shared/SafeMedia";

type Orient = "portrait" | "landscape";

const PORTRAIT_POOL = [WW_IMAGES.kiss, WW_IMAGES.beachCouple];
const LANDSCAPE_POOL = [
  WW_IMAGES.florals,
  WW_IMAGES.bouquet,
  WW_IMAGES.outdoorCouple,
  WW_IMAGES.venueArch,
  WW_IMAGES.softPortrait,
  WW_IMAGES.aisleWalk,
  WW_IMAGES.tableSetting,
  WW_IMAGES.celebration,
];

function useImageOrient(src: string): Orient | "unknown" {
  const [orient, setOrient] = useState<Orient | "unknown">("unknown");
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
      setOrient(ratio >= 1 ? "landscape" : "portrait");
    };
    img.onerror = () => {
      if (!cancelled) setOrient("portrait");
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return orient;
}

/** Prefer matching photo orientation to the card slot (portrait↔portrait). */
function matchGalleryToSlots(images: string[], slotOrients: Orient[]): string[] {
  const remaining = [...sanitizeGallery(images)];
  const used = new Set<string>();
  const out: string[] = [];

  const take = (prefer: Orient, fallbackIndex: number) => {
    const hit = remaining.find((src) => {
      if (used.has(src)) return false;
      const isPortrait = PORTRAIT_POOL.includes(src as (typeof PORTRAIT_POOL)[number]);
      const isLandscape = LANDSCAPE_POOL.includes(src as (typeof LANDSCAPE_POOL)[number]);
      if (prefer === "portrait" && isPortrait) return true;
      if (prefer === "landscape" && isLandscape) return true;
      return false;
    });
    if (hit) {
      used.add(hit);
      return hit;
    }
    const next =
      remaining.find((s) => !used.has(s)) ||
      (prefer === "portrait"
        ? PORTRAIT_POOL[fallbackIndex % PORTRAIT_POOL.length]
        : LANDSCAPE_POOL[fallbackIndex % LANDSCAPE_POOL.length]);
    used.add(next);
    return next;
  };

  slotOrients.forEach((orient, i) => {
    out.push(take(orient, i));
  });
  return out;
}

function PolaroidCard({
  src,
  index,
  accent,
  rotation,
  reduce,
  forcedOrient,
}: {
  src: string;
  index: number;
  accent: string;
  rotation: number;
  reduce: boolean | null;
  forcedOrient: Orient;
}) {
  const detected = useImageOrient(src);
  const edit = useWeddingEdit();
  // Card orientation follows the slot (and swaps if the photo clearly mismatches).
  const orient: Orient =
    detected === "unknown"
      ? forcedOrient
      : detected === forcedOrient
        ? forcedOrient
        : detected;
  const aspect = orient === "landscape" ? "aspect-[5/4]" : "aspect-[4/5]";

  return (
    <motion.figure
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 40, rotate: rotation * 2 }}
      whileInView={{ opacity: 1, y: 0, rotate: rotation }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.1, duration: 0.65, ease: "easeOut" }}
      className="bg-white p-2 pb-7 shadow-[0_18px_40px_rgba(180,80,100,0.14)]"
      style={{ border: `1px solid ${accent}33` }}
      data-ww-orient={orient}
    >
      <div className={`relative overflow-hidden bg-[#f3e7ea] ${aspect}`}>
        {edit?.enabled ? (
          <EditableImage
            field="galleryUrls"
            index={index}
            src={src}
            className="absolute inset-0 !h-full !w-full"
            style={{ position: "absolute", inset: 0, height: "100%", width: "100%" }}
          />
        ) : (
          <SafeImage
            src={src}
            alt=""
            className="ww-media-fill absolute inset-0 h-full w-full object-cover"
            style={{
              position: "absolute",
              inset: 0,
              height: "100%",
              width: "100%",
              objectFit: "cover",
            }}
          />
        )}
      </div>
    </motion.figure>
  );
}

/**
 * Polaroids that match card orientation to each photo
 * (portrait cards ↔ portrait photos, landscape ↔ landscape).
 */
export default function PolaroidGallery({
  images,
  accent = "#E8788A",
}: {
  images: string[];
  accent?: string;
}) {
  const reduce = useReducedMotion();
  const rotations = [-6, 4, -3, 5, -5, 3, -4, 2];
  const slotOrients = useMemo<Orient[]>(
    () =>
      Array.from({ length: Math.max(sanitizeGallery(images).length, 6) }, (_, i) =>
        i % 2 === 0 ? "portrait" : "landscape"
      ).slice(0, Math.min(8, Math.max(sanitizeGallery(images).length, 6))),
    [images]
  );
  const matched = useMemo(
    () => matchGalleryToSlots(images, slotOrients),
    [images, slotOrients]
  );

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-2 items-start gap-4 md:grid-cols-3 md:gap-6">
      {matched.map((src, i) => (
        <PolaroidCard
          key={`${src}-${i}`}
          src={src}
          index={i}
          accent={accent}
          rotation={rotations[i % rotations.length]}
          reduce={reduce}
          forcedOrient={slotOrients[i] || "portrait"}
        />
      ))}
    </div>
  );
}
