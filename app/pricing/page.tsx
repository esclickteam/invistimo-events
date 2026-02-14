"use client";

import { useMemo, useState } from "react";
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

/* ================= TYPES ================= */

type PlanKey = "plan1" | "plan2" | "plan3";

type PlanConfig = {
  title: string;
  highlight?: boolean;
  creditPrice: number;
  selfManagePrice: number;
};

/* ================= PLAN CONFIG ================= */

const PLANS: Record<PlanKey, PlanConfig> = {
  plan1: {
    title: "חבילה 1 – אישורים בהודעות",
    creditPrice: 150,
    selfManagePrice: 150,
  },
  plan2: {
    title: "חבילה 2 – מוקד אנושי",
    creditPrice: 75,
    selfManagePrice: 100,
    highlight: true,
  },
  plan3: {
    title: "חבילה 3 – מוקד + הושבה",
    creditPrice: 0,
    selfManagePrice: 70,
  },
};

/* ================= PRICE HELPERS ================= */

function getPlan1Rate(records: number) {
  if (records <= 150) return 1.3;
  if (records <= 300) return 1.2;
  if (records <= 500) return 1.1;
  return 0.95;
}

function getPlan2Rate(records: number) {
  if (records <= 150) return 2.1;
  if (records <= 300) return 1.95;
  if (records <= 500) return 1.8;
  return 1.65;
}

function calculateBasePrice(plan: PlanKey, records: number) {
  if (plan === "plan1") {
    return Math.round(records * getPlan1Rate(records));
  }

  if (plan === "plan2") {
    return Math.round(records * getPlan2Rate(records));
  }

  // plan3 = plan2 + 0.3 לרשומה
  return Math.round(records * (getPlan2Rate(records) + 0.3));
}

/* ================= COMPONENT ================= */

export default function PricingPage() {
  const router = useRouter();

  const guestOptions = Array.from({ length: 20 }, (_, i) => (i + 1) * 50);

  const [guests, setGuests] = useState<number>(150);

  const [selectedPlans, setSelectedPlans] = useState<
    Record<PlanKey, { credit: boolean; selfManage: boolean }>
  >({
    plan1: { credit: false, selfManage: false },
    plan2: { credit: false, selfManage: false },
    plan3: { credit: false, selfManage: false },
  });

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleRegister = (planKey: PlanKey, total: number) => {
    router.push(`/register?plan=${planKey}&guests=${guests}&price=${total}`);
  };

  return (
    <main className="min-h-screen bg-[#f7f3ee] text-[#4a413a]">

      {/* HERO */}
      <section className="pt-40 pb-32 text-center px-6">
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-4xl md:text-5xl font-semibold mb-6"
        >
          בחרו את החבילה שמתאימה לכם
        </motion.h1>

        <Button
          size="lg"
          className="rounded-full px-12 py-6 text-lg"
          onClick={scrollToPricing}
        >
          לצפייה בחבילות
        </Button>
      </section>

      {/* PRICING */}
      <section id="pricing" className="pb-32 px-6">
        <div className="max-w-6xl mx-auto">

          {/* GUEST DROPDOWN */}
          <div className="mb-12 max-w-md mx-auto">
            <label className="block mb-3 text-center font-medium">
              בחרו כמות אורחים
            </label>

            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full rounded-xl p-3 bg-white border"
            >
              {guestOptions.map((num) => (
                <option key={num} value={num}>
                  עד {num} אורחים
                </option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-3 gap-10">

            {(Object.keys(PLANS) as PlanKey[]).map((planKey) => {
              const plan = PLANS[planKey];

              const basePrice = calculateBasePrice(planKey, guests);

              const creditPrice =
                selectedPlans[planKey].credit ? plan.creditPrice : 0;

              const selfManagePrice =
                selectedPlans[planKey].selfManage
                  ? plan.selfManagePrice
                  : 0;

              const total = basePrice + creditPrice + selfManagePrice;

              return (
                <motion.div
                  key={planKey}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <Card
                    className={`rounded-3xl shadow-xl h-full ${
                      plan.highlight ? "border-2 border-[#c3a98c]" : ""
                    }`}
                  >
                    <CardContent className="p-8 flex flex-col h-full">

                      <h3 className="text-2xl font-semibold mb-6 text-center">
                        {plan.title}
                      </h3>

                      <div className="text-center mb-6">
                        <span className="text-3xl font-bold">
                          ₪{total}
                        </span>
                        <div className="text-sm opacity-70 mt-2">
                          תשלום חד פעמי
                        </div>
                      </div>

                      <ul className="space-y-3 mb-8 text-sm">
                        <li className="flex gap-2">
                          <Check size={16} />
                          הזמנה דיגיטלית מלאה
                        </li>
                        <li className="flex gap-2">
                          <Check size={16} />
                          מערכת RSVP מתקדמת
                        </li>
                        {planKey !== "plan1" && (
                          <li className="flex gap-2">
                            <Check size={16} />
                            מוקד אנושי לאישורים
                          </li>
                        )}
                        {planKey === "plan3" && (
                          <li className="flex gap-2">
                            <Check size={16} />
                            מערכת סידורי הושבה מתקדמת
                          </li>
                        )}
                      </ul>

                      {/* CREDIT */}
                      <div className="mb-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPlans[planKey].credit}
                            onChange={(e) =>
                              setSelectedPlans((prev) => ({
                                ...prev,
                                [planKey]: {
                                  ...prev[planKey],
                                  credit: e.target.checked,
                                },
                              }))
                            }
                          />
                          מתנות באשראי
                          <span className="text-sm opacity-70">
                            {plan.creditPrice === 0
                              ? "כלול"
                              : `+ ₪${plan.creditPrice}`}
                          </span>
                        </label>
                      </div>

                      {/* SELF MANAGE */}
                      <div className="mb-8">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPlans[planKey].selfManage}
                            onChange={(e) =>
                              setSelectedPlans((prev) => ({
                                ...prev,
                                [planKey]: {
                                  ...prev[planKey],
                                  selfManage: e.target.checked,
                                },
                              }))
                            }
                          />
                          ניהול אירוע עצמאי
                          <span className="text-sm opacity-70">
                            + ₪{plan.selfManagePrice}
                          </span>
                        </label>
                      </div>

                      <div className="mt-auto">
                        <Button
                          className="w-full rounded-full py-5"
                          onClick={() => handleRegister(planKey, total)}
                        >
                          הרשמה
                        </Button>
                      </div>

                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

          </div>
        </div>
      </section>
    </main>
  );
}
