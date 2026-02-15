"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PlanKey = "plan1" | "plan2" | "plan3";

/* ===================== מדרגות מחיר ===================== */

const plan1Rates: [number, number][] = [
  [50, 1.19],
  [100, 1.16],
  [150, 1.13],
  [200, 1.1],
  [250, 1.08],
  [300, 1.06],
  [350, 1.04],
  [400, 1.02],
  [450, 1.0],
  [500, 0.98],
  [550, 0.96],
  [600, 0.94],
  [650, 0.93],
  [700, 0.92],
  [750, 0.9],
  [800, 0.88],
];

const plan2Rates: [number, number][] = [
  [50, 2.85],
  [100, 2.38],
  [150, 2.35],
  [200, 2.29],
  [250, 2.26],
  [300, 2.19],
  [350, 2.15],
  [400, 2.1],
  [450, 2.05],
  [500, 2.0],
  [550, 1.96],
  [600, 1.92],
  [650, 1.92],
  [700, 1.92],
  [750, 1.92],
  [800, 1.9],
];

const plan3Rates: [number, number][] = [
  [50, 3.75],
  [100, 3.22],
  [150, 2.98],
  [200, 2.76],
  [250, 2.65],
  [300, 2.52],
  [350, 2.43],
  [400, 2.35],
  [450, 2.28],
  [500, 2.21],
  [550, 2.14],
  [600, 2.07],
  [650, 2.06],
  [700, 2.05],
  [750, 2.04],
  [800, 2.03],
];

function getRate(plan: PlanKey, records: number) {
  const table =
    plan === "plan1" ? plan1Rates : plan === "plan2" ? plan2Rates : plan3Rates;

  for (const [limit, rate] of table) {
    if (records <= limit) return rate;
  }

  return table[table.length - 1][1];
}

function calculateBase(plan: PlanKey, records: number) {
  if (records === 10) return 5; // מחיר בדיקה קבוע
  return Math.round(records * getRate(plan, records));
}

/* ===================== COMPONENT ===================== */

