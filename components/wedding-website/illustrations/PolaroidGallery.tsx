"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Sunset Blush — polaroids entering one by one */
export default function PolaroidGallery({
  images,
  accent = "#E8788A",
}: {
  images: string[];
  accent?: string;
}) {
  const reduce = useReducedMotion();
  const rotations = [-6, 4, -3, 5, -5, 3];

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
      {images.map((src, i) => (
        <motion.figure
          key={src}
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 40, rotate: rotations[i % rotations.length] * 2 }}
          whileInView={{ opacity: 1, y: 0, rotate: rotations[i % rotations.length] }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: i * 0.1, duration: 0.65, ease: "easeOut" }}
          className="bg-white p-2 pb-8 shadow-[0_18px_40px_rgba(180,80,100,0.14)]"
          style={{ border: `1px solid ${accent}33` }}
        >
          <div className="aspect-[4/5] overflow-hidden bg-[#f3e7ea]">
            <img src={src} alt="" className="h-full w-full object-cover" />
          </div>
        </motion.figure>
      ))}
    </div>
  );
}
