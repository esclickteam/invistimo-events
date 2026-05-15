import { NextResponse } from "next/server";
import { ADMIN_PACKAGES } from "@/lib/adminPackages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   TYPES
========================================================= */
type AdminPricingPlan = {
  key: string;
  label: string;

  includeCalls: boolean;
  includeCreditGifts: boolean;
  includeDigitalSeating: boolean;
  includeEventManagement: boolean;
  includeCustomDesign: boolean;
};

type AdminRecordOption = {
  key: string;
  label: string;
  records: number;
  sms: number;

  /**
   * prices לפי חבילה:
   * {
   *   plan1: 402,
   *   plan2: 789,
   *   plan3: 1171
   * }
   */
  prices: Record<string, number>;
};

type AdminPackagesSource = {
  plans?: AdminPricingPlan[];
  recordOptions?: AdminRecordOption[];
  packages?: unknown[];
};

/* =========================================================
   HELPERS
========================================================= */
function toNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true";
}

function normalizePlan(plan: any): AdminPricingPlan | null {
  const key = normalizeText(plan?.key || plan?.planKey || plan?.id);
  const label = normalizeText(plan?.label || plan?.name || plan?.title);

  if (!key || !label) return null;

  return {
    key,
    label,

    includeCalls: normalizeBoolean(plan?.includeCalls),
    includeCreditGifts: normalizeBoolean(plan?.includeCreditGifts),
    includeDigitalSeating: normalizeBoolean(plan?.includeDigitalSeating),
    includeEventManagement: normalizeBoolean(plan?.includeEventManagement),
    includeCustomDesign: normalizeBoolean(plan?.includeCustomDesign),
  };
}

function normalizeRecordOption(option: any): AdminRecordOption | null {
  const records = toNumber(
    option?.records ?? option?.maxGuests ?? option?.guests,
    0
  );

  if (!records) return null;

  const prices =
    option?.prices && typeof option.prices === "object"
      ? Object.fromEntries(
          Object.entries(option.prices).map(([key, value]) => [
            key,
            toNumber(value, 0),
          ])
        )
      : {};

  return {
    key: normalizeText(option?.key || option?.id || records),
    label:
      normalizeText(option?.label || option?.title || option?.name) ||
      `עד ${records} רשומות`,

    records,
    sms: toNumber(option?.sms ?? option?.smsLimit ?? option?.maxMessages, 0),

    prices,
  };
}

function sortPlans(a: AdminPricingPlan, b: AdminPricingPlan) {
  return a.key.localeCompare(b.key, "he");
}

function sortRecordOptions(a: AdminRecordOption, b: AdminRecordOption) {
  return a.records - b.records;
}

/* =========================================================
   BUILD PRICING DATA
========================================================= */
function buildPricingData() {
  const source = ADMIN_PACKAGES as AdminPackagesSource | any[];

  /**
   * המבנה הנכון:
   * ADMIN_PACKAGES = {
   *   plans: [...],
   *   recordOptions: [...]
   * }
   */
  if (!Array.isArray(source)) {
    const plans = Array.isArray(source?.plans)
      ? source.plans.map(normalizePlan).filter(Boolean)
      : [];

    const recordOptions = Array.isArray(source?.recordOptions)
      ? source.recordOptions.map(normalizeRecordOption).filter(Boolean)
      : [];

    return {
      plans: plans.sort(sortPlans),
      recordOptions: recordOptions.sort(sortRecordOptions),
      packages: source?.packages || [],
    };
  }

  /**
   * תאימות לאחור בלבד:
   * אם ADMIN_PACKAGES הוא מערך ישן, ננסה לבנות ממנו.
   * אבל כדי שזה יהיה כמו עמוד pricing, עדיף לעדכן את lib/adminPackages.ts
   * למבנה החדש עם plans + recordOptions.
   */
  const plansMap = new Map<string, AdminPricingPlan>();
  const recordsMap = new Map<number, AdminRecordOption>();

  for (const item of source as any[]) {
    const planKey = normalizeText(item?.planKey || item?.key);
    const planLabel = normalizeText(item?.planLabel || item?.label);

    const records = toNumber(
      item?.records ?? item?.maxGuests ?? item?.guests,
      0
    );

    const sms = toNumber(item?.sms ?? item?.smsLimit ?? item?.maxMessages, 0);
    const price = toNumber(item?.price, 0);

    if (planKey) {
      const existing = plansMap.get(planKey);

      plansMap.set(planKey, {
        key: planKey,
        label: existing?.label || planLabel || planKey,

        includeCalls:
          Boolean(existing?.includeCalls) || normalizeBoolean(item?.includeCalls),

        includeCreditGifts:
          Boolean(existing?.includeCreditGifts) ||
          normalizeBoolean(item?.includeCreditGifts),

        includeDigitalSeating:
          Boolean(existing?.includeDigitalSeating) ||
          normalizeBoolean(item?.includeDigitalSeating),

        includeEventManagement:
          Boolean(existing?.includeEventManagement) ||
          normalizeBoolean(item?.includeEventManagement),

        includeCustomDesign:
          Boolean(existing?.includeCustomDesign) ||
          normalizeBoolean(item?.includeCustomDesign),
      });
    }

    if (records) {
      const existing = recordsMap.get(records);

      recordsMap.set(records, {
        key: existing?.key || String(records),
        label: existing?.label || `עד ${records} רשומות`,
        records,
        sms: existing?.sms || sms,
        prices: {
          ...(existing?.prices || {}),
          ...(item?.prices || {}),
          ...(planKey ? { [planKey]: price } : {}),
        },
      });
    }
  }

  return {
    plans: Array.from(plansMap.values()).sort(sortPlans),
    recordOptions: Array.from(recordsMap.values()).sort(sortRecordOptions),
    packages: source,
  };
}

/* =========================================================
   GET
========================================================= */
export async function GET() {
  try {
    const { plans, recordOptions, packages } = buildPricingData();

    return NextResponse.json(
      {
        success: true,

        /**
         * ✅ הדרופדאון הראשון:
         * חבילה 1 / חבילה 2 / חבילה 3
         */
        plans,

        /**
         * ✅ הדרופדאון השני:
         * עד 100 / עד 150 / עד 250 וכו׳
         * כל שורה כוללת מחיר לפי החבילה שנבחרה.
         */
        recordOptions,

        /**
         * תאימות לאחור בלבד
         */
        packages,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("❌ ADMIN PACKAGES ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "ADMIN_PACKAGES_FAILED",
      },
      { status: 500 }
    );
  }
}