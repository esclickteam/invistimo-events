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
    transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" },
  }),
};

export default function PricingPage() {
  const scrollToPricing = () => {
    document.getElementById("pricing-section")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <main className="min-h-screen text-[#4a413a] overflow-hidden">

      {/* ================= HERO ================= */}
      <section className="pt-40 pb-36 bg-[#f7f3ee] text-center px-6">
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
          className="text-lg md:text-xl text-[#8f7a67] max-w-3xl mx-auto mb-12"
        >
          אישורי הגעה, הושבה וניהול אורחים – במקום אחד,
          בלי אקסלים, בלי בלגן ובלי אינסוף הודעות
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
            className="rounded-full px-14 py-6 text-lg"
            onClick={scrollToPricing}
          >
            בחרו חבילה
          </Button>

          <ArrowDown className="opacity-60" />
        </motion.div>
      </section>

      {/* ================= WHY ================= */}
      <section className="py-32 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-3xl font-semibold text-center mb-20"
          >
            למה לבחור ב-Invistimo?
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-10">
            {[{
              title: "שליטה מלאה",
              desc: "כל המידע על האורחים, האישורים וההושבה – במסך אחד ברור",
            }, {
              title: "חיסכון בזמן",
              desc: "הודעות אוטומטיות וניהול חכם שחוסכים עשרות שעות",
            }, {
              title: "שקט נפשי",
              desc: "בלי טעויות, בלי לחץ ובלי הפתעות ביום האירוע",
            }].map((item, i) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="bg-[#f7f3ee] rounded-3xl shadow-md p-10 text-center"
              >
                <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
                <p className="text-[#8f7a67]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PRICING ================= */}
      <section
        id="pricing-section"
        className="py-36 bg-[#efe6db] px-6"
      >
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-3xl font-semibold text-center mb-20"
          >
            בחרו את החבילה שמתאימה לכם
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-14">

            {/* BASIC */}
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
  "גישה לעורך הזמנות",
  "הזמנה דיגיטלית מוכנה לשליחה",
  "שליחה ידנית ב-WhatsApp – הודעות ללא הגבלה",
  "קישור אישי לכל אורח",
  "אישורי הגעה עד 100 אורחים",
  "גישה לדשבורד למעקב ועריכה",
].map(item => (
                      <li key={item} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-[#d1bba3]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Button variant="outline" className="w-full rounded-full py-6">
                    הרשמה לחבילת בסיס
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* PREMIUM */}
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
  "כל מה שכלול בחבילת הבסיס",
  "מערכת מתקדמת לסידורי הושבה",
  "שליחת SMS חכמה לפי מספר הרשומות",
  "3 הודעות SMS לכל אורח ברשימה",
  "שליטה מלאה ברשימת האורחים",
  "סטטיסטיקות וניהול בזמן אמת",
].map(item => (
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
                    הרשמה לפרימיום
                  </Button>

                  <p className="text-center text-sm mt-4 opacity-80">תשלום חד־פעמי · ללא מנוי</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="py-32 bg-[#f7f3ee] text-center px-6">
        <motion.h3
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-3xl font-semibold mb-8"
        >
          מוכנים להתחיל?
        </motion.h3>

        <Button size="lg" className="rounded-full px-16 py-6 text-lg" onClick={scrollToPricing}>
          בחרו חבילה
        </Button>
      </section>
    </main>
  );
}
