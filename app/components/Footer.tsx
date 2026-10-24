"use client";

import Link from "next/link";
import { Clock3, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  const isStaffPage = pathname === "/staff" || pathname?.startsWith("/staff/");
  const isWeddingWebsite =
    pathname === "/w" ||
    pathname?.startsWith("/w/") ||
    pathname === "/wedding-website" ||
    pathname?.startsWith("/wedding-website/");

  if (isStaffPage || isWeddingWebsite) {
    return null;
  }

  return (
    <footer dir="rtl" className="border-t border-white/10 bg-[#0B0E13] text-white">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="font-display text-4xl tracking-[0.08em] md:text-5xl">Invistimo</p>
            <p className="mt-4 max-w-lg text-base leading-8 text-white/65">
              מערכת ישראלית לאישורי הגעה, הזמנות דיגיטליות, אתר חתונה, הושבה והודעות לאורחים —
              ממסע האורח ועד יום האירוע.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/70">
              <a
                href="https://wa.me/972525599901"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-white/20 px-4 py-2 transition hover:border-[#7DD3C8] hover:text-[#7DD3C8]"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
              <a
                href="mailto:support@invistimo.com"
                className="inline-flex items-center gap-2 border border-white/20 px-4 py-2 transition hover:border-[#7DD3C8] hover:text-[#7DD3C8]"
              >
                <Mail size={16} /> support@invistimo.com
              </a>
              <span className="inline-flex items-center gap-2 border border-white/20 px-4 py-2">
                <Clock3 size={16} /> א׳–ה׳ 09:00–18:00
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="font-bold text-[#7DD3C8]">מוצר</p>
              <ul className="mt-3 space-y-2 text-white/70">
                <li><Link href="/rsvp" className="hover:text-white">אישורי הגעה</Link></li>
                <li><Link href="/invitations/chatuna" className="hover:text-white">הזמנות</Link></li>
                <li><Link href="/wedding-website" className="hover:text-white">אתר חתונה</Link></li>
                <li><Link href="/seating-explained" className="hover:text-white">הושבה</Link></li>
                <li><Link href="/pricing" className="hover:text-white">חבילות</Link></li>
                <li><Link href="/try" className="hover:text-white">דמו</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-[#7DD3C8]">מידע</p>
              <ul className="mt-3 space-y-2 text-white/70">
                <li><Link href="/info/guides" className="hover:text-white">מדריכים</Link></li>
                <li><Link href="/faq" className="hover:text-white">שאלות ותשובות</Link></li>
                <li><Link href="/info/about" className="hover:text-white">אודות</Link></li>
                <li><Link href="/contact" className="hover:text-white">יצירת קשר</Link></li>
                <li><Link href="/terms" className="hover:text-white">תקנון</Link></li>
                <li><Link href="/privacy" className="hover:text-white">פרטיות</Link></li>
                <li><Link href="/accessibility" className="hover:text-white">נגישות</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/45">
          <p>© {new Date().getFullYear()} Invistimo</p>
          <p className="inline-flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#7DD3C8]" />
            נתוני דוגמה בלבד בדמו הציבורי
          </p>
        </div>
      </div>
    </footer>
  );
}
