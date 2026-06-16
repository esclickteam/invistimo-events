"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const VAT_RATE = 0.18;
const COMMISSION_RATE = 0.05;

/**
 * חשוב:
 * כרגע המחירים מוגדרים כאן כדי שהעובד לא יוכל לערוך מחיר במסך.
 * אם יש לך קובץ מרכזי של חבילות מעמוד המכירות הציבורי,
 * עדיף להעביר את PACKAGE_PLANS לשם ולייבא אותו גם לכאן וגם לעמוד החבילות.
 */

type PackageKey = "easy" | "smart" | "seating";

type PackageTier = {
  maxRecords: number;
  price: number;
};

type PackagePlan = {
  key: PackageKey;
  title: string;
  badge: string;
  shortDescription: string;
  includes: string[];
  tiers: PackageTier[];
};

type UpsellKey =
  | "venueSeatingSmall"
  | "venueSeatingTwoStaff"
  | "venueSeatingThreeStaff"
  | "personalRepresentative"
  | "thirdRsvpRound"
  | "suppliersBudgetSystem";

type UpsellItem = {
  key: UpsellKey;
  title: string;
  price: number;
  description: string;
  note?: string;
};

type SelectedUpsells = Record<UpsellKey, boolean>;

const PACKAGE_PLANS: PackagePlan[] = [
  {
    key: "easy",
    title: "קל להזמין",
    badge: "מתאים לאירוע פשוט",
    shortDescription: "הבסיס המושלם להזמנה דיגיטלית ואישורי הגעה",
    includes: [
      "הזמנה דיגיטלית מלאה",
      "שליחה ב־2 סבבי WhatsApp אוטומטיים לאישורי הגעה",
      "תזכורת SMS לקראת האירוע + מספר שולחן",
      "הודעת תודה לאחר האירוע ב־SMS",
    ],
    tiers: [
      { maxRecords: 50, price: 99 },
      { maxRecords: 100, price: 149 },
      { maxRecords: 150, price: 199 },
      { maxRecords: 200, price: 239 },
      { maxRecords: 250, price: 269 },
      { maxRecords: 300, price: 299 },
      { maxRecords: 350, price: 339 },
      { maxRecords: 400, price: 379 },
      { maxRecords: 450, price: 409 },
      { maxRecords: 500, price: 429 },
      { maxRecords: 550, price: 459 },
      { maxRecords: 600, price: 489 },
      { maxRecords: 650, price: 519 },
      { maxRecords: 700, price: 539 },
      { maxRecords: 750, price: 569 },
      { maxRecords: 800, price: 599 },
      { maxRecords: 850, price: 619 },
      { maxRecords: 900, price: 649 },
      { maxRecords: 950, price: 679 },
      { maxRecords: 1000, price: 699 },
    ],
  },
  {
    key: "smart",
    title: "מזמינים חכם",
    badge: "הבחירה הפופולרית",
    shortDescription: "כולל מוקד טלפוני וניהול אישורי הגעה מלא",
    includes: [
      "הזמנה דיגיטלית מלאה",
      "שליחה ב־2 סבבי WhatsApp אוטומטיים לאישורי הגעה",
      "תזכורת SMS לקראת האירוע + מספר שולחן",
      "הודעת תודה לאחר האירוע ב־SMS",
      "מוקד טלפוני מקצועי",
      "עד 3 ניסיונות חיוג לכל רשומה",
      "תיעוד ועדכון סטטוסים בזמן אמת",
    ],
    tiers: [
      { maxRecords: 50, price: 149 },
      { maxRecords: 100, price: 249 },
      { maxRecords: 150, price: 349 },
      { maxRecords: 200, price: 449 },
      { maxRecords: 250, price: 549 },
      { maxRecords: 300, price: 649 },
      { maxRecords: 350, price: 749 },
      { maxRecords: 400, price: 849 },
      { maxRecords: 450, price: 949 },
      { maxRecords: 500, price: 1049 },
      { maxRecords: 550, price: 1149 },
      { maxRecords: 600, price: 1249 },
      { maxRecords: 650, price: 1349 },
      { maxRecords: 700, price: 1449 },
      { maxRecords: 750, price: 1549 },
      { maxRecords: 800, price: 1649 },
      { maxRecords: 850, price: 1749 },
      { maxRecords: 900, price: 1849 },
      { maxRecords: 950, price: 1949 },
      { maxRecords: 1000, price: 2049 },
    ],
  },
  {
    key: "seating",
    title: "מזמינים ומושיבים",
    badge: "הכי מקיף",
    shortDescription: "הפתרון המלא כולל הושבה חכמה ושולחנות",
    includes: [
      "הזמנה דיגיטלית מלאה",
      "שליחה ב־2 סבבי WhatsApp אוטומטיים לאישורי הגעה",
      "תזכורת SMS לקראת האירוע + מספר שולחן",
      "הודעת תודה לאחר האירוע ב־SMS",
      "מוקד טלפוני מקצועי",
      "עד 3 ניסיונות חיוג לכל רשומה",
      "תיעוד ועדכון סטטוסים בזמן אמת",
      "מערכת הושבה חכמה",
    ],
    tiers: [
      { maxRecords: 50, price: 199 },
      { maxRecords: 100, price: 299 },
      { maxRecords: 150, price: 399 },
      { maxRecords: 200, price: 499 },
      { maxRecords: 250, price: 599 },
      { maxRecords: 300, price: 699 },
      { maxRecords: 350, price: 799 },
      { maxRecords: 400, price: 899 },
      { maxRecords: 450, price: 999 },
      { maxRecords: 500, price: 1099 },
      { maxRecords: 550, price: 1199 },
      { maxRecords: 600, price: 1299 },
      { maxRecords: 650, price: 1399 },
      { maxRecords: 700, price: 1499 },
      { maxRecords: 750, price: 1599 },
      { maxRecords: 800, price: 1699 },
      { maxRecords: 850, price: 1799 },
      { maxRecords: 900, price: 1899 },
      { maxRecords: 950, price: 1999 },
      { maxRecords: 1000, price: 2099 },
    ],
  },
];

