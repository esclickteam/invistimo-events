import { NextResponse } from "next/server";
import { ADMIN_PACKAGES } from "@/lib/adminPackages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   TYPES
========================================================= */
type RawAdminPackage = {
  key?: string;
  planKey?: string;
  label?: string;
  planLabel?: string;

  records?: number;
  maxGuests?: number;
  guests?: number;

  sms?: number;
  smsLimit?: number;
  maxMessages?: number;

  price?: number;
  prices?: Record<string, number>;

  includeCalls?: boolean;
  includeCreditGifts?: boolean;
  includeDigitalSeating?: boolean;
  includeEventManagement?: boolean;
  includeCustomDesign?: boolean;
};

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
  prices: Record<string, number>;
};

/* =========================================================
   HELPERS
========================================================= */
function toNumber(value: unknown, fallback = 0) {
  const num = Number(value);

  if (!Number.isFinite(num)) return fallback;

  return num;
}

function normalizePlanKey(value: unknown) {
  return String(value || "").trim();
}

function normalizeLabel(value: unknown, fallback: string) {
  const text = String(value || "").trim();

  return text || fallback;
}

function sortByRecords(a: AdminRecordOption, b: AdminRecordOption) {
  return a.records - b.records;
}

function sortPlans(a: AdminPricingPlan, b: AdminPricingPlan) {
  return a.key.localeCompare(b.key, "he");
}

/* =========================================================
   BUILD FROM ADMIN_PACKAGES
   תומך בכמה מבנים כדי לא לשבור את הקיים:
   1. ADMIN_PACKAGES = { plans, recordOptions }
   2. ADMIN_PACKAGES = array של packages
   3. package עם prices לפי plan
   4. package רגיל עם key/price/records
========================================================= */
function buildPricingData() {
  const source: any = ADMIN_PACKAGES as any;

  /* =====================================================
     CASE 1:
     אם lib/adminPackages כבר מחזיר מבנה חדש:
     {
       plans: [...],
       recordOptions: [...]
     }
  ===================================================== */
  if (
    source &&
    !Array.isArray(source) &&
    Array.isArray(source.plans) &&
    Array.isArray(source.recordOptions)
  ) {
    return {
      plans: source.plans as AdminPricingPlan[],
      recordOptions: source.recordOptions as AdminRecordOption[],
      packages: source,
    };
  }

  const rawPackages: RawAdminPackage[] = Array.isArray(source) ? source : [];

  const plansMap = new Map<string, AdminPricingPlan>();
  const recordOptionsMap = new Map<number, AdminRecordOption>();

  for (const item of rawPackages) {
    const planKey = normalizePlanKey(item.planKey || item.key);
    const planLabel = normalizeLabel(
      item.planLabel || item.label,
      planKey || "חבילה"
    );

    const records = toNumber(
      item.records ?? item.maxGuests ?? item.guests,
      0
    );

    const sms = toNumber(
      item.sms ?? item.smsLimit ?? item.maxMessages,
      0
    );

    const price = toNumber(item.price, 0);

    /* =====================================================
       PLAN
    ===================================================== */
    if (planKey) {
      const existingPlan = plansMap.get(planKey);

      plansMap.set(planKey, {
        key: planKey,
        label: existingPlan?.label || planLabel,

        includeCalls:
          Boolean(existingPlan?.includeCalls) ||
          Boolean(item.includeCalls),

        includeCreditGifts:
          Boolean(existingPlan?.includeCreditGifts) ||
          Boolean(item.includeCreditGifts),

        includeDigitalSeating:
          Boolean(existingPlan?.includeDigitalSeating) ||
          Boolean(item.includeDigitalSeating),

        includeEventManagement:
          Boolean(existingPlan?.includeEventManagement) ||
          Boolean(item.includeEventManagement),

        includeCustomDesign:
          Boolean(existingPlan?.includeCustomDesign) ||
          Boolean(item.includeCustomDesign),
      });
    }

    /* =====================================================
       RECORD OPTIONS
       אם item.prices קיים — זה כבר מחירון לפי חבילות.
       אם אין item.prices — נכניס price לפי planKey.
    ===================================================== */
    if (records > 0) {
      const existingOption = recordOptionsMap.get(records);

      const nextPrices: Record<string, number> = {
        ...(existingOption?.prices || {}),
      };

      if (item.prices && typeof item.prices === "object") {
        for (const [key, value] of Object.entries(item.prices)) {
          nextPrices[key] = toNumber(value, 0);

          if (!plansMap.has(key)) {
            plansMap.set(key, {
              key,
              label: key,
              includeCalls: false,
              includeCreditGifts: false,
              includeDigitalSeating: false,
              includeEventManagement: false,
              includeCustomDesign: false,
            });
          }
        }
      } else if (planKey) {
        nextPrices[planKey] = price;
      }

      recordOptionsMap.set(records, {
        key: String(existingOption?.key || item.key || records),
        label:
          existingOption?.label ||
          normalizeLabel(item.label, `עד ${records} רשומות`),
        records,
        sms: existingOption?.sms || sms,
        prices: nextPrices,
      });
    }
  }

  const plans = Array.from(plansMap.values()).sort(sortPlans);
  const recordOptions = Array.from(recordOptionsMap.values()).sort(
    sortByRecords
  );

  return {
    plans,
    recordOptions,
    packages: rawPackages,
  };
}

/* =========================================================
   GET – ADMIN PACKAGES
========================================================= */
export async function GET() {
  try {
    const { plans, recordOptions, packages } = buildPricingData();

    return NextResponse.json(
      {
        success: true,

        // ✅ החדש — לזה הדשבורד המעודכן צריך להתחבר
        plans,
        recordOptions,

        // ✅ תאימות לאחור — לא לשבור קוד קיים
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