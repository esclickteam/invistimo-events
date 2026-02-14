"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PlanKey = "plan1" | "plan2" | "plan3";

/* ===================== מדרגות לפי כל 50 רשומות ===================== */

const plan1Rates = [
  [50, 1.18],
  [100, 1.15],
  [150, 1.12],
  [200, 1.10],
  [250, 1.08],
  [300, 1.06],
  [350, 1.04],
  [400, 1.02],
  [450, 1.00],
  [500, 0.98],
  [550, 0.96],
  [600, 0.94],
  [650, 0.92],
  [700, 0.90],
  [750, 0.88],
  [800, 0.86],
];

const plan2Rates = [
  [50, 2.70],
  [100, 2.60],
  [150, 2.50],
  [200, 2.40],
  [250, 2.30],
  [300, 2.20],
  [350, 2.15],
  [400, 2.10],
  [450, 2.05],
  [500, 2.00],
  [550, 1.95],
  [600, 1.90],
  [650, 1.85],
  [700, 1.80],
  [750, 1.75],
  [800, 1.70],
];

const plan3Rates = [
  [50, 3.10],
  [100, 3.00],
  [150, 2.90],
  [200, 2.80],
  [250, 2.70],
  [300, 2.60],
  [350, 2.55],
  [400, 2.50],
  [450, 2.45],
  [500, 2.40],
  [550, 2.35],
  [600, 2.30],
  [650, 2.25],
  [700, 2.20],
  [750, 2.15],
  [800, 2.10],
];

function getRate(plan: PlanKey, records: number) {
  const table =
    plan === "plan1"
      ? plan1Rates
      : plan === "plan2"
      ? plan2Rates
      : plan3Rates;

  for (let [limit, rate] of table) {
    if (records <= limit) return rate;
  }

  return table[table.length - 1][1];
}

function calculatePrice(plan: PlanKey, records: number) {
  const rate = getRate(plan, records);
  return Math.round(records * rate);
}

/* ===================== COMPONENT ===================== */

export default function PricingPage() {
  const router = useRouter();
  const options = Array.from({ length: 16 }, (_, i) => (i + 1) * 50);

  const [records, setRecords] = useState<number>(200);

  const handleRegister = (plan: PlanKey) => {
    const price = calculatePrice(plan, records);
    router.push(`/register?plan=${plan}&records=${records}&price=${price}`);
  };

  return (
    <main className="min-h-screen bg-[#f5f2ee] text-[#3e3731]">

      {/* HEADER */}
      <section className="pt-32 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-semibold mb-6">
          בחרו את החבילה המתאימה לאירוע שלכם
        </h1>

        <div className="max-w-sm mx-auto">
          <label className="block mb-2 font-medium">
            כמות רשומות
          </label>
          <select
            value={records}
            onChange={(e) => setRecords(Number(e.target.value))}
            className="w-full p-3 rounded-xl border bg-white shadow-sm"
          >
            {options.map((num) => (
              <option key={num} value={num}>
                עד {num} רשומות
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* PLANS */}
      <section className="pb-32 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">

          {/* ================= PLAN 1 ================= */}
          <Card className="rounded-3xl shadow-xl">
            <CardContent className="p-8 flex flex-col h-full">
              <h3 className="text-2xl font-semibold mb-4 text-center">
                חבילה 1 – אישורים דיגיטליים
              </h3>

              <div className="text-center mb-6">
                <div className="text-3xl font-bold">
                  ₪{calculatePrice("plan1", records)}
                </div>
                <div className="text-sm opacity-70">
                  תשלום חד פעמי
                </div>
              </div>

              <ul className="space-y-3 text-sm mb-8">
                <li className="flex gap-2"><Check size={16}/> הזמנה דיגיטלית בעיצוב אישי</li>
                <li className="flex gap-2"><Check size={16}/> 2 סבבי WhatsApp אוטומטיים לאישור הגעה</li>
                <li className="flex gap-2"><Check size={16}/> SMS תזכורת לרשומות שלא השיבו</li>
                <li className="flex gap-2"><Check size={16}/> קישור אישי ייחודי לכל רשומה</li>
                <li className="flex gap-2"><Check size={16}/> דשבורד מעקב בזמן אמת</li>
                <li className="flex gap-2"><Check size={16}/> ייצוא נתונים לאקסל</li>
              </ul>

              <Button className="mt-auto rounded-full" onClick={() => handleRegister("plan1")}>
                הרשמה
              </Button>
            </CardContent>
          </Card>

          {/* ================= PLAN 2 ================= */}
          <Card className="rounded-3xl shadow-xl border-2 border-[#c3a98c]">
            <CardContent className="p-8 flex flex-col h-full">
              <h3 className="text-2xl font-semibold mb-4 text-center">
                חבילה 2 – מוקד אנושי
              </h3>

              <div className="text-center mb-6">
                <div className="text-3xl font-bold">
                  ₪{calculatePrice("plan2", records)}
                </div>
              </div>

              <ul className="space-y-3 text-sm mb-8">
                <li className="flex gap-2"><Check size={16}/> כל מה שכלול בחבילה 1</li>
                <li className="flex gap-2"><Check size={16}/> מוקד טלפוני מקצועי לאישורי הגעה</li>
                <li className="flex gap-2"><Check size={16}/> עד 3 ניסיונות חיוג לכל רשומה</li>
                <li className="flex gap-2"><Check size={16}/> תיעוד שיחות מלא במערכת</li>
                <li className="flex gap-2"><Check size={16}/> עדכון סטטוס בזמן אמת</li>
              </ul>

              <Button className="mt-auto rounded-full" onClick={() => handleRegister("plan2")}>
                הרשמה
              </Button>
            </CardContent>
          </Card>

          {/* ================= PLAN 3 ================= */}
          <Card className="rounded-3xl shadow-xl">
            <CardContent className="p-8 flex flex-col h-full">
              <h3 className="text-2xl font-semibold mb-4 text-center">
                חבילה 3 – מוקד + סידורי הושבה
              </h3>

              <div className="text-center mb-6">
                <div className="text-3xl font-bold">
                  ₪{calculatePrice("plan3", records)}
                </div>
              </div>

              <ul className="space-y-3 text-sm mb-8">
                <li className="flex gap-2"><Check size={16}/> כל מה שכלול בחבילה 2</li>
                <li className="flex gap-2"><Check size={16}/> מערכת סידורי הושבה חכמה</li>
                <li className="flex gap-2"><Check size={16}/> חלוקה לשולחנות ואזורי ישיבה</li>
                <li className="flex gap-2"><Check size={16}/> שליחת SMS עם מספר שולחן</li>
                <li className="flex gap-2"><Check size={16}/> ייצוא רשימות והדפסה</li>
              </ul>

              <Button className="mt-auto rounded-full" onClick={() => handleRegister("plan3")}>
                הרשמה
              </Button>
            </CardContent>
          </Card>

        </div>
      </section>
    </main>
  );
}