export default function PricingPage() {
  const router = useRouter();
  const options = [10, ...Array.from({ length: 16 }, (_, i) => (i + 1) * 50)];


  const [records, setRecords] = useState<number>(200);

  const [addons, setAddons] = useState({
    plan1: { credit: false, seating: false, system: false, design: false },
    plan2: { credit: false, seating: false, system: false, design: false },
    plan3: { credit: false, seating: false, system: false, design: false },
  });

  const planMeta: Record<PlanKey, { title: string; icon: string; alt: string }> = {
    plan1: { title: "קל להזמין", icon: "/icons/1.png", alt: "אייקון חבילה 1" },
    plan2: { title: "מזמינים חכם", icon: "/icons/2.png", alt: "אייקון חבילה 2" },
    plan3: { title: "מזמינים ומושיבים", icon: "/icons/3.png", alt: "אייקון חבילה 3" },
  };

  /* ===================== אפסיילים ===================== */

  const getAddonPrices = (plan: PlanKey) => {
    if (plan === "plan1") {
      return { credit: 150, seating: 100, system: 200, design: 200 };
    }

    if (plan === "plan2") {
      return { credit: 100, seating: 5, system: 150, design: 150 };
    }

    return { credit: 0, seating: 0, system: 100, design: 100 };
  };

  const toggleAddon = (plan: PlanKey, key: keyof (typeof addons)["plan1"]) => {
    setAddons((prev) => ({
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
  const selected = addons[plan];

  const params = new URLSearchParams({
    plan,
    guests: String(records),

    seating: String(selected.seating),
    credit: String(selected.credit),
    system: String(selected.system),
    design: String(selected.design),
  });

  router.push(`/register?${params.toString()}`);
};



  /* ===================== תוכן משתנה לפיצ'רים ===================== */

  const getPlanFeatures = (plan: PlanKey) => {
    const shared = [
      "הזמנה דיגיטלית מלאה",
      "שליחה ב-2 סבבי WhatsApp אוטומטיים לאישור הגעה",
      plan === "plan3"
        ? "תזכורת ב-SMS לקראת האירוע + מספר שולחן"
        : "תזכורת ב-SMS לקראת האירוע",
      "הודעת תודה לאחר האירוע ב-SMS",
    ];

    if (plan === "plan2") {
      return [
        ...shared,
        "מוקד טלפוני מקצועי",
        "עד 3 ניסיונות חיוג לכל רשומה",
        "תיעוד ועדכון סטטוסים בזמן אמת",
      ];
    }

    if (plan === "plan3") {
      return [...shared, "מוקד אנושי מלא", "מערכת הושבה חכמה"];
    }

    return shared;
  };

  /* ===================== רינדור אפסיילים ===================== */

  const renderAddons = (plan: PlanKey) => {
    const prices = getAddonPrices(plan);
    const selected = addons[plan];

    return (
      <div
        className="mt-6 border-t pt-5 text-sm flex flex-col"
        style={{ minHeight: 260 }}

      >
        <p className="font-semibold text-base mb-3">תוספות אפשריות:</p>

        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="checkbox"
                checked={selected.credit}
                onChange={() => toggleAddon(plan, "credit")}
              />
              <span className="leading-5">מתנות באשראי (דרך ספק חיצוני)</span>
            </div>
            <span className="w-24 text-left font-medium shrink-0">
              {prices.credit === 0 ? "כלול" : `+ ₪${prices.credit}`}
            </span>
          </label>

          <label className="flex items-center justify-between cursor-pointer gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="checkbox"
                checked={selected.seating}
                onChange={() => toggleAddon(plan, "seating")}
              />
              <span className="leading-5">הושבה דיגיטלית</span>
            </div>
            <span className="w-24 text-left font-medium shrink-0">
              {prices.seating === 0 ? "כלול" : `+ ₪${prices.seating}`}
            </span>
          </label>

          <label className="flex items-center justify-between cursor-pointer gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="checkbox"
                checked={selected.system}
                onChange={() => toggleAddon(plan, "system")}
              />
              <span className="leading-5">מערכת עצמאית לניהול ומעקב אירוע</span>
            </div>
            <span className="w-24 text-left font-medium shrink-0">
              {prices.system === 0 ? "כלול" : `+ ₪${prices.system}`}
            </span>
          </label>

          <label className="flex items-center justify-between cursor-pointer gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="checkbox"
                checked={selected.design}
                onChange={() => toggleAddon(plan, "design")}
              />
              <span className="leading-5">עיצוב הזמנה בהתאמה אישית</span>
            </div>
            <span className="w-24 text-left font-medium shrink-0">
              {prices.design === 0 ? "כלול" : `+ ₪${prices.design}`}
            </span>
          </label>
        </div>
      </div>
    );
  };

  /* ===================== UI ===================== */

  return (
    <main className="min-h-screen bg-[#f4efe9] text-[#3c342d]" dir="rtl">
      <section className="pt-28 pb-16 text-center px-6">
        <h1 className="text-4xl md:text-5xl font-semibold mb-6">
          בחרו את החבילה המתאימה לאירוע שלכם
        </h1>

        <div className="max-w-sm mx-auto">
          <label className="block mb-2 font-medium">כמות רשומות</label>

          <select
  value={records}
  onChange={(e) => setRecords(Number(e.target.value))}
  className="w-full p-3 rounded-xl border bg-white shadow-sm text-center text-center-last"
>
            {options.map((num) => (
              <option key={num} value={num}>
                עד {num} רשומות
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="pt-20 md:pt-24 pb-32 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 items-stretch">
          {(["plan1", "plan2", "plan3"] as PlanKey[]).map((plan) => {
            const features = getPlanFeatures(plan);

            // מיישר את אזור הפיצ'רים בין כל הכרטיסים:
            // מקסימום שורות אצלך כרגע = 7 (בחבילה 2)
            const maxFeatureRows = 7;
            const fillers = Math.max(0, maxFeatureRows - features.length);

           return (
  <Card
    key={plan}
    className="rounded-[32px] shadow-xl hover:shadow-2xl transition h-full flex flex-col overflow-visible"
  >
    <CardContent className="relative flex h-full flex-col p-8 md:p-9 pt-[96px] md:pt-[112px]">


      {/* HEADER קומפקטי + אייקון גדול */}
<div className="text-center mb-5 flex flex-col items-center">

 <div className="absolute left-1/2 -translate-x-1/2 top-0 -translate-y-1/2 z-20 pointer-events-none">
  <div className="relative w-[420px] h-[420px] md:w-[520px] md:h-[520px]">
    <Image
      src={planMeta[plan].icon}
      alt={planMeta[plan].alt}
      fill
      className="object-contain drop-shadow-md"
      sizes="(max-width: 768px) 420px, 520px"
      priority={plan === "plan1"}
    />
  </div>
</div>




  {/* כותרת צמודה יותר לאייקון */}
<h3 className="text-2xl md:text-3xl font-semibold leading-tight text-[#9C5A1A] mt-8 mb-3">



    {planMeta[plan].title}
  </h3>

  {/* מחיר צמוד לכותרת */}
 <div className="mt-1">
  <div className="text-3xl md:text-4xl font-bold leading-none">
    ₪{calculateTotal(plan)}
  </div>
</div>
  
</div>

       {/* FEATURES קבוע גובה */}
      <ul className="text-sm space-y-3" style={{ minHeight: 260 }}>
        {features.map((item, idx) => (
          <li
            key={`${plan}-feature-${idx}`}
            className="flex gap-2 leading-6"
          >
            <Check size={16} className="mt-1 shrink-0" />
            <span>{item}</span>
          </li>
        ))}

        {Array.from({ length: fillers }).map((_, idx) => (
          <li
            key={`${plan}-filler-${idx}`}
            className="flex gap-2 leading-6 opacity-0 select-none pointer-events-none"
            aria-hidden="true"
          >
            <Check size={16} className="mt-1 shrink-0" />
            <span>placeholder</span>
          </li>
        ))}
      </ul>

      {/* ADDONS */}
      {renderAddons(plan)}

      {/* BUTTON */}
      <Button
        className="rounded-full mt-auto py-5 text-base font-semibold"
        onClick={() => handleRegister(plan)}
      >
        הרשמה
      </Button>
    </CardContent>
  </Card>
);

          })}
        </div>
      </section>
    </main>
  );
}
