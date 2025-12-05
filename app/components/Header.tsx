"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
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
        
        {/* לוגו */}
        <Link href="/" className="text-2xl font-serif font-bold text-[#3a2f28]">
          Invity
        </Link>

        {/* תפריט */}
        <nav className="hidden md:flex gap-8 text-text-dark font-medium">
          <Link href="#how" className="hover:text-gold transition">איך זה עובד</Link>
          <Link href="#features" className="hover:text-gold transition">מה המערכת נותנת</Link>
          <Link href="#pricing" className="hover:text-gold transition">מחירון</Link>
          <Link href="/login" className="hover:text-gold transition">התחברות</Link>
        </nav>

        {/* כפתור שולחן עבודה */}
        <Link
          href="/login"
          className="hidden md:block btn-gold px-6 py-2 text-sm"
        >
          התחברות
        </Link>

        {/* כפתור מובייל */}
        <div className="md:hidden">
          <Link
            href="/login"
            className="px-4 py-2 rounded-full bg-gold text-white text-sm font-semibold"
          >
            התחברות
          </Link>
        </div>
      </div>
    </header>
  );
}
