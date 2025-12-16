"use client";

import { motion } from "framer-motion";
import { Check, Star, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" },
  }),
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ee] text-[#4a413a] overflow-hidden">

      {/* ================= HERO / פתיח ================= */}
      <section className="pt-40 pb-32 text-center px-6 max-w-5xl mx-auto">
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-4xl md:text-5xl font-semibold mb-6"
        >
          הזמנות דיגיטליות שמנהלות לך את האירוע
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="text-lg md:text-xl text-[#8f7a67] mb-10"
        >
          אישורי הגעה, הושבה וניהול אורחים – במקום אחד, בלי אקסלים,
          בלי בלגן ובלי אינסוף הודעות
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={3}
          className="flex flex-col items-center gap-6"
        >
          <Button
            size="lg"
            className="rounded-full px-12 py-6 text-lg"
            onClick={() => {
              document.getElementById("pricing-section")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
          >
            בחרו חבילה
          </Button>

          <ArrowDown className="opacity-60" />
        </motion.div>
      </section>

      {/* ================= בלוק ערך ================= */}
      <section className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 px-6 pb-32">
        {[
          "חוסך עשרות שעות של הודעות ומעקבים",
          "מונע טעויות מביכות בהושבה",
          "נותן שליטה מלאה ושקט נפשי",
        ].map((text, i) => (
          <motion.div
            key={text}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
            className="bg-white rounded-3xl shadow-md p-10 text-center"
          >
            <p className="text-lg font-medium">{text}</p>
          </motion.div>
        ))}
      </section>

      {/* ================= החבילות ================= */}
      <section
        id="pricing-section"
        className="max-w-6xl mx-auto px-6 pb-40"
      >
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-3xl font-semibold text-center mb-16"
        >
          החבילות שלנו
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-14">

          {/* ================= חבילת בסיס ================= */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <Card className="rounded-3xl shadow-xl h-full">
              <CardContent className="p-10">
                <h3 className="text-2xl font-semibold mb-2">חבילת בסיס</h3>
                <p className="text-[#8f7a67] mb-6">₪49 · לאירועים קטנים</p>

                <ul className="space-y-4 mb-10">
                  {[
                    "גישה לעורך הזמנות בסיסי",
                    "הזמנה דיגיטלית מעוצבת ומוכנה לשליחה",
                    "שליחה ידנית ב-WhatsApp לכל אורח",
                    "קישור אישי עם טופס אישור הגעה",
                    "ניהול אישורי הגעה – עד 50 אורחים",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-[#d1bba3]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant="outline"
                  className="w-full rounded-full py-6"
                >
                  הרשמה ותשלום לחבילת בסיס
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* ================= חבילת פרימיום ================= */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <Card className="relative rounded-3xl shadow-2xl bg-gradient-to-b from-[#d1bba3] to-[#c3a98c] text-white h-full">
              <CardContent className="p-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-semibold">חבילת פרימיום</h3>
                  <Star />
                </div>

                <ul className="space-y-4 mb-8">
                  {[
                    "תזכורות והודעות אוטומטיות",
                    "הושבה חכמה וניהול שולחנות",
                    "עיצוב הזמנה מתקדם ועריכה חופשית",
                    "שליחה מלאה ברשימת המוזמנים",
                    "עדכונים וסטטיסטיקות בזמן אמת",
                    "ניהול מלא של אישורי הגעה – ללא הגבלה",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <Check className="w-5 h-5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="bg-white/20 rounded-2xl p-4 mb-6">
                  <label className="block text-sm mb-2">בחרו כמות אורחים</label>
                  <select className="w-full rounded-xl p-3 text-[#4a413a]">
                    <option>עד 100 אורחים</option>
                    <option>עד 300 אורחים</option>
                    <option>עד 500 אורחים</option>
                    <option>1000+ אורחים</option>
                  </select>
                </div>

                <Button className="w-full rounded-full py-6 bg-[#4a413a] hover:bg-[#3a332d]">
                  הרשמה ותשלום לפרימיום
                </Button>

                <p className="text-center text-sm mt-4 opacity-80">
                  תשלום חד־פעמי · ללא מנוי
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ================= CTA סופי ================= */}
      <section className="bg-[#efe6db] py-28 text-center px-6">
        <motion.h3
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-3xl font-semibold mb-6"
        >
          רוצים אירוע מסודר ורגוע יותר?
        </motion.h3>

        <Button size="lg" className="rounded-full px-14 py-6 text-lg">
          התחילו עכשיו עם Invistimo
        </Button>
      </section>
    </main>
  );
}
