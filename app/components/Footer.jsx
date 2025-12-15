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
          <div className="flex items-center gap-6 text-sm">
  <Link href="/terms">תקנון שימוש</Link>
  <Link href="/privacy">מדיניות פרטיות</Link>
  <Link href="/accessibility">הצהרת נגישות</Link>
  <Link href="/contact">יצירת קשר</Link>
</div>

        </nav>

      </div>
    </footer>
  );
}
