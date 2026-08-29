"use client";

import { motion, useReducedMotion } from "framer-motion";
import { sanitizeGallery } from "@/config/weddingWebsite/media";
import { SafeImage } from "../shared/SafeMedia";

/** Minimal Noir — editorial film-strip transitions */
export default function FilmStripGallery({
  images,
}: {
  images: string[];
}) {
  const reduce = useReducedMotion();
  const safe = sanitizeGallery(images);

  return (
    <div className="overflow-hidden border-y border-black/20 bg-black py-4">
      <div className="flex gap-3 px-3">
        {safe.map((src, i) => (
          <motion.div
            key={`${src}-${i}`}
            initial={reduce ? { opacity: 1 } : { opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.08, duration: 0.55, ease: "easeOut" }}
            className="relative w-[42vw] max-w-[220px] shrink-0 border border-white/20 bg-neutral-900 p-2"
          >
            <div className="mb-1 flex justify-between px-1">
              {Array.from({ length: 6 }).map((_, d) => (
                <span key={d} className="h-1.5 w-2.5 rounded-[1px] bg-white/35" />
              ))}
            </div>
            <div className="aspect-[3/4] overflow-hidden">
              <SafeImage src={src} alt="" className="h-full w-full object-cover grayscale" />
            </div>
            <div className="mt-1 flex justify-between px-1">
              {Array.from({ length: 6 }).map((_, d) => (
                <span key={d} className="h-1.5 w-2.5 rounded-[1px] bg-white/35" />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