const UPSELLS: UpsellItem[] = [
  {
    key: "venueSeatingSmall",
    title: "הושבה באולם — 2 אנשי צוות עד 200 מוזמנים",
    price: 1000,
    description: "שירות הושבה באולם לאירועים קטנים עד 200 מוזמנים.",
  },
  {
    key: "venueSeatingTwoStaff",
    title: "הושבה באולם — 2 אנשי צוות",
    price: 1600,
    description: "שירות הושבה באולם עם 2 אנשי צוות.",
  },
  {
    key: "venueSeatingThreeStaff",
    title: "הושבה באולם — 3 אנשי צוות",
    price: 2100,
    description: "שירות הושבה באולם עם 3 אנשי צוות.",
  },
  {
    key: "personalRepresentative",
    title: "נציג אישי לליווי",
    price: 450,
    description:
      "ליווי כולל מעבר ועדכון פעמיים בשבוע, עזרה בהושבה דיגיטלית מרחוק ובניית ההושבה לפי סקיצת האולם.",
  },
  {
    key: "thirdRsvpRound",
    title: "תוספת סבב 3 לאישורי הגעה",
    price: 90,
    description: "פתיחת סבב שלישי לאישורי הגעה.",
  },
  {
    key: "suppliersBudgetSystem",
    title: "מערכת עצמאית לניהול ספקים ותקציב",
    price: 200,
    description: "פתיחת אזור ניהול ספקים ותקציב ללקוח.",
    note: "ברכישות מעל 1,000 ₪ העובד רשאי לתת ללא עלות.",
  },
];

function asNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function money(value: unknown) {
  const amount = asNumber(value);

  return amount.toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  });
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function clampRecords(value: unknown) {
  const parsed = Math.floor(asNumber(value));

  if (parsed <= 0) return 1;
  if (parsed > 1000) return 1000;

  return parsed;
}

