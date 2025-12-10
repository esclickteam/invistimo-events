"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header
      dir="ltr"
      className="
        fixed top-0 left-0 w-full z-50
        bg-[#f5eee7]
        bg-[url('/noise.png')] bg-repeat
        border-b border-[#e2d6c8]
        shadow-sm
      "
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* ====================== תפריט — צד ימין ====================== */}
        <div className="flex items-center gap-10">
          <nav className="hidden md:flex gap-8 text-[#4a413a] font-medium">
            <Link href="#how" className="hover:text-gold transition">
              איך זה עובד
            </Link>
            <Link href="#features" className="hover:text-gold transition">
              מה מקבלים
            </Link>
            <Link href="#pricing" className="hover:text-gold transition">
              חבילות
            </Link>
          </nav>

          {/* כפתור התחברות */}
          <Link
            href="/login"
            className="
              hidden md:block px-6 py-2 rounded-full
              bg-gold text-white font-semibold shadow-md
              hover:bg-gold-dark transition
            "
          >
            התחברות
          </Link>
        </div>

        {/* ====================== לוגו — צד שמאל ====================== */}
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl font-serif font-bold text-[#3a2f28]">
            Invity
          </span>

          <div className="w-10 h-10 rounded-full bg-gold text-white flex items-center justify-center font-bold shadow-md">
            in
          </div>
        </Link>

      </div>
    </header>
  );
}
