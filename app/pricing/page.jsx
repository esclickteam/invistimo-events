"use client";

import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" },
  }),
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ee] text-[#4a413a] overflow-hidden">

      {/* HERO */}
      <section className="pt-40 pb-24 text-center px-4">
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
          className="text-lg md:text-xl text-[#8f7a67] max-w-3xl mx-auto mb-10"
        >
          אישורי הגעה, הושבה וניהול אורחים – במקום אחד, בלי אקסלים ובלי בלגן
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={3}
        >
          <Button className="rounded-full px-10 py-6 text-lg">
            בחרו חבילה והתחילו עכשיו
          </Button>
        </motion.div>
      </section>

      {/* VALUE */}
      <section className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 px-6 pb-32">
        {["חוסך עשרות שעות של הודעות", "מונע טעויות בהושבה", "שומר על שליטה מלאה"].map(
          (text, i) => (
            <motion.div
              key={text}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="bg-white rounded-3xl shadow-md p-8 text-center"
            >
              <p className="text-lg font-medium">{text}</p>
            </motion.div>
          )
        )}
      </section>

      {/* PRICING */}
      <section className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 px-6 pb-32">

        {/* BASIC */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <Card className="rounded-3xl shadow-lg">
            <CardContent className="p-10">
              <h2 className="text-2xl font-semibold mb-2">חבילת בסיס</h2>
              <p className="text-[#8f7a67] mb-6">₪49 · אירועים קטנים</p>

              <ul className="space-y-4 mb-10">
                {["עורך הזמנות בסיסי", "שליחה ידנית ב-WhatsApp", "אישורי הגעה עד 50 אורחים"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-[#d1bba3]" />
                      <span>{item}</span>
                    </li>
                  )
                )}
              </ul>

              <Button variant="outline" className="w-full rounded-full py-6">
                התחילו עם חבילת בסיס
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
          <Card className="relative rounded-3xl shadow-xl bg-gradient-to-b from-[#d1bba3] to-[#c3a98c] text-white">
            <CardContent className="p-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">חבילת פרימיום</h2>
                <Star />
              </div>

              <ul className="space-y-4 mb-8">
                {["אישורי הגעה ללא הגבלה", "הושבה חכמה", "סטטיסטיקות בזמן אמת", "תזכורות אוטומטיות"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-3">
                      <Check className="w-5 h-5" />
                      <span>{item}</span>
                    </li>
                  )
                )}
              </ul>

              <div className="bg-white/20 rounded-2xl p-4 mb-6">
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

              <p className="text-center text-sm mt-4 opacity-80">תשלום חד־פעמי · בלי מנוי</p>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="bg-[#efe6db] py-24 text-center px-6">
        <motion.h3
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-3xl font-semibold mb-6"
        >
          מוכנים לאירוע מסודר ורגוע יותר?
        </motion.h3>

        <Button className="rounded-full px-12 py-6 text-lg">
          התחילו עכשיו עם Invistimo
        </Button>
      </section>
    </main>
  );
}