function getSelectedPlan(planKey: PackageKey) {
  return PACKAGE_PLANS.find((plan) => plan.key === planKey) || PACKAGE_PLANS[0];
}

function getTierForRecords(plan: PackagePlan, records: number) {
  const safeRecords = clampRecords(records);

  return (
    plan.tiers.find((tier) => safeRecords <= tier.maxRecords) ||
    plan.tiers[plan.tiers.length - 1]
  );
}

/**
 * דוגמה:
 * אם הלקוח בחר 530 רשומות — נבחרת מדרגת 550.
 * מחיר ממוצע לרשומה = מחיר מדרגת 550 / 550.
 * מחיר בפועל = מחיר ממוצע * 530.
 */
function calculatePackagePrice(plan: PackagePlan, records: number) {
  const safeRecords = clampRecords(records);
  const tier = getTierForRecords(plan, safeRecords);
  const pricePerRecord = tier.price / tier.maxRecords;
  const finalPrice = roundMoney(pricePerRecord * safeRecords);

  return {
    records: safeRecords,
    tierMaxRecords: tier.maxRecords,
    tierPrice: tier.price,
    pricePerRecord: roundMoney(pricePerRecord),
    finalPrice,
  };
}

function createEmptyUpsells(): SelectedUpsells {
  return {
    venueSeatingSmall: false,
    venueSeatingTwoStaff: false,
    venueSeatingThreeStaff: false,
    personalRepresentative: false,
    thirdRsvpRound: false,
    suppliersBudgetSystem: false,
  };
}

function calculateUpsellsTotal(
  selectedUpsells: SelectedUpsells,
  basePrice: number,
  suppliersBudgetFree: boolean,
) {
  return UPSELLS.reduce((sum, item) => {
    if (!selectedUpsells[item.key]) return sum;

    if (item.key === "suppliersBudgetSystem" && suppliersBudgetFree) {
      return sum;
    }

    return sum + item.price;
  }, 0);
}

