/* =========================================================
   ADMIN PACKAGES / PRICING SOURCE
   מבוסס על עמוד החבילות האמיתי באתר:
   - רשומות בקפיצות של 50
   - מחיר לפי rate לכל חבילה
   - מחיר בסיס = Math.round(records * rate)
========================================================= */

export type AdminPackageKey = "plan1" | "plan2" | "plan3";
export type AddonKey = "credit" | "seating" | "system" | "design";

export type AdminPricingPlan = {
  key: AdminPackageKey;
  label: string;
  title: string;
  subtitle: string;
  badge: string;

  includeCalls: boolean;
  includeCreditGifts: boolean;
  includeDigitalSeating: boolean;
  includeEventManagement: boolean;
  includeCustomDesign: boolean;
};

export type AdminRecordOption = {
  key: string;
  label: string;
  records: number;
  sms: number;
  prices: Record<AdminPackageKey, number>;
};

export type AdminPackagesConfig = {
  plans: AdminPricingPlan[];
  recordOptions: AdminRecordOption[];
  addonPrices: Record<AdminPackageKey, Record<AddonKey, number>>;
};

/* =========================================================
   PRICE RATES – מתוך עמוד pricing
========================================================= */

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

const PLAN_RATES: Record<AdminPackageKey, [number, number][]> = {
  plan1: plan1Rates,
  plan2: plan2Rates,
  plan3: plan3Rates,
};

const RECORD_OPTIONS = Array.from({ length: 16 }, (_, index) => {
  return (index + 1) * 50;
});

/* =========================================================
   HELPERS
========================================================= */

export function getRate(plan: AdminPackageKey, records: number) {
  const table = PLAN_RATES[plan];

  for (const [limit, rate] of table) {
    if (records <= limit) return rate;
  }

  return table[table.length - 1][1];
}

export function calculateBase(plan: AdminPackageKey, records: number) {
  return Math.round(records * getRate(plan, records));
}

export function getAddonPrices(plan: AdminPackageKey) {
  if (plan === "plan1") {
    return {
      credit: 150,
      seating: 100,
      system: 200,
      design: 200,
    };
  }

  if (plan === "plan2") {
    return {
      credit: 100,
      seating: 80,
      system: 150,
      design: 150,
    };
  }

  return {
    credit: 0,
    seating: 0,
    system: 100,
    design: 100,
  };
}

function toPlanKey(value?: string | null): AdminPackageKey {
  if (value === "plan2") return "plan2";
  if (value === "plan3") return "plan3";
  return "plan1";
}

/**
 * חשוב:
 * אם למשתמש יש 270 רשומות, זה לא מדרגה באתר.
 * זה אומר שהוא היה על מדרגה רשמית, למשל 250,
 * ועוד 20 רשומות ידניות.
 *
 * לכן פה מחפשים את מדרגת הבסיס הרשמית הכי קרובה כלפי מטה.
 */
export function getOfficialRecordOption(records?: number | null) {
  const safeRecords = Number(records || 0);

  if (!safeRecords) {
    return RECORD_OPTIONS[0];
  }

  const exact = RECORD_OPTIONS.find((item) => item === safeRecords);

  if (exact) {
    return exact;
  }

  const lowerOptions = RECORD_OPTIONS.filter((item) => item < safeRecords);

  return lowerOptions[lowerOptions.length - 1] || RECORD_OPTIONS[0];
}

export function getExtraRecords(records?: number | null) {
  const safeRecords = Number(records || 0);
  const officialRecords = getOfficialRecordOption(safeRecords);

  return Math.max(0, safeRecords - officialRecords);
}

export function getAdminPrice(params: {
  planKey?: string | null;
  records?: number | null;
}) {
  const planKey = toPlanKey(params.planKey);
  const officialRecords = getOfficialRecordOption(params.records);

  return calculateBase(planKey, officialRecords);
}

/* =========================================================
   CONFIG
========================================================= */

export const ADMIN_PACKAGES: AdminPackagesConfig = {
  plans: [
    {
      key: "plan1",
      label: "חבילה 1",
      title: "קל להזמין",
      subtitle: "הבסיס המושלם להזמנה דיגיטלית ואישורי הגעה",
      badge: "מתאים לאירוע פשוט",

      includeCalls: false,
      includeCreditGifts: false,
      includeDigitalSeating: false,
      includeEventManagement: false,
      includeCustomDesign: false,
    },
    {
      key: "plan2",
      label: "חבילה 2",
      title: "מזמינים חכם",
      subtitle: "כולל מוקד טלפוני וניהול אישורי הגעה מלא",
      badge: "הבחירה הפופולרית",

      includeCalls: true,
      includeCreditGifts: false,
      includeDigitalSeating: false,
      includeEventManagement: false,
      includeCustomDesign: false,
    },
    {
      key: "plan3",
      label: "חבילה 3",
      title: "מזמינים ומושיבים",
      subtitle: "הפתרון המלא כולל הושבה חכמה ושולחנות",
      badge: "הכי מקיף",

      includeCalls: true,
      includeCreditGifts: false,
      includeDigitalSeating: true,
      includeEventManagement: false,
      includeCustomDesign: false,
    },
  ],

  recordOptions: RECORD_OPTIONS.map((records) => ({
    key: `records_${records}`,
    label: `עד ${records} רשומות`,
    records,
    sms: records * 3,
    prices: {
      plan1: calculateBase("plan1", records),
      plan2: calculateBase("plan2", records),
      plan3: calculateBase("plan3", records),
    },
  })),

  addonPrices: {
    plan1: getAddonPrices("plan1"),
    plan2: getAddonPrices("plan2"),
    plan3: getAddonPrices("plan3"),
  },
};

/* =========================================================
   BACKWARD COMPATIBILITY
========================================================= */

export function getAdminPlan(key?: string | null) {
  const planKey = toPlanKey(key);

  return (
    ADMIN_PACKAGES.plans.find((item) => item.key === planKey) ||
    ADMIN_PACKAGES.plans[0]
  );
}

export function getAdminRecordOption(records?: number | null) {
  const officialRecords = getOfficialRecordOption(records);

  return (
    ADMIN_PACKAGES.recordOptions.find(
      (item) => item.records === officialRecords
    ) || ADMIN_PACKAGES.recordOptions[0]
  );
}

export function getAdminPackage(key?: string | null, records?: number | null) {
  const plan = getAdminPlan(key);
  const recordOption = getAdminRecordOption(records);

  return {
    key: plan.key,
    label: plan.label,
    records: recordOption.records,
    sms: recordOption.sms,
    price: recordOption.prices[plan.key],

    includeCalls: plan.includeCalls,
    includeCreditGifts: plan.includeCreditGifts,
    includeDigitalSeating: plan.includeDigitalSeating,
    includeEventManagement: plan.includeEventManagement,
    includeCustomDesign: plan.includeCustomDesign,
  };
}