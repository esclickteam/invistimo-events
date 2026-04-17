"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-40 border-t border-[#e2d6c8] bg-[#f5eee7]">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center gap-10 text-[#6a5440]">
        
        {/* 🔥 בלוק WhatsApp */}
        <div className="text-center">
          <p className="text-[#7b6754] text-sm">
            לכל שאלה אנחנו כאן בשבילכם
          </p>

          <p className="mt-2 font-semibold">שעות הפעילות שלנו:</p>

          <p className="text-sm">
            ימים א׳–ה׳: 09:00–18:00
          </p>

          <p className="text-sm">
            שישי וערבי חג: 09:00–12:00
          </p>

          {/* כפתור וואטסאפ */}
          <a
            href="https://wa.me/972555039072"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-semibold transition"
          >
            <span>לחצו לצ׳אט עם נציג ב-WhatsApp</span>

            <img
              src="/icons/whatsapp.png"
              alt="WhatsApp"
              className="w-5 h-5"
            />
          </a>
        </div>

        {/* ניווט */}
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
          
          <Link
            href="/faq"
            className="hover:underline hover:text-[#5c4632] transition"
          >
            שאלות ותשובות
          </Link>

          <Link
            href="/terms"
            className="hover:underline hover:text-[#5c4632] transition"
          >
            תקנון שימוש
          </Link>

          <Link
            href="/privacy"
            className="hover:underline hover:text-[#5c4632] transition"
          >
            מדיניות פרטיות
          </Link>

          <Link
            href="/accessibility"
            className="hover:underline hover:text-[#5c4632] transition"
          >
            הצהרת נגישות
          </Link>

          <Link
            href="/contact"
            className="hover:underline hover:text-[#5c4632] transition"
          >
            יצירת קשר
          </Link>

        </nav>

        {/* זכויות יוצרים */}
        <p className="text-sm text-center">
          © {new Date().getFullYear()} Invistimo · כל הזכויות שמורות
        </p>
      </div>
    </footer>
  );
}