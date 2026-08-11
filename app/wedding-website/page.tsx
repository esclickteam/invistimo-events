"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { WEDDING_TEMPLATES } from "@/config/weddingWebsite/templates";
import TemplateLivePreview from "@/components/wedding-website/TemplateLivePreview";

export default function WeddingWebsiteGalleryPage() {
  return (
    <div dir="rtl" className="min-h-screen overflow-x-clip bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            חזרה
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#C9A962]" />
            <span className="text-sm font-bold tracking-wide">Invistimo Wedding</span>
          </div>
        </div>
      </header>

      <section className="relative overflow-x-clip px-5 py-16 md:px-8 md:py-24">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#C9A962]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#7C9CFF]/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 text-[11px] font-bold uppercase tracking-[0.35em] text-[#C9A962]"
          >
            Premium Collection · Live Preview
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-['Cormorant_Garamond'] text-[clamp(2.4rem,6vw,4.5rem)] font-light leading-[1.1]"
          >
            10 אתרי חתונה
            <br />
            <span className="font-semibold text-white/70">כל אחד עולם אחר לגמרי</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/55 md:text-lg"
          >
            עיצוב ייחודי לכל תבנית — בלי scrollbar מיותר, עם מדיה תקינה וחוויה פרימיום.
          </motion.p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {WEDDING_TEMPLATES.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: index * 0.05, duration: 0.7 }}
            >
              <TemplateLivePreview template={template} index={index} />
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
