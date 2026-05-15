/* =========================================================
   ADMIN PACKAGES / PRICING SOURCE
   מקור אחד לאדמין:
   1. plans = סוגי חבילות
   2. recordOptions = מדרגות רשומות כמו בעמוד החבילות באתר
========================================================= */

export type AdminPackageKey = "plan1" | "plan2" | "plan3";

export type AdminPricingPlan = {
  key: AdminPackageKey;
  label: string;

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

  /**
   * מחיר לפי חבילה.
   * זה מה שהאדמין משתמש בו כדי לחשב הפרש:
   * מחיר חדש פחות מחיר נוכחי.
   */
  prices: Record<AdminPackageKey, number>;
};

export type AdminPackagesConfig = {
  plans: AdminPricingPlan[];
  recordOptions: AdminRecordOption[];
};

/* =========================================================
   PRICING CONFIG
   כאן צריך להיות בדיוק לפי עמוד החבילות באתר.
========================================================= */

export const ADMIN_PACKAGES: AdminPackagesConfig = {
  plans: [
    {
      key: "plan1",
      label: "חבילה 1",
      includeCalls: false,
      includeCreditGifts: false,
      includeDigitalSeating: false,
      includeEventManagement: false,
      includeCustomDesign: false,
    },
    {
      key: "plan2",
      label: "חבילה 2",
      includeCalls: true,
      includeCreditGifts: false,
      includeDigitalSeating: false,
      includeEventManagement: false,
      includeCustomDesign: false,
    },
    {
      key: "plan3",
      label: "חבילה 3",
      includeCalls: true,
      includeCreditGifts: true,
      includeDigitalSeating: true,
      includeEventManagement: true,
      includeCustomDesign: false,
    },
  ],

  recordOptions: [
    {
      key: "records_100",
      label: "עד 100 רשומות",
      records: 100,
      sms: 300,
      prices: {
        plan1: 0,
        plan2: 0,
        plan3: 0,
      },
    },
    {
      key: "records_150",
      label: "עד 150 רשומות",
      records: 150,
      sms: 450,
      prices: {
        plan1: 0,
        plan2: 0,
        plan3: 0,
      },
    },
    {
      key: "records_200",
      label: "עד 200 רשומות",
      records: 200,
      sms: 600,
      prices: {
        plan1: 0,
        plan2: 0,
        plan3: 0,
      },
    },
    {
      key: "records_250",
      label: "עד 250 רשומות",
      records: 250,
      sms: 750,
      prices: {
        plan1: 0,
        plan2: 0,
        plan3: 0,
      },
    },
    {
      key: "records_270",
      label: "עד 270 רשומות",
      records: 270,
      sms: 810,
      prices: {
        plan1: 0,
        plan2: 0,
        plan3: 1171,
      },
    },
    {
      key: "records_300",
      label: "עד 300 רשומות",
      records: 300,
      sms: 900,
      prices: {
        plan1: 0,
        plan2: 0,
        plan3: 0,
      },
    },
  ],
};

/* =========================================================
   HELPERS
========================================================= */

export function getAdminPlan(key?: string | null) {
  return (
    ADMIN_PACKAGES.plans.find((item) => item.key === key) ||
    ADMIN_PACKAGES.plans[0]
  );
}

export function getAdminRecordOption(records?: number | null) {
  const safeRecords = Number(records || 0);

  if (!safeRecords) {
    return ADMIN_PACKAGES.recordOptions[0];
  }

  return (
    ADMIN_PACKAGES.recordOptions.find(
      (item) => item.records === safeRecords
    ) ||
    ADMIN_PACKAGES.recordOptions.find(
      (item) => item.records >= safeRecords
    ) ||
    ADMIN_PACKAGES.recordOptions[ADMIN_PACKAGES.recordOptions.length - 1]
  );
}

export function getAdminPrice(params: {
  planKey?: string | null;
  records?: number | null;
}) {
  const planKey = (params.planKey || "plan1") as AdminPackageKey;
  const recordOption = getAdminRecordOption(params.records);

  return Number(recordOption?.prices?.[planKey] || 0);
}

/* =========================================================
   BACKWARD COMPATIBILITY
   אם יש קוד ישן שקורא getAdminPackage
========================================================= */

export function getAdminPackage(key?: string | null) {
  const plan = getAdminPlan(key);

  const firstRecordOption = ADMIN_PACKAGES.recordOptions[0];

  return {
    key: plan.key,
    label: plan.label,
    records: firstRecordOption.records,
    sms: firstRecordOption.sms,
    price: firstRecordOption.prices[plan.key] || 0,

    includeCalls: plan.includeCalls,
    includeCreditGifts: plan.includeCreditGifts,
    includeDigitalSeating: plan.includeDigitalSeating,
    includeEventManagement: plan.includeEventManagement,
    includeCustomDesign: plan.includeCustomDesign,
  };
}