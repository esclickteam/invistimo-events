"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function PlansPage() {
  // ✅ תוספת: בחירה לשירות שיחות (3 סבבים) כחלק מהחבילה המלאה
  const [includeCalls, setIncludeCalls] = useState(false);

  // ✅ תוספת: מחיר התוספת (אפשר לשנות כאן בקלות)
  const callsAddonPrice = 199; // לדוגמה: ₪199 תוספת עבור 3 סבבי שיחות

  const fullBasePrice = 239; // מחיר בסיס (החבילה המלאה) - אם יש לך משתנה אמיתי/תמחור לפי טווח, תחברי אותו פה
  const fullTotalPrice = useMemo(() => {
    return includeCalls ? fullBasePrice + callsAddonPrice : fullBasePrice;
  }, [includeCalls]);

  return (
    <div className="relative space-y-20 pb-24">
      {/* רקע כמו בעמוד הראשי */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#faf7f3] via-[#f3ebe2] to-[#e6dacb]" />
      <div className="absolute inset-0 -z-20 opacity-[0.18] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* כותרת */}
      <section className="pt-24 text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold text-[#5c4632] leading-snug">
          בחירת חבילה מתאימה
        </h1>

        <p className="text-lg md:text-xl text-[#7b6754] max-w-2xl mx-auto mt-4 leading-relaxed">
          כל החבילות כוללות הזמנה מעוצבת ברמה יוקרתית, ניהול אישורי הגעה ועוד — ניתן
          לשדרג בכל שלב.
        </p>
      </section>

      {/* GRID */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12">
          {/* חבילת בסיס */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
            className="card bg-white rounded-[32px] p-10 border border-[#e1d8c9] shadow-[0_12px_32px_rgba(0,0,0,0.07)]"
          >
            <h2 className="text-2xl font-bold text-[#5c4632] mb-3">
              חבילת בסיס
            </h2>

            <p className="text-[#5c4632] leading-relaxed mb-6 text-base">
              הזמנה דיגיטלית מעוצבת + אישורי הגעה אונליין. מתאימה לאירועים קטנים
              ובינוניים.
            </p>

            <ul className="space-y-2 text-[#5c4632] mb-8 text-base">
              <li>• הזמנה מעוצבת</li>
              <li>• אישורי הגעה דרך ההזמנה</li>
              <li>• טבלת משתתפים מסודרת</li>
            </ul>

            <Link
              href="/register?plan=basic"
              className="btn-outline px-6 py-3 text-center text-base"
            >
              המשך לחבילת בסיס
            </Link>
          </motion.div>

          {/* חבילת מלאה */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
            className="card rounded-[32px] p-10 bg-[#d4b28c] shadow-[0_14px_35px_rgba(0,0,0,0.1)]"
          >
            <h2 className="text-2xl font-bold text-[#5c4632] mb-3">
              חבילת ניהול אירוע מלאה
            </h2>

            <p className="text-[#5c4632] leading-relaxed mb-6 text-base">
              חבילה זו כוללת הכל: הזמנה מעוצבת, אישורי הגעה, הושבה, תזכורות אוטומטיות
              ועוד — לכל אירוע ברמה גבוהה.
            </p>

            <ul className="space-y-2 text-[#5c4632] mb-6 text-base">
              <li>• הזמנה יוקרתית מעוצבת</li>
              <li>• ניהול מלא של אישורי הגעה</li>
              <li>• הושבה לשולחנות</li>
              <li>• תזכורות לאורחים</li>
            </ul>

            {/* ✅ תוספת: צ׳קבוקס 3 סבבי שיחות */}
            <div className="mb-7 rounded-2xl border border-[#caa77f] bg-[rgba(255,255,255,0.35)] p-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeCalls}
                  onChange={(e) => setIncludeCalls(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-[#7b5a3a]"
                />
                <div className="text-[#5c4632]">
                  <div className="font-semibold">
                    הוספת שירות אישורי הגעה טלפוניים (3 סבבים אנושיים)
                  </div>
                  <div className="text-sm text-[#6b5746] mt-1 leading-relaxed">
                    שירות אנושי לאורחים שלא ענו — עד 3 ניסיונות לכל אורח + עדכון סטטוס
                    במערכת.
                  </div>

                  <div className="mt-2 text-sm">
                    <span className="font-semibold">תוספת:</span>{" "}
                    <span>₪{callsAddonPrice}</span>
                  </div>
                </div>
              </label>

              {/* ✅ תצוגת סה"כ */}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[rgba(255,255,255,0.55)] px-4 py-3">
                <span className="text-[#5c4632] font-semibold">סה״כ לתשלום</span>
                <span className="text-[#5c4632] font-bold text-lg">
                  ₪{fullTotalPrice}
                </span>
              </div>
            </div>

            <Link
              href={`/register?plan=full&calls=${includeCalls ? "1" : "0"}`}
              className="btn-primary px-6 py-3 text-center text-base"
            >
              המשך לחבילה מלאה
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
