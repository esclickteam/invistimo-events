"use client";

import Link from "next/link";
import { INTERACTIVE_INVITE_TEMPLATES } from "@/config/interactiveInvites/templates";
import { DEMO_EVENTS } from "@/config/interactiveInvites/demoEvents";
import "./interactive-invites.css";

export default function InteractiveInviteGallery() {
  return (
    <div
      className="min-h-screen"
      dir="rtl"
      lang="he"
      style={{
        background:
          "radial-gradient(ellipse at top, #2a2438 0%, #14121c 45%, #0c0b10 100%)",
        color: "#f4efe6",
        fontFamily: "'Heebo', sans-serif",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Heebo:wght@300;400;500;600;700&display=swap"
      />

      <header className="mx-auto max-w-6xl px-5 pb-8 pt-12 text-center sm:pt-16">
        <p className="mb-3 text-xs font-semibold tracking-[0.35em] text-[#c9b896]">
          INVISTIMO · PREVIEW בלבד
        </p>
        <h1
          className="mb-4 text-4xl font-light sm:text-5xl"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          אתרי הזמנה אינטראקטיביים
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-7 text-[#cfc6b8] sm:text-base">
          קולקציית תבניות עם מעטפה נפתחת, אנימציות גלילה, מוזיקה וחוויית הזמנה מלאה.
          זו סביבת Preview — לא מחוברת למערכת ההזמנות או ללקוחות אמיתיים.
        </p>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {INTERACTIVE_INVITE_TEMPLATES.map((tpl) => {
          const event = DEMO_EVENTS[tpl.id];
          return (
            <article
              key={tpl.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-sm"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tpl.previewImage}
                  alt=""
                  className="h-full w-full object-cover transition duration-700 hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-3 inset-inline-3">
                  <p className="text-[11px] tracking-wide text-[#e8d9b8]">{tpl.name}</p>
                  <h2 className="text-xl font-medium">{tpl.nameHe}</h2>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <p className="text-sm text-[#d2c8b8]">{tpl.tagline}</p>
                <p className="text-xs leading-6 text-[#a89f93]">{tpl.description}</p>
                <p className="text-[11px] text-[#8f877c]">
                  דוגמה: {event.coupleNames} · {event.weddingDateLabel}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-[#cfc6b8]">
                    מעטפה: {tpl.envelope}
                  </span>
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-[#cfc6b8]">
                    תנועה: {tpl.motion}
                  </span>
                </div>
                <Link
                  href={`/preview/interactive-invites/${tpl.id}`}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#f0e6d4] px-4 py-3 text-sm font-semibold text-[#1a1510] transition hover:bg-white"
                >
                  צפייה באתר
                </Link>
              </div>
            </article>
          );
        })}
      </main>

      <footer className="mx-auto max-w-3xl px-5 pb-16 text-center text-xs leading-6 text-[#8f877c]">
        אין Merge ל־main ואין Deploy לפרודקשן ללא אישור מפורש.
        <br />
        חיבור עתידי לעורך INVISTIMO, למוזמנים ולאישורי הגעה — מתוכנן בסכמה, לא פעיל כאן.
      </footer>
    </div>
  );
}
