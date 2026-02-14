"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/* ================= ANIMATION ================= */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

type PlanKey = "plan1" | "plan2" | "plan3";

/* ================= RATE LOGIC ================= */

function getPlan1Rate(records: number) {
  if (records <= 200) return 1.14;
  if (records <= 400) return 1.06;
  if (records <= 600) return 0.98;
  return 0.93;
}

function getPlan2Rate(records: number) {
  if (records <= 200) return 2.75;
  if (records <= 400) return 2.45;
  if (records <= 600) return 2.15;
  return 2.05;
}

function getPlan3Rate(records: number) {
  if (records <= 200) return 2.85;
  if (records <= 400) return 2.55;
  if (records <= 600) return 2.25;
  return 2.05;
}

function calculatePrice(plan: PlanKey, records: number) {
  if (plan === "plan1") return Math.round(records * getPlan1Rate(records));
  if (plan === "plan2") return Math.round(records * getPlan2Rate(records));
  return Math.round(records * getPlan3Rate(records));
}

/* ================= COMPONENT ================= */

export default function PricingPage() {
  const router = useRouter();
  const options = Array.from({ length: 20 }, (_, i) => (i + 1) * 50);

  const [records, setRecords] = useState<number>(200);

  const handleRegister = (plan: PlanKey, price: number) => {
    router.push(`/register?plan=${plan}&records=${records}&price=${price}`);
  };

  return (
    <main className="min-h-screen bg-[#f7f3ee] text-[#4a413a]">

      <section className="pt-40 pb-20 text-center">
        <h1 className="text-4xl font-semibold mb-8">
          בחרו את החבילה שמתאימה לכם
        </h1>

        <div className="max-w-sm mx-auto">
          <label className="block mb-2 font-medium">
            בחרו כמות רשומות
          </label>
          <select
            value={records}
            onChange={(e) => setRecords(Number(e.target.value))}
            className="w-full p-3 rounded-xl border bg-white"
          >
            {options.map((num) => (
              <option key={num} value={num}>
                עד {num} רשומות
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="pb-32 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">

          {/* ================= PLAN 1 ================= */}
          <Card className="rounded-3xl shadow-xl">
            <CardContent className="p-8 flex flex-col h-full">
              <h3 className="text-2xl font-semibold mb-6 text-center">
                חבילה 1 – אישורים בהודעות
              </h3>

              <div className="text-center mb-6">
                <span className="text-3xl font-bold">
                  ₪{calculatePrice("plan1", records)}
                </span>
                <div className="text-sm opacity-70 mt-2">
                  תשלום חד פעמי
                </div>
              </div>

              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex gap-2">
                  <Check size={16} />
                  הזמנה דיגיטלית מלאה בעיצוב אישי
                </li>
                <li className="flex gap-2">
                  <Check size={16} />
                  2 סבבי WhatsApp אוטומטיים לאישור הגעה
                </li>
                <li className="flex gap-2">
                  <Check size={16} />
                  SMS תזכורת לאורחים שלא ענו
                </li>
                <li className="flex gap-2">
                  <Check size={16} />
                  קישור אישי לכל רשומה
                </li>
                <li className="flex gap-2">
                  <Check size={16} />
                  דשבורד ניהול בזמן אמת
                </li>
              </ul>

              <Button
                className="mt-auto rounded-full py-5"
                onClick={() =>
                  handleRegister("plan1", calculatePrice("plan1", records))
                }
              >
                הרשמה
              </Button>
            </CardContent>
          </Card>

          {/* ================= PLAN 2 ================= */}
          <Card className="rounded-3xl shadow-xl border-2 border-[#c3a98c]">
            <CardContent className="p-8 flex flex-col h-full">
              <h3 className="text-2xl font-semibold mb-6 text-center">
                חבילה 2 – מוקד אנושי
              </h3>

              <div className="text-center mb-6">
                <span className="text-3xl font-bold">
                  ₪{calculatePrice("plan2", records)}
                </span>
              </div>

              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex gap-2">
                  <Check size={16} />
                  כל מה שכלול בחבילה 1
                </li>
                <li className="flex gap-2">
                  <Check size={16} />
                  מוקד אנושי מקצועי לאישורי הגעה
                </li>
                <li className="flex gap-2">
                  <Check size={16} />
                  עד 3 ניסיונות חיוג לכל רשומה
                </li>
                <li className="flex gap-2">
                  <Check size={16} />
                  עדכון סטטוס מלא במערכת
                </li>
              </ul>

              <Button
                className="mt-auto rounded-full py-5"
                onClick={() =>
                  handleRegister("plan2", calculatePrice("plan2", records))
                }
              >
                הרשמה
              </Button>
            </CardContent>
          </Card>

          {/* ================= PLAN 3 ================= */}
          <Card className="rounded-3xl shadow-xl">
            <CardContent className="p-8 flex flex-col h-full">
              <h3 className="text-2xl font-semibold mb-6 text-center">
                חבילה 3 – מוקד + הושבה
              </h3>

              <div className="text-center mb-6">
                <span className="text-3xl font-bold">
                  ₪{calculatePrice("plan3", records)}
                </span>
              </div>

              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex gap-2">
                  <Check size={16} />
                  כל מה שכלול בחבילה 2
                </li>
                <li className="flex gap-2">
                  <Check size={16} />
                  מערכת סידורי הושבה מתקדמת
                </li>
                <li className="flex gap-2">
                  <Check size={16} />
                  חלוקה לשולחנות וזונים
                </li>
                <li className="flex gap-2">
                  <Check size={16} />
                  ייצוא רשימות והדפסה
                </li>
              </ul>

              <Button
                className="mt-auto rounded-full py-5"
                onClick={() =>
                  handleRegister("plan3", calculatePrice("plan3", records))
                }
              >
                הרשמה
              </Button>
            </CardContent>
          </Card>

        </div>
      </section>
    </main>
  );
}
