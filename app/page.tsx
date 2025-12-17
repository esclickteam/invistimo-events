"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const PRICING_URL = "https://www.invistimo.com/pricing";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export default function HomePage() {
  return (
    <main className="bg-[#f6f2ec] text-[#3f3a34] overflow-x-hidden">

      {/* ================= HERO ================= */}
      <section className="relative min-h-screen flex items-center px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff] via-[#f3ede4] to-[#ebe2d6]" />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
          {/* טקסט */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.8 }}
          >
            <div className="text-xs tracking-[0.4em] text-[#b29a72] mb-6">
              INVISTIMO
            </div>

            <h1 className="text-5xl md:text-6xl xl:text-7xl font-semibold leading-tight mb-8">
              ניהול אירוע
              <br />
              <span className="text-[#b29a72]">בלי לרדוף אחרי אורחים</span>
            </h1>

            <p className="text-lg md:text-xl text-[#6b5f55] max-w-xl mb-10">
              הזמנות דיגיטליות, אישורי הגעה וסידורי הושבה —
              מערכת אחת שמנהלת את האירוע בשבילך.
            </p>

            <Link
              href={PRICING_URL}
              className="inline-block px-12 py-4 bg-[#3f3a34] text-[#faf8f4] rounded-full text-sm tracking-wide hover:opacity-90 transition"
            >
              לצפייה בחבילות
            </Link>
          </motion.div>

          {/* וידאו בטלפון */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="relative w-[280px] md:w-[320px] aspect-[9/19] rounded-[42px] bg-black shadow-[0_40px_80px_rgba(0,0,0,0.35)] p-[10px]">
              <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-black">
                <video
                  src="/videos/home1.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-[5px] bg-black/60 rounded-full" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= למי זה מתאים ================= */}
      <section className="py-32 px-6 bg-[#faf8f4]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-semibold mb-20">
            למי זה מתאים
          </h2>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              "חתונות ואירועים פרטיים",
              "אירועי חברה וכנסים",
              "בר / בת מצווה ואירועים משפחתיים",
            ].map((title, i) => (
              <div
                key={i}
                className="bg-white border border-[#e5dccf] p-12 rounded-3xl"
              >
                <h3 className="text-2xl font-semibold mb-4">{title}</h3>
                <p className="text-[#6b5f55] leading-relaxed">
                  ניהול מסודר, ברור ואוטומטי — בלי הודעות, בלי טלפונים, בלי בלאגן.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= הבעיה ================= */}
      <section className="py-32 px-6 bg-[#ffffff]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-semibold mb-10">
            למה זה חייב להיות כל כך מסובך?
          </h2>

          <p className="text-xl text-[#6b5f55] max-w-3xl leading-relaxed">
            אקסלים, הודעות וואטסאפ, שינויים ברגע האחרון,
            אנשים שלא עונים —
            Invistimo מחליפה את כל זה במערכת אחת,
            מסודרת, ברורה, ועובדת.
          </p>
        </div>
      </section>

      {/* ================= איך זה עובד ================= */}
      <section className="py-32 px-6 bg-[#faf8f4]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-semibold mb-24">
            איך זה עובד
          </h2>

          <div className="grid md:grid-cols-3 gap-16">
            {[
              { step: "01", title: "יוצרים הזמנה" },
              { step: "02", title: "שולחים לאורחים" },
              { step: "03", title: "עוקבים ומנהלים" },
            ].map((item) => (
              <div key={item.step}>
                <div className="text-6xl font-semibold text-[#b29a72] mb-6">
                  {item.step}
                </div>
                <h3 className="text-2xl font-semibold mb-4">{item.title}</h3>
                <p className="text-[#6b5f55] max-w-sm">
                  הכל קורה במקום אחד, בצורה אוטומטית וברורה.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-32 px-6 bg-[#3f3a34] text-[#faf8f4]">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-semibold mb-10">
            מוכנים לנהל אירוע
            <br />
            כמו שצריך?
          </h2>

          <Link
            href={PRICING_URL}
            className="inline-block px-14 py-4 bg-[#faf8f4] text-[#3f3a34] rounded-full text-sm tracking-wide hover:opacity-90 transition"
          >
            לצפייה בחבילות
          </Link>
        </div>
      </section>

    </main>
  );
}
