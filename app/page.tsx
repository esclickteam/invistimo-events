"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const PRICING_URL = "https://www.invistimo.com/pricing";

export default function HomePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#f6f2ec] text-[#3f3a34]">

      {/* רקע חי – אור זז */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: [0.8, 1, 0.85] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, #ffffff 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, #efe6da 0%, transparent 60%)",
        }}
      />

      {/* הזמנה במרכז */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="relative z-10 flex h-full w-full items-center justify-center px-6"
      >
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="
            relative
            w-full max-w-[420px]
            bg-[#faf8f4]
            border border-[#e6ddd2]
          "
        >
          {/* מסגרת הזמנה */}
          <div className="absolute inset-3 border border-[#d8cdbf] pointer-events-none" />

          {/* וידאו / הזמנה */}
          <div className="aspect-[9/16] bg-[#e9e2d8] flex items-center justify-center text-[#8c8377] text-sm">
            כאן יופיע וידאו הזמנה
          </div>

          {/* טקסט מינימלי */}
          <div className="px-8 py-10 text-center space-y-6">
            <div className="text-[11px] tracking-[0.35em] text-[#b29a72]">
              INVISTIMO
            </div>

            <h1 className="text-3xl font-semibold leading-tight">
              ניהול אירוע חכם
            </h1>

            <p className="text-[#6b5f55] leading-relaxed">
              הזמנה דיגיטלית ואישורי הגעה  
              בלי לרדוף אחרי אף אחד
            </p>

            <Link
              href={PRICING_URL}
              className="
                inline-block mt-2
                text-sm tracking-wide
                border-b border-[#3f3a34]
                pb-1
                hover:opacity-70
                transition
              "
            >
              לצפייה בחבילות
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* למה אנחנו – כתוב כחלק מהחוויה */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="
          absolute bottom-10 left-1/2 -translate-x-1/2
          text-center text-sm text-[#6b5f55] max-w-xl px-6
        "
      >
        אנחנו לא עושים סבבי טלפונים.  
        מי שרוצה להגיע — מאשר.  
        מי שלא — לא צריך שירדפו אחריו.
      </motion.div>

    </main>
  );
}
