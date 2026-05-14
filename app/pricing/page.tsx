"use client";

import Image from "next/image";
import type { ElementType } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Armchair,
  Check,
  Crown,
  Gift,
  MonitorCog,
  Palette,
  Sparkles,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PlanKey = "plan1" | "plan2" | "plan3";
type AddonKey = "credit" | "seating" | "system" | "design";

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
  return Math.round(records * getRate(plan, records));
}

/* ===================== COMPONENT ===================== */

export default function PricingPage() {
  const router = useRouter();
  const options = Array.from({ length: 16 }, (_, i) => (i + 1) * 50);

  const [records, setRecords] = useState<number | null>(null);

  const [addons, setAddons] = useState<
    Record<PlanKey, Record<AddonKey, boolean>>
  >({
    plan1: { credit: false, seating: false, system: false, design: false },
    plan2: { credit: false, seating: false, system: false, design: false },
    plan3: { credit: false, seating: false, system: false, design: false },
  });

  const planMeta: Record<
    PlanKey,
    {
      title: string;
      subtitle: string;
      badge: string;
      icon: string;
      alt: string;
      highlight?: boolean;
    }
  > = {
    plan1: {
      title: "קל להזמין",
      subtitle: "הבסיס המושלם להזמנה דיגיטלית ואישורי הגעה",
      badge: "מתאים לאירוע פשוט",
      icon: "/icons/1.png",
      alt: "אייקון חבילה 1",
    },
    plan2: {
      title: "מזמינים חכם",
      subtitle: "כולל מוקד טלפוני וניהול אישורי הגעה מלא",
      badge: "הבחירה הפופולרית",
      icon: "/icons/2.png",
      alt: "אייקון חבילה 2",
      highlight: true,
    },
    plan3: {
      title: "מזמינים ומושיבים",
      subtitle: "הפתרון המלא כולל הושבה חכמה ושולחנות",
      badge: "הכי מקיף",
      icon: "/icons/3.png",
      alt: "אייקון חבילה 3",
    },
  };

  /* ===================== אפסיילים ===================== */

  const getAddonPrices = (plan: PlanKey) => {
    if (plan === "plan1") {
      return { credit: 150, seating: 100, system: 200, design: 200 };
    }

    if (plan === "plan2") {
      return { credit: 100, seating: 80, system: 150, design: 150 };
    }

    return { credit: 0, seating: 0, system: 100, design: 100 };
  };

  const toggleAddon = (plan: PlanKey, key: AddonKey) => {
    setAddons((prev) => ({
      ...prev,
      [plan]: {
        ...prev[plan],
        [key]: !prev[plan][key],
      },
    }));
  };

  const calculateTotal = (plan: PlanKey) => {
    if (records === null) return 0;

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
    if (records === null) {
      alert("בחרי כמות רשומות לפני ההרשמה");
      return;
    }

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

  /* ===================== פיצ'רים ===================== */

  const getPlanFeatures = (plan: PlanKey) => {
    const shared = [
      "הזמנה דיגיטלית מלאה",
      "שליחה ב-2 סבבי WhatsApp אוטומטיים לאישור הגעה",
      "תזכורת ב-SMS לקראת האירוע + מספר שולחן",
      "הודעת תודה לאחר האירוע ב-SMS",
    ];

    const plan2Features = [
      ...shared,
      "מוקד טלפוני מקצועי",
      "עד 3 ניסיונות חיוג לכל רשומה",
      "תיעוד ועדכון סטטוסים בזמן אמת",
    ];

    if (plan === "plan2") {
      return plan2Features;
    }

    if (plan === "plan3") {
      return [...plan2Features, "מערכת הושבה חכמה"];
    }

    return shared;
  };

  /* ===================== תוספות ===================== */

  const addonMeta: Record<AddonKey, { label: string; icon: ElementType }> = {
    credit: {
      label: "מתנות באשראי דרך ספק חיצוני",
      icon: Gift,
    },
    seating: {
      label: "הושבה דיגיטלית",
      icon: Armchair,
    },
    system: {
      label: "מערכת עצמאית לניהול ומעקב אירוע",
      icon: MonitorCog,
    },
    design: {
      label: "עיצוב הזמנה בהתאמה אישית",
      icon: Palette,
    },
  };

  const renderAddons = (plan: PlanKey) => {
    const prices = getAddonPrices(plan);
    const selected = addons[plan];

    return (
      <div className="mt-7 border-t border-[#E9D9C4] pt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-base font-black text-[#3E2D20]">
            תוספות אפשריות
          </p>

          <span className="rounded-full bg-[#FFF4E2] px-3 py-1 text-xs font-bold text-[#A86F2B]">
            לפי בחירה
          </span>
        </div>

        <div className="space-y-3">
          {(Object.keys(addonMeta) as AddonKey[]).map((key) => {
            const Icon = addonMeta[key].icon;
            const isSelected = selected[key];
            const price = prices[key];

            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleAddon(plan, key)}
                className={`
                  group flex w-full items-center justify-between gap-3
                  rounded-[18px] border px-4 py-3 text-right
                  transition-all duration-200
                  ${
                    isSelected
                      ? "border-[#C89545] bg-[#FFF3DF] shadow-[0_12px_26px_rgba(168,111,43,0.12)]"
                      : "border-[#E8D9C7] bg-white/70 hover:border-[#D7B98D] hover:bg-[#FFF8EE]"
                  }
                `}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`
                      flex h-9 w-9 shrink-0 items-center justify-center
                      rounded-full border
                      ${
                        isSelected
                          ? "border-[#C89545] bg-[#C89545] text-white"
                          : "border-[#E5D1B7] bg-[#FFFDF9] text-[#A86F2B]"
                      }
                    `}
                  >
                    <Icon size={17} />
                  </span>

                  <span className="text-sm font-semibold leading-5 text-[#5A3E25]">
                    {addonMeta[key].label}
                  </span>
                </div>

                <span
                  className={`
                    shrink-0 rounded-full px-3 py-1 text-xs font-black
                    ${
                      price === 0
                        ? "bg-green-50 text-green-700"
                        : "bg-[#F7E9D3] text-[#8A5A25]"
                    }
                  `}
                >
                  {price === 0 ? "כלול" : `+ ₪${price}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  /* ===================== UI ===================== */

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#F7EFE6] text-[#3E2D20]"
    >
      {/* רקע */}
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_top,#fffaf4_0%,#f7efe6_42%,#efe2d2_100%)]" />
      <div className="absolute inset-0 -z-20 opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* כתמי אור */}
      <div className="pointer-events-none absolute -top-24 right-[7%] h-72 w-72 rounded-full bg-[#DAB273]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[8%] left-[5%] h-80 w-80 rounded-full bg-[#CDA37D]/16 blur-3xl" />
      <div className="pointer-events-none absolute top-[36%] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-white/22 blur-3xl" />

      {/* עיטורים */}
      <div className="pointer-events-none absolute top-24 left-10 h-28 w-28 rounded-full border border-[#D8B98D]/25" />
      <div className="pointer-events-none absolute bottom-16 right-10 h-24 w-24 rounded-full border border-[#D8B98D]/20" />

      {/* HERO */}
      <section className="relative z-10 px-5 pb-12 pt-24 text-center sm:px-8 lg:pt-28">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#D8B98D] bg-[#FFF8EE] shadow-[0_10px_30px_rgba(186,140,76,0.13)]">
            <Crown className="text-[#B88945]" size={26} />
          </div>

          <p className="font-serif text-[34px] tracking-[0.22em] text-[#8A6338] sm:text-[46px]">
            INVISTIMO
          </p>

          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-l from-transparent via-[#C9A46A] to-transparent" />

          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#A07C52]">
            Smart Event Packages
          </p>

          <h1 className="mt-7 text-4xl font-black leading-tight text-[#3E2D20] sm:text-5xl lg:text-6xl">
            בחרו את החבילה שמתאימה
            <br className="hidden sm:block" />
            לאירוע שלכם
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#7B6754]">
            הזמנות דיגיטליות, אישורי הגעה, הודעות WhatsApp/SMS, הושבה חכמה
            וניהול אירוע — הכל במקום אחד.
          </p>

          {/* בחירת רשומות */}
          <div className="mx-auto mt-8 max-w-[520px] rounded-[30px] border border-[#D9C0A0] bg-[#FFFDF9]/90 p-4 shadow-[0_22px_55px_rgba(91,64,35,0.11)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-center gap-2 text-sm font-black text-[#5A3E25]">
              <Users size={18} className="text-[#B88945]" />
              בחרו כמות רשומות לאירוע
            </div>

            <select
              value={records ?? ""}
              onChange={(e) => setRecords(Number(e.target.value))}
              className="
                w-full rounded-[20px] border border-[#DDCBB3]
                bg-white/90 px-4 py-4 text-center
                text-base font-bold text-[#3E2D20]
                shadow-sm outline-none transition
                focus:border-[#C9A46A]
                focus:ring-4 focus:ring-[#D8B16A]/15
              "
            >
              <option value="" disabled>
                בחרו כמות רשומות
              </option>

              {options.map((num) => (
                <option key={num} value={num}>
                  עד {num} רשומות
                </option>
              ))}
            </select>

            <p className="mt-3 text-xs leading-5 text-[#9C866D]">
              המחיר מתעדכן אוטומטית לפי כמות הרשומות והתוספות שתבחרו.
            </p>
          </div>
        </div>
      </section>

      {/* CARDS */}
      <section className="relative z-10 px-5 pb-28 pt-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-3 lg:items-stretch">
          {(["plan1", "plan2", "plan3"] as PlanKey[]).map((plan) => {
            const features = getPlanFeatures(plan);
            const meta = planMeta[plan];
            const maxFeatureRows = 8;
            const fillers = Math.max(0, maxFeatureRows - features.length);
            const total = calculateTotal(plan);

            return (
              <Card
                key={plan}
                className={`
                  group relative h-full overflow-visible rounded-[36px]
                  border bg-[#FFFDF9]/94
                  shadow-[0_24px_70px_rgba(91,64,35,0.12)]
                  backdrop-blur-xl transition-all duration-300
                  hover:-translate-y-2 hover:shadow-[0_32px_90px_rgba(91,64,35,0.18)]
                  ${
                    meta.highlight
                      ? "border-[#C89545] ring-4 ring-[#D8B16A]/15 lg:scale-[1.025]"
                      : "border-[#D9C0A0]"
                  }
                `}
              >
                

                <CardContent className="relative flex h-full flex-col rounded-[36px] p-6 pt-32 sm:p-7 sm:pt-36">
                  {/* רקעים פנימיים בלי overflow-hidden כדי שהאייקון לא ייחתך */}
                  <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.24))]" />
                  <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-[#F2DEC4]/36 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-[#EED7BC]/28 blur-3xl" />

                  {/* אייקון — לא נחתך */}
                  <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-[38%]">
  <div className="relative h-[190px] w-[190px] sm:h-[220px] sm:w-[220px]">
    <Image
      src={meta.icon}
      alt={meta.alt}
      fill
      className="object-contain drop-shadow-[0_20px_28px_rgba(95,61,26,0.18)] transition duration-300 group-hover:scale-105"
      sizes="220px"
      priority={plan === "plan2"}
    />
  </div>
</div>

                  <div className="relative z-10 flex h-full flex-col">
                    {/* Header */}
                    <div className="text-center">
                      <span className="inline-flex rounded-full border border-[#E4D0B6] bg-[#FFF8EE] px-4 py-1.5 text-xs font-black text-[#9A672B]">
                        {meta.badge}
                      </span>

                      <h3 className="mt-5 text-3xl font-black leading-tight text-[#8A4E19]">
                        {meta.title}
                      </h3>

                      <p className="mx-auto mt-3 min-h-[48px] max-w-xs text-sm leading-6 text-[#7B6754]">
                        {meta.subtitle}
                      </p>

                      <div className="mt-5 rounded-[26px] border border-[#E8D9C7] bg-white/70 px-4 py-5 shadow-[0_12px_30px_rgba(91,64,35,0.07)]">
                        {records ? (
                          <>
                            <p className="text-xs font-bold text-[#9C866D]">
                              סה״כ לתשלום
                            </p>

                            <div className="mt-2 flex items-end justify-center gap-1">
                              <span className="text-5xl font-black leading-none text-[#3E2D20]">
                                ₪{total}
                              </span>
                            </div>

                            <p className="mt-2 text-xs text-[#9C866D]">
                              עד {records} רשומות
                            </p>
                          </>
                        ) : (
                          <div className="py-2">
                            <p className="text-lg font-black text-[#B0A090]">
                              בחרו כמות רשומות
                            </p>
                            <p className="mt-2 text-xs text-[#9C866D]">
                              לאחר הבחירה יוצג המחיר המדויק
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="mt-7 space-y-3" style={{ minHeight: 285 }}>
                      {features.map((item, idx) => (
                        <li
                          key={`${plan}-feature-${idx}`}
                          className="flex gap-3 rounded-[16px] bg-white/48 px-3 py-2 text-sm leading-6 text-[#5A3E25]"
                        >
                          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF4E2] text-[#A86F2B]">
                            <Check size={14} />
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}

                      {Array.from({ length: fillers }).map((_, idx) => (
                        <li
                          key={`${plan}-filler-${idx}`}
                          className="flex gap-3 rounded-[16px] px-3 py-2 text-sm leading-6 opacity-0"
                          aria-hidden="true"
                        >
                          <Check size={14} />
                          <span>placeholder</span>
                        </li>
                      ))}
                    </ul>

                    {/* Addons */}
                    {renderAddons(plan)}

                    {/* Button */}
                    <Button
                      className="
                        mt-7 h-auto w-full rounded-[22px]
                        bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F]
                        px-6 py-4 text-base font-black text-white
                        shadow-[0_16px_32px_rgba(168,111,43,0.24)]
                        transition duration-200
                        hover:-translate-y-0.5
                        hover:shadow-[0_20px_38px_rgba(168,111,43,0.3)]
                      "
                      onClick={() => handleRegister(plan)}
                    >
                      הרשמה והמשך לתשלום
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}