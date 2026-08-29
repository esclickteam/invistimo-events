"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { WEDDING_TEMPLATES } from "@/config/weddingWebsite/templates";
import TemplateHeroCard from "@/components/wedding-website/TemplateHeroCard";

export default function WeddingWebsiteGalleryPage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen overflow-x-clip bg-[linear-gradient(180deg,#FFFDF9_0%,#F7F1E8_45%,#F3EBE0_100%)] text-[#2A2118]"
    >
      <header className="sticky top-0 z-40 border-b border-[#E8DFD2]/80 bg-[#FFFDF9]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-3">
            <span
              className="text-xl font-light tracking-wide text-[#2A2118]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Invistimo Wedding
            </span>
            <span className="hidden text-xs font-bold text-[#A09080] sm:inline">
              אוסף תבניות פרימיום
            </span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-[#E0D4C4] bg-white px-4 py-2 text-sm font-bold text-[#6E6256] transition hover:border-[#D4AF7A]"
          >
            לדשבורד
            <ArrowRight className="h-4 w-4 rotate-180" />
          </Link>
        </div>
      </header>

      <section className="relative overflow-x-clip px-5 pb-10 pt-14 md:px-8 md:pb-14 md:pt-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(201,169,98,0.18),_transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-[11px] font-black uppercase tracking-[0.32em] text-[#B8844F]"
          >
            Wedding Website Collection
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-[clamp(2.4rem,5.5vw,4.2rem)] font-light leading-[1.12] text-[#2A2118]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            בחרו את האווירה
            <br />
            <span className="font-semibold text-[#8A7560]">של אתר החתונה שלכם</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#6E6256] md:text-lg"
          >
            כל כרטיס מציג את ה-Hero האמיתי של התבנית — טיפוגרפיה, צבעים, מדיה וכפתורים —
            לפני שבוחרים ומתחילים לערוך.
          </motion.p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2
              className="text-2xl font-light text-[#2A2118] md:text-3xl"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              10 תבניות ייחודיות
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#8A7560]">
              לחיצה על «תצוגה מקדימה» פותחת את האתר המלא עם נתוני דוגמה
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-2">
          {WEDDING_TEMPLATES.map((template, index) => (
            <TemplateHeroCard key={template.id} template={template} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
}
