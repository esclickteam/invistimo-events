"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Star, ArrowDown, PhoneCall } from "lucide-react";
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

// ✅ פרימיום: מחיר לפי בחירת כמות אורחים
const PREMIUM_PRICE_MAP = {
  100: 149,
  200: 239,
  300: 299,
  400: 379,
  500: 429,
  600: 489,
  700: 539,
  800: 599,
  1000: 699,
};

// ✅ תוספת לשירות אישורי הגעה טלפוניים (3 סבבים) לפי כמות אורחים
// אפשר לשנות מחירים כאן בקלות
const CALLS_ADDON_MAP = {
  100: 99,
  200: 149,
  300: 199,
  400: 249,
  500: 299,
  600: 349,
  700: 399,
  800: 449,
  1000: 499,
};

export default function PricingPage() {
  const router = useRouter();

  const scrollToPricing = () => {
    document.getElementById("pricing-section")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // ✅ בחירת כמות אורחים בפרימיום
  const [premiumGuests, setPremiumGuests] = useState(100);

  // ✅ בחירה אם לכלול שיחות (3 סבבים)
  const [includeCalls, setIncludeCalls] = useState(false);

  const premiumPrice = useMemo(() => {
    return PREMIUM_PRICE_MAP[premiumGuests] ?? PREMIUM_PRICE_MAP[100];
  }, [premiumGuests]);

  const callsAddonPrice = useMemo(() => {
    return CALLS_ADDON_MAP[premiumGuests] ?? CALLS_ADDON_MAP[100];
  }, [premiumGuests]);

  const premiumTotalPrice = useMemo(() => {
    return includeCalls ? premiumPrice + callsAddonPrice : premiumPrice;
  }, [includeCalls, premiumPrice, callsAddonPrice]);

  // ✅ BASIC מחיר קבוע
  const basicPrice = 49;

  const goRegister = (plan) => {
    // אפשר לשנות לנתיב ההרשמה האמיתי שלך
    // לדוגמה: /register או /auth/register או /signup
    if (plan === "basic") {
      router.push(`/register?plan=basic&guests=100&price=${basicPrice}`);
      return;
    }

    router.push(
      `/register?plan=premium&guests=${premiumGuests}&price=${premiumTotalPrice}&calls=${
        includeCalls ? "1" : "0"
      }`
    );
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
          אישורי הגעה, הושבה וניהול אורחים – במקום אחד, בלי אקסלים, בלי בלגן ובלי
          אינסוף הודעות
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
            {[
              {
                title: "שליטה מלאה",
                desc: "כל המידע על האורחים, האישורים וההושבה – במסך אחד ברור",
              },
              {
                title: "חיסכון בזמן",
                desc: "הודעות אוטומטיות וניהול חכם שחוסכים עשרות שעות",
              },
              {
                title: "שקט נפשי",
                desc: "בלי טעויות, בלי לחץ ובלי הפתעות ביום האירוע",
              },
            ].map((item, i) => (
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
      <section id="pricing-section" className="py-36 bg-[#efe6db] px-6">
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
              <Card className="rounded-3xl shadow-xl h-full bg-white">
                <CardContent className="p-10">
                  <h3 className="text-2xl font-semibold mb-2">חבילת בסיס</h3>
                  <p className="text-[#8f7a67] mb-2">לאירועים קטנים</p>

                  {/* ✅ מחיר מוצג */}
                  <div className="mb-6">
                    <span className="text-3xl font-semibold">₪{basicPrice}</span>
                    <span className="text-[#8f7a67]"> · תשלום חד־פעמי</span>
                  </div>

                  <ul className="space-y-4 mb-10">
                    {[
                      "גישה לעורך הזמנות",
                      "הזמנה דיגיטלית מוכנה לשליחה",
                      "שליחה ידנית ב-WhatsApp – הודעות ללא הגבלה",
                      "קישור אישי לכל אורח",
                      "אישורי הגעה עד 100 אורחים",
                      "גישה לדשבורד למעקב ועריכה",
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
                    onClick={() => goRegister("basic")}
                  >
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
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-semibold">חבילת פרימיום</h3>
                    <Star />
                  </div>

                  {/* ✅ מחיר דינמי לפי בחירה (כולל/לא כולל שיחות) */}
                  <div className="mb-6">
                    <span className="text-3xl font-semibold">₪{premiumTotalPrice}</span>
                    <span className="opacity-80"> · תשלום חד־פעמי</span>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {[
                      "כל מה שכלול בחבילת הבסיס",
                      "מערכת מתקדמת לסידורי הושבה",
                      "שליחת SMS חכמה לפי מספר הרשומות",
                      "3 הודעות SMS לכל אורח",
                      "שליטה מלאה ברשימת האורחים",
                      "סטטיסטיקות וניהול בזמן אמת",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <Check className="w-5 h-5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="bg-white/20 rounded-2xl p-4 mb-4">
                    <label className="block text-sm mb-2">בחרו כמות אורחים</label>
                    <select
                      value={premiumGuests}
                      onChange={(e) => setPremiumGuests(Number(e.target.value))}
                      className="w-full rounded-xl p-3 text-[#4a413a] bg-white"
                    >
                      <option value={100}>עד 100 אורחים</option>
                      <option value={200}>עד 200 אורחים</option>
                      <option value={300}>עד 300 אורחים</option>
                      <option value={400}>עד 400 אורחים</option>
                      <option value={500}>עד 500 אורחים</option>
                      <option value={600}>עד 600 אורחים</option>
                      <option value={700}>עד 700 אורחים</option>
                      <option value={800}>עד 800 אורחים</option>
                      <option value={1000}>עד 1,000 אורחים</option>
                    </select>

                    {/* ✅ טקסט קטן שמסביר מה נבחר */}
                    <p className="mt-3 text-sm opacity-90">
                      נבחר: עד {premiumGuests === 1000 ? "1000" : premiumGuests} אורחים · מחיר בסיס ₪
                      {premiumPrice}
                    </p>
                  </div>

                  {/* ✅ תוספת: צ׳קבוקס שירות שיחות */}
                  <div className="bg-white/18 rounded-2xl p-4 mb-6 border border-white/20">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeCalls}
                        onChange={(e) => setIncludeCalls(e.target.checked)}
                        className="mt-1 h-5 w-5 accent-[#4a413a]"
                      />

                      <div className="text-white">
                        <div className="flex items-center gap-2 font-semibold">
                          <PhoneCall className="w-4 h-4" />
                          הוספת שירות אישורי הגעה טלפוניים (3 סבבים אנושיים)
                        </div>

                        <div className="text-sm opacity-90 mt-1 leading-relaxed">
                          שירות אנושי לאורחים שלא ענו — עד 3 ניסיונות לכל אורח + עדכון סטטוס במערכת.
                        </div>

                        <div className="mt-2 text-sm opacity-95">
                          תוספת: <span className="font-semibold">₪{callsAddonPrice}</span>
                        </div>
                      </div>
                    </label>

                    {/* ✅ תצוגת מחיר סופי */}
                    <div className="mt-4 flex items-center justify-between rounded-xl bg-white/25 px-4 py-3">
                      <span className="text-white font-semibold">סה״כ לתשלום</span>
                      <span className="text-white font-bold text-lg">₪{premiumTotalPrice}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full rounded-full py-6 bg-[#4a413a] hover:bg-[#3a332d]"
                    onClick={() => goRegister("premium")}
                  >
                    הרשמה לפרימיום
                  </Button>

                  <p className="text-center text-sm mt-4 opacity-80"></p>
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

        <Button
          size="lg"
          className="rounded-full px-16 py-6 text-lg"
          onClick={scrollToPricing}
        >
          בחרו חבילה
        </Button>
      </section>
    </main>
  );
}
