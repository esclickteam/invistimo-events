"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all ${
        scrolled
          ? "bg-cream/95 backdrop-blur border-b border-gold-soft shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

        {/* לוגו בצד שמאל */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold text-white flex items-center justify-center font-bold shadow-md">
            in
          </div>
          <span className="text-2xl font-serif font-bold text-[#3a2f28]">
            Invistimo
          </span>
        </Link>

        {/* תפריט במרכז */}
        <nav className="hidden md:flex gap-10 text-text-dark font-medium mx-auto">
          <Link href="#how" className="hover:text-gold transition">
            איך זה עובד
          </Link>
          <Link href="#features" className="hover:text-gold transition">
            מה המערכת נותנת
          </Link>
          <Link href="#pricing" className="hover:text-gold transition">
            מחירון
          </Link>
        </nav>

        {/* כפתור התחברות בצד ימין */}
        <Link
          href="/login"
          className="hidden md:block px-6 py-2 rounded-full bg-gold text-white font-semibold shadow-md hover:bg-gold-dark transition"
        >
          התחברות
        </Link>

        {/* כפתור מובייל */}
        <div className="md:hidden">
          <Link
            href="/login"
            className="px-4 py-2 rounded-full bg-gold text-white text-sm font-semibold shadow"
          >
            התחברות
          </Link>
        </div>
      </div>
    </header>
  );
}
