"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PlanKey = "plan1" | "plan2" | "plan3";

/* ===================== מדרגות מחיר ===================== */

const plan1Rates = [
  [50,1.19],[100,1.16],[150,1.13],[200,1.10],
  [250,1.08],[300,1.06],[350,1.04],[400,1.02],
  [450,1.00],[500,0.98],[550,0.96],[600,0.94],
  [650,0.93],[700,0.92],[750,0.90],[800,0.88],
];

const plan2Rates = [
  [50,2.85],[100,2.38],[150,2.35],[200,2.29],
  [250,2.26],[300,2.19],[350,2.15],[400,2.10],
  [450,2.05],[500,2.00],[550,1.96],[600,1.92],
  [650,1.92],[700,1.92],[750,1.92],[800,1.90],
];

const plan3Rates = [
  [50,3.75],[100,3.22],[150,2.98],[200,2.76],
  [250,2.65],[300,2.52],[350,2.43],[400,2.35],
  [450,2.28],[500,2.21],[550,2.14],[600,2.07],
  [650,2.06],[700,2.05],[750,2.04],[800,2.03],
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

function calculateBase(plan: PlanKey, records: number) {
  return Math.round(records * getRate(plan, records));
}

/* ===================== COMPONENT ===================== */

export default function PricingPage() {
  const router = useRouter();
  const options = Array.from({ length: 16 }, (_, i) => (i + 1) * 50);

  const [records, setRecords] = useState<number>(200);

  const [addons, setAddons] = useState({
    plan1: { credit:false, seating:false, system:false, design:false },
    plan2: { credit:false, seating:false, system:false, design:false },
    plan3: { credit:false, seating:false, system:false, design:false },
  });

  /* ===================== אפסיילים ===================== */

  const getAddonPrices = (plan: PlanKey) => {
    if (plan === "plan1")
      return { credit:150, seating:100, system:200, design:200 };

    if (plan === "plan2")
      return { credit:100, seating:80, system:150, design:150 };

    return { credit:0, seating:0, system:100, design:100 };
  };

  const toggleAddon = (plan: PlanKey, key: keyof typeof addons.plan1) => {
    setAddons(prev => ({
      ...prev,
      [plan]: {
        ...prev[plan],
        [key]: !prev[plan][key],
      },
    }));
  };

  const calculateTotal = (plan: PlanKey) => {
    const base = calculateBase(plan, records);
    const prices = getAddonPrices(plan);
    const selected = addons[plan];

    return (
      base +
      (selected.credit ? prices.credit : 0) +
      (selected.seating ? prices.seating : 0) +
      (selected.system ? prices.system : 0) +
      (selected.design ? prices.design : 0)
    );
  };

  const handleRegister = (plan: PlanKey) => {
    router.push(
      `/register?plan=${plan}&records=${records}&price=${calculateTotal(plan)}`
    );
  };

  /* ===================== רינדור אפסיילים ===================== */

  const renderAddons = (plan: PlanKey) => {
    const prices = getAddonPrices(plan);
    const selected = addons[plan];

    return (
      <div className="mt-6 border-t pt-5 space-y-3 text-sm">
        <p className="font-semibold text-base">תוספות אפשריות:</p>

        <label className="flex justify-between items-center cursor-pointer">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.credit}
              onChange={() => toggleAddon(plan, "credit")}
            />
            מתנות באשראי (דרך ספק חיצוני)
          </div>
          <span>{prices.credit === 0 ? "כלול" : `+ ₪${prices.credit}`}</span>
        </label>

        <label className="flex justify-between items-center cursor-pointer">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.seating}
              onChange={() => toggleAddon(plan, "seating")}
            />
            הושבה דיגיטלית
          </div>
          <span>{prices.seating === 0 ? "כלול" : `+ ₪${prices.seating}`}</span>
        </label>

        <label className="flex justify-between items-center cursor-pointer">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.system}
              onChange={() => toggleAddon(plan, "system")}
            />
            מערכת עצמאית לניהול ומעקב אירוע
          </div>
          <span>{prices.system === 0 ? "כלול" : `+ ₪${prices.system}`}</span>
        </label>

        <label className="flex justify-between items-center cursor-pointer">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.design}
              onChange={() => toggleAddon(plan, "design")}
            />
            עיצוב הזמנה בהתאמה אישית
          </div>
          <span>{prices.design === 0 ? "כלול" : `+ ₪${prices.design}`}</span>
        </label>
      </div>
    );
  };

  /* ===================== UI ===================== */

  return (
    <main className="min-h-screen bg-[#f4efe9] text-[#3c342d]">

      <section className="pt-28 pb-16 text-center px-6">
        <h1 className="text-4xl md:text-5xl font-semibold mb-6">
          בחרו את החבילה המתאימה לאירוע שלכם
        </h1>

        <div className="max-w-sm mx-auto">
          <label className="block mb-2 font-medium">כמות רשומות</label>

          <select
            value={records}
            onChange={(e) => setRecords(Number(e.target.value))}
            className="w-full p-3 rounded-xl border bg-white shadow-sm"
          >
            {options.map(num => (
              <option key={num} value={num}>
                עד {num} רשומות
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="pb-32 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">

          {(["plan1","plan2","plan3"] as PlanKey[]).map(plan => (
            <Card key={plan} className="rounded-3xl shadow-xl hover:shadow-2xl transition">
              <CardContent className="p-8 flex flex-col">

                <h3 className="text-2xl font-semibold mb-4 text-center">
                  {plan === "plan1" && "חבילה 1 – אישורים דיגיטליים"}
                  {plan === "plan2" && "חבילה 2 – מוקד אנושי"}
                  {plan === "plan3" && "חבילה 3 – מוקד + הושבה"}
                </h3>

                <div className="text-center mb-6">
                  <div className="text-3xl font-bold">
                    ₪{calculateTotal(plan)}
                  </div>
                  <div className="text-sm opacity-60">
                    ₪{getRate(plan, records)} לרשומה
                  </div>
                </div>

                <ul className="space-y-3 text-sm">
                  <li className="flex gap-2"><Check size={16}/> הזמנה דיגיטלית מלאה</li>
                  <li className="flex gap-2"><Check size={16}/> שליחה ב-2 סבבי WhatsApp אוטומטיים לאישור הגעה</li>
                  {plan === "plan3" ? (
  <li className="flex gap-2">
    <Check size={16}/>
    תזכורת ב-SMS לקראת האירוע + מספר שולחן
  </li>
) : (
  <li className="flex gap-2">
    <Check size={16}/>
    תזכורת ב-SMS לקראת האירוע
  </li>
)}

                  <li className="flex gap-2"><Check size={16}/> הודעת תודה לאחר האירוע ב-SMS</li>

                  {plan === "plan2" && (
                    <>
                      <li className="flex gap-2"><Check size={16}/> מוקד טלפוני מקצועי</li>
                      <li className="flex gap-2"><Check size={16}/> עד 3 ניסיונות חיוג לכל רשומה</li>
                      <li className="flex gap-2"><Check size={16}/> תיעוד ועדכון סטטוסים בזמן אמת</li>
                    </>
                  )}

                  {plan === "plan3" && (
                    <>
                      <li className="flex gap-2"><Check size={16}/> מוקד אנושי מלא</li>
                      <li className="flex gap-2"><Check size={16}/> מערכת הושבה חכמה</li>
                    </>
                  )}
                </ul>

                {renderAddons(plan)}

                <Button
                  className="rounded-full mt-8 py-5"
                  onClick={() => handleRegister(plan)}
                >
                  הרשמה
                </Button>

              </CardContent>
            </Card>
          ))}

        </div>
      </section>
    </main>
  );
}
