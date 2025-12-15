"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-40 border-t border-[#e2d6c8] bg-[#f5eee7]">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-[#6a5440]">
        
        {/* זכויות יוצרים */}
        <p className="text-sm text-center md:text-right">
          © {new Date().getFullYear()} Invistimo · כל הזכויות שמורות
        </p>

        {/* ניווט משפטי ומידע */}
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
      </div>
    </footer>
  );
}
