"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { WEDDING_TEMPLATES } from "@/config/weddingWebsite/templates";
import TemplateLivePreview from "@/components/wedding-website/TemplateLivePreview";

export default function WeddingWebsiteGalleryPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            חזרה
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#C9A962]" />
            <span className="font-black">Invistimo Wedding</span>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 py-16 md:py-24">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#C9A962]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#7C9CFF]/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-xs font-bold uppercase tracking-[0.4em] text-[#C9A962]"
          >
            Premium Collection · Live Preview
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-['Cormorant_Garamond'] text-4xl font-light leading-tight md:text-6xl"
          >
            10 אתרי חתונה
            <br />
            <span className="font-semibold text-white/70">כל אחד עולם אחר לגמרי</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/55 md:text-lg"
          >
            כל תבנית = עיצוב ייחודי, סקשנים שונים, וידאו/תמונה, אנימציות ואפקטים.
            התצוגה למטה היא האתר האמיתי — לא תמונה סטטית.
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