function calculate(grossAmount: number) {
  const gross = Math.max(0, asNumber(grossAmount));
  const net = roundMoney(gross / (1 + VAT_RATE));
  const commission = roundMoney(net * COMMISSION_RATE);

  return {
    gross,
    net,
    commission,
  };
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "arrow"
    | "save"
    | "check"
    | "shield"
    | "spark"
    | "card"
    | "phone"
    | "lock";
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "save") {
    return (
      <svg {...common}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M17 21v-8H7v8" />
        <path d="M7 3v5h8" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg {...common}>
        <path d="M12 3 9.8 9.8 3 12l6.8 2.2L12 21l2.2-6.8L21 12l-6.8-2.2L12 3z" />
      </svg>
    );
  }

  if (name === "card") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.1 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.62a2 2 0 0 1-.45 2.11L9 10.7a16 16 0 0 0 4.3 4.3l1.25-1.25a2 2 0 0 1 2.11-.45c.84.29 1.72.5 2.62.62A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="4" y="11" width="16" height="10" rx="3" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function Pill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${className}`}
    >
      {children}
    </span>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[#eadfce] bg-white/80 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff3df] text-[#9b6a30]">
          {icon}
        </div>
        <div>
          <p className="text-sm font-black text-[#3f3327]">{title}</p>
          <div className="mt-1 text-xs font-semibold leading-6 text-[#7b6a58]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewEmployeeSalePage() {
  const router = useRouter();

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");

  const [selectedPlanKey, setSelectedPlanKey] = useState<PackageKey>("smart");
  const [records, setRecords] = useState("300");

  const [selectedUpsells, setSelectedUpsells] = useState<SelectedUpsells>(() =>
    createEmptyUpsells(),
  );
  const [suppliersBudgetFree, setSuppliersBudgetFree] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState<"stripe" | "paid">(
    "stripe",
  );

  const [saleSummary, setSaleSummary] = useState("");

  const [confirmRecordedCall, setConfirmRecordedCall] = useState(false);
  const [confirmCardOwner, setConfirmCardOwner] = useState(false);
  const [confirmSaleSummary, setConfirmSaleSummary] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedPlan = useMemo(
    () => getSelectedPlan(selectedPlanKey),
    [selectedPlanKey],
  );

  const packageCalculation = useMemo(() => {
    return calculatePackagePrice(selectedPlan, clampRecords(records));
  }, [records, selectedPlan]);

  const canGiveSuppliersBudgetFree =
    packageCalculation.finalPrice + calculateUpsellsTotal(selectedUpsells, packageCalculation.finalPrice, false) >=
    1000;

  const selectedUpsellsList = useMemo(() => {
    return UPSELLS.filter((upsell) => selectedUpsells[upsell.key]);
  }, [selectedUpsells]);

  const upsellsTotal = useMemo(() => {
    return calculateUpsellsTotal(
      selectedUpsells,
      packageCalculation.finalPrice,
      suppliersBudgetFree && canGiveSuppliersBudgetFree,
    );
  }, [
    canGiveSuppliersBudgetFree,
    packageCalculation.finalPrice,
    selectedUpsells,
    suppliersBudgetFree,
  ]);

  const finalGrossAmount = useMemo(() => {
    return roundMoney(packageCalculation.finalPrice + upsellsTotal);
  }, [packageCalculation.finalPrice, upsellsTotal]);

  const calculated = useMemo(() => {
    return calculate(finalGrossAmount);
  }, [finalGrossAmount]);

  const isSubmitDisabled =
    saving ||
    !clientName.trim() ||
    !clientEmail.trim() ||
    !clientPhone.trim() ||
    !saleSummary.trim() ||
    !confirmRecordedCall ||
    !confirmCardOwner ||
    !confirmSaleSummary ||
    !confirmTerms ||
    finalGrossAmount <= 0;

  function toggleUpsell(key: UpsellKey) {
    setSelectedUpsells((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
      };

      if (key === "suppliersBudgetSystem" && !next[key]) {
        setSuppliersBudgetFree(false);
      }

      return next;
    });
  }

  async function submitSale(event: React.FormEvent) {
    event.preventDefault();

    if (isSubmitDisabled) return;

    try {
      setError("");
      setSaving(true);

      const response = await fetch("/api/employee/sales", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          clientPhone: clientPhone.trim(),
          eventName: eventName.trim(),
          eventDate,

          plan: selectedPlan.key,
          packageName: selectedPlan.title,
          guests: packageCalculation.records,
          records: packageCalculation.records,

          grossAmount: finalGrossAmount,
          status: paymentStatus === "paid" ? "paid" : "pending",

          selectedPackage: {
            key: selectedPlan.key,
            title: selectedPlan.title,
            badge: selectedPlan.badge,
            includes: selectedPlan.includes,
            records: packageCalculation.records,
            tierMaxRecords: packageCalculation.tierMaxRecords,
            tierPrice: packageCalculation.tierPrice,
            pricePerRecord: packageCalculation.pricePerRecord,
            finalPrice: packageCalculation.finalPrice,
          },

          upsells: selectedUpsellsList.map((upsell) => ({
            key: upsell.key,
            title: upsell.title,
            description: upsell.description,
            originalPrice: upsell.price,
            price:
              upsell.key === "suppliersBudgetSystem" &&
              suppliersBudgetFree &&
              canGiveSuppliersBudgetFree
                ? 0
                : upsell.price,
            givenFree:
              upsell.key === "suppliersBudgetSystem" &&
              suppliersBudgetFree &&
              canGiveSuppliersBudgetFree,
          })),

          saleCompliance: {
            recordedCall: confirmRecordedCall,
            cardOwnerConfirmed: confirmCardOwner,
            saleSummaryConfirmed: confirmSaleSummary,
            termsConfirmed: confirmTerms,
            summary: saleSummary.trim(),
          },

          notes: saleSummary.trim(),

          payment: {
            method: paymentStatus,
            provider: paymentStatus === "stripe" ? "stripe" : "manual",
            amount: finalGrossAmount,
          },
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message || data?.error || "שגיאה ביצירת הלקוח והמכירה",
        );
      }

      if (paymentStatus === "stripe") {
        if (data?.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }

        if (data?.userId) {
          const checkoutResponse = await fetch(
            `/api/admin/users/${data.userId}/checkout`,
            {
              method: "POST",
              credentials: "include",
            },
          );

          const checkoutData = await checkoutResponse
            .json()
            .catch(() => null);

          if (checkoutData?.checkoutUrl) {
            window.location.href = checkoutData.checkoutUrl;
            return;
          }
        }

        throw new Error("הלקוח נוצר, אבל לא התקבל קישור תשלום Stripe");
      }

      alert("הלקוח והעסקה נוצרו בהצלחה");
      router.push("/employee/sales");
      router.refresh();
    } catch (submitError) {
      console.error("CREATE EMPLOYEE SALE FAILED:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "שגיאה ביצירת הלקוח והמכירה",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f8fafc_38%,#eef2f7_100%)] text-slate-950"
    >
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[36px] border border-[#eadfce] bg-white/90 p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#ffe7bd] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-emerald-100 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <button
                type="button"
                onClick={() => router.push("/employee/sales")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#5b4a3a] transition hover:bg-[#fff7ec]"
              >
                <Icon name="arrow" className="h-4 w-4" />
                חזרה למכירות
              </button>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-[#fff7ec] px-4 py-2 text-sm font-black text-[#8a5c20]">
                <Icon name="spark" className="h-4 w-4" />
                מכירת חבילה לעובד
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                יצירת לקוח חדש ותשלום
              </h1>

              <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-slate-600">
                העובד בוחר חבילה וכמות רשומות בלבד. המחיר מחושב אוטומטית לפי
                מדרגת החבילה ואין אפשרות לערוך מחיר ידנית.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:w-[560px]">
              <InfoCard icon={<Icon name="card" />} title="שימוש בכרטיס אשראי">
                רק הלקוח או הגורם המשלם רשאים להשתמש בכרטיס אשראי. חובה לוודא
                שהכרטיס שייך לאדם שאיתו מדברים או לגורם המשלם שאישר את העסקה.
              </InfoCard>

              <InfoCard icon={<Icon name="phone" />} title="שיחה מוקלטת בלבד">
                מכירה מתבצעת בשיחה מוקלטת בלבד, כולל סיכום החבילה, מה מקבלים,
                מחיר, אופן תשלום ותנאי תשלום.
              </InfoCard>
            </div>
          </div>
        </section>

        <form
          onSubmit={submitSale}
          className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]"
        >
          <div className="space-y-6">
            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    פרטי לקוח
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    פרטי הלקוח שיקבל את הקישור לתשלום וייפתח לו משתמש במערכת.
                  </p>
                </div>

                <Pill className="border-amber-200 bg-amber-50 text-amber-700">
                  Stripe checkout
                </Pill>
              </div>

              {error && (
                <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
                  {error}
                </div>
              )}

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    שם לקוח *
                  </span>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                    placeholder="לדוגמה: הדר כהן"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    אימייל לקוח *
                  </span>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                    placeholder="client@email.com"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    טלפון לקוח *
                  </span>
                  <input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                    placeholder="0500000000"
                    dir="ltr"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    שם אירוע
                  </span>
                  <input
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                    placeholder="לדוגמה: חתונה הדר ויוסי"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-black text-slate-700">
                    תאריך אירוע
                  </span>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  בחירת חבילה
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  המחיר נמשך ממדרגות החבילה. העובד יכול לערוך רק את כמות
                  הרשומות, לא את המחיר.
                </p>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {PACKAGE_PLANS.map((plan) => {
                  const isSelected = selectedPlanKey === plan.key;
                  const calc = calculatePackagePrice(plan, clampRecords(records));

                  return (
                    <button
                      key={plan.key}
                      type="button"
                      onClick={() => setSelectedPlanKey(plan.key)}
                      className={`rounded-[30px] border p-5 text-right shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                        isSelected
                          ? "border-[#b47a3b] bg-[#fff7ec] ring-4 ring-[#b47a3b]/10"
                          : "border-[#eadfce] bg-white hover:border-[#d5b98b]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Pill
                            className={
                              isSelected
                                ? "border-[#d6b47c] bg-white text-[#8a5c20]"
                                : "border-[#eadfce] bg-[#fffdf9] text-[#8b7b68]"
                            }
                          >
                            {plan.badge}
                          </Pill>

                          <h3 className="mt-4 text-2xl font-black text-[#3f3327]">
                            {plan.title}
                          </h3>

                          <p className="mt-2 min-h-[48px] text-sm font-semibold leading-6 text-[#7b6a58]">
                            {plan.shortDescription}
                          </p>
                        </div>

                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                            isSelected
                              ? "bg-[#b47a3b] text-white"
                              : "bg-[#fff3df] text-[#b47a3b]"
                          }`}
                        >
                          <Icon name="check" className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-5 rounded-3xl border border-[#eadfce] bg-white p-4">
                        <p className="text-xs font-black text-[#8b7b68]">
                          מחיר לפי {calc.records} רשומות
                        </p>
                        <p className="mt-1 text-3xl font-black text-[#3f3327]">
                          {money(calc.finalPrice)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#9a8976]">
                          מדרגת עד {calc.tierMaxRecords} רשומות · ממוצע{" "}
                          {money(calc.pricePerRecord)} לרשומה
                        </p>
                      </div>

                      <ul className="mt-5 space-y-2">
                        {plan.includes.slice(0, 5).map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2 text-sm font-semibold leading-6 text-[#5b4a3a]"
                          >
                            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff3df] text-[#b47a3b]">
                              <Icon name="check" className="h-3.5 w-3.5" />
                            </span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-[28px] border border-[#eadfce] bg-[#fffdf9] p-5">
                <label className="block">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <span className="text-sm font-black text-slate-700">
                        כמות רשומות למכירה *
                      </span>
                      <p className="mt-1 text-xs font-bold text-[#8b7b68]">
                        ניתן להכניס כל מספר עד 1,000. המערכת תבחר אוטומטית את
                        מדרגת ה־50 הקרובה מעל הכמות ותחשב מחיר ממוצע לפי רשומה.
                      </p>
                    </div>

                    <Pill className="border-[#eadfce] bg-white text-[#7b6a58]">
                      מדרגה פעילה: עד {packageCalculation.tierMaxRecords}
                    </Pill>
                  </div>

                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={records}
                    onChange={(e) => setRecords(e.target.value)}
                    className="mt-4 h-14 w-full rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-lg font-black text-[#3f3327] outline-none transition focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                    placeholder="לדוגמה: 530"
                    required
                  />
                </label>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                    <p className="text-xs font-black text-[#8b7b68]">
                      כמות רשומות
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#3f3327]">
                      {packageCalculation.records}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                    <p className="text-xs font-black text-[#8b7b68]">
                      מדרגת תמחור
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#3f3327]">
                      עד {packageCalculation.tierMaxRecords}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                    <p className="text-xs font-black text-[#8b7b68]">
                      מחיר ממוצע לרשומה
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#3f3327]">
                      {money(packageCalculation.pricePerRecord)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                    <p className="text-xs font-black text-[#8b7b68]">
                      מחיר חבילה
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#3f3327]">
                      {money(packageCalculation.finalPrice)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  אפסיילים
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  מחיר האפסיילים קבוע. העובד יכול לבחור שירותים בלבד, לא לערוך
                  מחיר.
                </p>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {UPSELLS.map((upsell) => {
                  const selected = selectedUpsells[upsell.key];
                  const isSuppliers = upsell.key === "suppliersBudgetSystem";
                  const freeApplied =
                    isSuppliers &&
                    selected &&
                    suppliersBudgetFree &&
                    canGiveSuppliersBudgetFree;

                  return (
                    <div
                      key={upsell.key}
                      className={`rounded-[26px] border p-4 transition ${
                        selected
                          ? "border-[#b47a3b] bg-[#fff7ec]"
                          : "border-[#eadfce] bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleUpsell(upsell.key)}
                            className="mt-1 h-4 w-4 accent-[#9b7a3c]"
                          />

                          <span>
                            <span className="block text-sm font-black text-[#3f3327]">
                              {upsell.title}
                            </span>
                            <span className="mt-1 block text-xs font-semibold leading-5 text-[#7b6a58]">
                              {upsell.description}
                            </span>
                            {upsell.note && (
                              <span className="mt-2 block text-xs font-black leading-5 text-[#9b6a30]">
                                {upsell.note}
                              </span>
                            )}
                          </span>
                        </label>

                        <div className="shrink-0 text-left">
                          {freeApplied ? (
                            <>
                              <p className="text-xs font-black text-[#8b7b68] line-through">
                                {money(upsell.price)}
                              </p>
                              <p className="text-sm font-black text-emerald-700">
                                ללא עלות
                              </p>
                            </>
                          ) : (
                            <p className="text-sm font-black text-[#3f3327]">
                              {money(upsell.price)}
                            </p>
                          )}
                        </div>
                      </div>

                      {isSuppliers && selected && (
                        <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-3">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={Boolean(
                                suppliersBudgetFree &&
                                  canGiveSuppliersBudgetFree,
                              )}
                              disabled={!canGiveSuppliersBudgetFree}
                              onChange={(e) =>
                                setSuppliersBudgetFree(e.target.checked)
                              }
                              className="mt-1 h-4 w-4 accent-[#9b7a3c] disabled:cursor-not-allowed"
                            />

                            <span className="text-xs font-bold leading-5 text-[#7b6a58]">
                              לתת ללא עלות בגלל רכישה מעל 1,000 ₪.
                              {!canGiveSuppliersBudgetFree && (
                                <b className="block text-rose-600">
                                  זמין רק כאשר סכום הרכישה לפני ההטבה הוא מעל
                                  1,000 ₪.
                                </b>
                              )}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  אישורי מכירה חובה
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  בלי סימון כל הסעיפים אי אפשר להעביר את העסקה לתשלום.
                </p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
                  <div className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={confirmRecordedCall}
                      onChange={(e) => setConfirmRecordedCall(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#9b7a3c]"
                    />
                    <span className="text-sm font-bold leading-6 text-[#5b4a3a]">
                      אני מאשר/ת שהמכירה בוצעה בשיחה מוקלטת בלבד.
                    </span>
                  </div>
                </label>

                <label className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
                  <div className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={confirmCardOwner}
                      onChange={(e) => setConfirmCardOwner(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#9b7a3c]"
                    />
                    <span className="text-sm font-bold leading-6 text-[#5b4a3a]">
                      וידאתי שרק הלקוח או הגורם המשלם משתמשים בכרטיס האשראי.
                    </span>
                  </div>
                </label>

                <label className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
                  <div className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={confirmSaleSummary}
                      onChange={(e) => setConfirmSaleSummary(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#9b7a3c]"
                    />
                    <span className="text-sm font-bold leading-6 text-[#5b4a3a]">
                      סיכמתי בשיחה מה החבילה כוללת, מה מקבלים והמחיר הכולל.
                    </span>
                  </div>
                </label>

                <label className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
                  <div className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={confirmTerms}
                      onChange={(e) => setConfirmTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#9b7a3c]"
                    />
                    <span className="text-sm font-bold leading-6 text-[#5b4a3a]">
                      סיכמתי בשיחה את אופן התשלום ותנאי התשלום.
                    </span>
                  </div>
                </label>
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-black text-slate-700">
                  סיכום שיחת המכירה *
                </span>
                <textarea
                  value={saleSummary}
                  onChange={(e) => setSaleSummary(e.target.value)}
                  className="mt-2 min-h-[150px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3 text-sm font-bold leading-7 outline-none transition focus:border-[#c7a76c] focus:bg-white focus:ring-4 focus:ring-[#c7a76c]/15"
                  placeholder="לדוגמה: הוסבר ללקוח שחבילת מזמינים חכם כוללת הזמנה דיגיטלית, 2 סבבי וואטסאפ, תזכורת SMS, מוקד טלפוני ועד 3 ניסיונות חיוג לכל רשומה. המחיר הכולל הוא... התשלום דרך Stripe..."
                  required
                />
              </label>
            </section>
          </div>

          <aside className="h-fit space-y-4 xl:sticky xl:top-6">
            <section className="overflow-hidden rounded-[34px] border border-[#eadfce] bg-white shadow-sm">
              <div className="border-b border-[#eadfce] bg-[#fff7ec] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-[#3f3327]">
                      סיכום עסקה
                    </h2>
                    <p className="mt-1 text-xs font-bold text-[#8b7b68]">
                      אין אפשרות לערוך מחיר ידנית
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#9b6a30]">
                    <Icon name="lock" className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5">
                <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdf9] p-4">
                  <p className="text-xs font-black text-[#8b7b68]">
                    חבילה נבחרת
                  </p>
                  <p className="mt-1 text-lg font-black text-[#3f3327]">
                    {selectedPlan.title}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#9a8976]">
                    {packageCalculation.records} רשומות · מדרגת עד{" "}
                    {packageCalculation.tierMaxRecords}
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#eadfce] bg-white p-4">
                  <div className="flex items-center justify-between gap-3 text-sm font-bold text-[#5b4a3a]">
                    <span>מחיר חבילה</span>
                    <span>{money(packageCalculation.finalPrice)}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-sm font-bold text-[#5b4a3a]">
                    <span>אפסיילים</span>
                    <span>{money(upsellsTotal)}</span>
                  </div>

                  {selectedUpsellsList.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-[#eadfce] pt-3">
                      {selectedUpsellsList.map((upsell) => {
                        const free =
                          upsell.key === "suppliersBudgetSystem" &&
                          suppliersBudgetFree &&
                          canGiveSuppliersBudgetFree;

                        return (
                          <div
                            key={upsell.key}
                            className="flex items-start justify-between gap-3 text-xs font-bold leading-5 text-[#8b7b68]"
                          >
                            <span>{upsell.title}</span>
                            <span className="shrink-0">
                              {free ? "ללא עלות" : money(upsell.price)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-[#d8b777] bg-[#fff7ec] p-4">
                  <p className="text-xs font-black text-[#8a5c20]">
                    סה״כ לתשלום כולל מע״מ
                  </p>
                  <p className="mt-2 text-4xl font-black tracking-tight text-[#3f3327]">
                    {money(finalGrossAmount)}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black text-slate-500">
                      סכום לפני מע״מ
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {money(calculated.net)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      חישוב: סכום כולל / {1 + VAT_RATE}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-black text-emerald-700">
                      עמלה לעובד
                    </p>
                    <p className="mt-2 text-3xl font-black text-emerald-900">
                      {money(calculated.commission)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-emerald-700/70">
                      {percent(COMMISSION_RATE)} מהסכום לפני מע״מ
                    </p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#eadfce] bg-white p-4">
                  <p className="text-sm font-black text-[#3f3327]">
                    אופן תשלום
                  </p>

                  <select
                    value={paymentStatus}
                    onChange={(e) =>
                      setPaymentStatus(e.target.value as "stripe" | "paid")
                    }
                    className="mt-3 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-sm font-bold text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                  >
                    <option value="stripe">לתשלום דרך Stripe</option>
                    <option value="paid">שולם ידנית</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="inline-flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#3f3327] px-5 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:bg-[#2f251d] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="save" className="h-4 w-4" />
                  {saving
                    ? "מעביר לתשלום..."
                    : paymentStatus === "stripe"
                      ? "יצירת לקוח ומעבר לתשלום"
                      : "שמור לקוח ועסקה"}
                </button>

                <p className="text-center text-xs font-bold leading-5 text-[#8b7b68]">
                  בלחיצה על הכפתור תישמר המכירה על העובד המחובר, תחושב עמלה
                  וייפתח תשלום דרך Stripe כשהסטטוס הוא Stripe.
                </p>
              </div>
            </section>
          </aside>
        </form>
      </main>
    </div>
  );
}
