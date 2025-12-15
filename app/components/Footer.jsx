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

        {/* קישורים משפטיים */}
        <nav className="flex items-center gap-6 text-sm">
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

          <Link href="/accessibility">הצהרת נגישות</Link>

        </nav>

      </div>
    </footer>
  );
}
