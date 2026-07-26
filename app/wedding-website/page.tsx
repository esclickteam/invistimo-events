"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { WEDDING_TEMPLATES } from "@/config/weddingWebsite/templates";

export default function WeddingWebsiteGalleryPage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FAF7F2] text-[#2A2118]"
    >
      <header className="border-b border-[#E8D5A8]/40 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-[#8A7560] transition hover:text-[#2A2118]"
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
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#E8D5A8]/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#C9A962]/20 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-xs font-bold uppercase tracking-[0.4em] text-[#C9A962]"
          >
            Premium Collection
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-['Cormorant_Garamond'] text-4xl font-light leading-tight md:text-6xl"
          >
            10 תבניות לאתר חתונה
            <br />
            <span className="font-semibold text-[#8A7560]">ברמה הכי גבוהה</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#8A7560] md:text-lg"
          >
            20 סקשנים, אנימציות, גaleria, RSVP, העלאת תמונות וסרטונים מהאורחים —
            תצוגה מקדימה עצמאית, ללא חיבור למערכת הקיימת.
          </motion.p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-2">
          {WEDDING_TEMPLATES.map((template, index) => (
            <motion.article
              key={template.id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: index * 0.06, duration: 0.6 }}
              className="ww-template-card group"
            >
              <Link
                href={`/wedding-website/${template.id}`}
                className="block overflow-hidden rounded-[32px] border border-[#E8D5A8]/50 bg-white shadow-[0_24px_80px_rgba(92,65,35,0.1)] transition hover:-translate-y-1 hover:shadow-[0_32px_100px_rgba(92,65,35,0.16)]"
              >
                <div className="ww-template-preview relative aspect-[16/10] overflow-hidden">
                  <img
                    src={template.previewImage}
                    alt={template.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 right-0 left-0 p-6 text-white">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/70">
                      Template {String(index + 1).padStart(2, "0")}
                    </p>
                    <h2 className="font-['Cormorant_Garamond'] text-3xl font-semibold">
                      {template.name}
                    </h2>
                    <p className="mt-1 text-sm text-white/80">{template.tagline}</p>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm leading-relaxed text-[#8A7560]">{template.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["20 סקשנים", "אנימציות", "RSVP", "העלאת מדיה"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[#E8D5A8] bg-[#FFF9EF] px-3 py-1 text-[11px] font-bold text-[#B8844F]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#C9A962]">
                    צפייה בתבנית
                    <span className="transition group-hover:translate-x-[-4px]">←</span>
                  </span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  );
}
