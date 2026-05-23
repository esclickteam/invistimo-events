"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

type VenuePackageType =
  | "seating_only"
  | "rsvp_seating"
  | "full_event_management";

type VenuePackage = {
  id: VenuePackageType;
  title: string;
  subtitle: string;
  badge: string;
  basePrice: number;
  pricePerRecord: number;
  requiresPayment: boolean;
  includes: string[];
  note: string;
};

const VENUE_PACKAGES: VenuePackage[] = [
  {
    id: "seating_only",
    title: "הושבה בלבד",
    subtitle: "מערכת הושבה פתוחה עם תבנית האולם שנבחרה מראש.",
    badge: "כלול מהאולם",
    basePrice: 0,
    pricePerRecord: 0,
    requiresPayment: false,
    includes: [
      "מערכת הושבה בלבד",
      "פתיחה עם תבנית ההושבה שהאולם בחר מראש",
      "העלאת רשימת אורחים על ידי הלקוח",
      "סידור אורחים לשולחנות",
      "אפשרות להושיב את האורחים שאישרו הגעה",
      "האולם יכול לראות את ההושבה תוך כדי עבודה",
    ],
    note: "חבילה זו כלולה דרך האולם ואינה דורשת תשלום נוסף.",
  },
  {
    id: "rsvp_seating",
    title: "הושבה + אישורי הגעה",
    subtitle: "כולל ניהול רשומות, אישורי הגעה, הודעות ושיחות למי שלא עונה.",
    badge: "מומלץ",
    basePrice: 0,
    pricePerRecord: 2,
    requiresPayment: true,
    includes: [
      "כל מה שכלול בהושבה בלבד",
      "ניהול רשימת מוזמנים",
      "אישורי הגעה",
      "3 סבבי הודעות",
      "2 סבבי WhatsApp",
      "1 סבב SMS",
      "עד 3 סבבי שיחות טלפון למי שלא עונה",
      "חיבור ההושבה לאורחים שאישרו הגעה",
    ],
    note: "עלות החבילה: 2 ₪ לכל רשומה.",
  },
  {
    id: "full_event_management",
    title: "הושבה + אישורי הגעה + ניהול אירוע",
    subtitle: "חבילה מלאה הכוללת גם מערכת עצמאית לניהול ספקים ותקציב.",
    badge: "מלא",
    basePrice: 100,
    pricePerRecord: 2,
    requiresPayment: true,
    includes: [
      "כל מה שכלול בהושבה + אישורי הגעה",
      "מערכת ניהול אירוע עצמאית",
      "ניהול ספקים",
      "ניהול תקציב",
      "ניהול משימות",
      "מעקב תשלומים והוצאות",
      "תמונת מצב מלאה לאירוע",
    ],
    note: "עלות החבילה: 2 ₪ לכל רשומה + 100 ₪.",
  },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function normalizeRecords(value: string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return 0;

  return Math.max(0, Math.floor(numberValue));
}

function calculatePrice(packageData: VenuePackage, recordsCount: number) {
  return packageData.basePrice + packageData.pricePerRecord * recordsCount;
}

function VenueClientPackagesInner() {
  const params = useSearchParams();

  const venueInviteToken = String(params.get("venueInviteToken") || "").trim();
  const userId = String(params.get("userId") || "").trim();
  const email = String(params.get("email") || "").trim();

  /*
    חשוב לתבניות הושבה:
    אם הקישור של האולם כולל hallId / venueClientHallId,
    אנחנו מעבירים אותו לשרת כדי שיישמר במשתמש.
    לפי השדה הזה נשלוף אחר כך את כל התבניות של האולם.
  */
  const venueClientHallId = String(
    params.get("venueClientHallId") ||
      params.get("hallId") ||
      params.get("venueHallId") ||
      params.get("assignedHallId") ||
      ""
  ).trim();

  const [selectedPackage, setSelectedPackage] =
    useState<VenuePackageType>("seating_only");

  const [recordsCount, setRecordsCount] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedPackageData = useMemo(() => {
    return (
      VENUE_PACKAGES.find((item) => item.id === selectedPackage) ||
      VENUE_PACKAGES[0]
    );
  }, [selectedPackage]);

  const normalizedRecordsCount = useMemo(() => {
    return normalizeRecords(recordsCount);
  }, [recordsCount]);

  const totalPrice = useMemo(() => {
    return calculatePrice(selectedPackageData, normalizedRecordsCount);
  }, [selectedPackageData, normalizedRecordsCount]);

  const isMissingData = !venueInviteToken || !userId || !email;

  async function handleContinue() {
    if (isMissingData) {
      alert("קישור בחירת החבילה לא תקין. נא לבקש מהאולם קישור חדש.");
      return;
    }

    if (!normalizedRecordsCount || normalizedRecordsCount <= 0) {
      alert("חובה להזין מספר רשומות");
      return;
    }

    setLoading(true);

    try {
      /*
        הושבה בלבד:
        לא עוברים ל-Stripe.
        פותחים את החבילה ומעבירים לדשבורד.
      */
      if (selectedPackage === "seating_only") {
        const res = await fetch("/api/venues/client-registration/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            venueInviteToken,
            userId,
            email,
            packageType: selectedPackage,
            recordsCount: normalizedRecordsCount,

            /*
              השדה הזה חשוב כדי שהתבניות מהקולקשן
              venueseatingtemplates יופיעו ללקוח לפי hallId.
            */
            venueClientHallId: venueClientHallId || undefined,
            hallId: venueClientHallId || undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.success === false) {
          alert(data?.message || data?.error || "שגיאה בפתיחת חבילת ההושבה");
          return;
        }

        window.location.href = data?.redirectUrl || "/dashboard";
        return;
      }

      /*
        שאר החבילות:
        עוברות ל-Stripe.
        גם כאן מעבירים hallId כדי שאחרי תשלום השרת יוכל לשמור
        venueClientHallId למשתמש.
      */
      const res = await fetch("/api/venues/client-registration/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          venueInviteToken,
          userId,
          email,
          packageType: selectedPackage,
          recordsCount: normalizedRecordsCount,
          totalPrice,

          venueClientHallId: venueClientHallId || undefined,
          hallId: venueClientHallId || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        alert(data?.message || data?.error || "שגיאה ביצירת תשלום");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      alert("לא התקבל קישור תשלום");
    } catch (error) {
      console.error("venue client package error:", error);
      alert("שגיאת שרת בבחירת החבילה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#F7EFE6] text-[#2b241c]"
    >
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_top,#fffaf4_0%,#f7efe6_42%,#efe2d2_100%)]" />
      <div className="pointer-events-none absolute -top-24 right-[12%] h-72 w-72 rounded-full bg-[#DAB273]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-60px] left-[8%] h-80 w-80 rounded-full bg-[#CDA37D]/15 blur-3xl" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="text-center"
        >
          <p className="font-serif text-[28px] tracking-[0.22em] text-[#8A6338] sm:text-[36px]">
            INVISTIMO
          </p>

          <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-l from-transparent via-[#C9A46A] to-transparent" />

          <h1 className="mt-7 text-4xl font-black tracking-tight text-[#3E2D20] sm:text-5xl">
            בחרו חבילה מתאימה
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-sm font-semibold leading-7 text-[#7B6754] sm:text-base">
            האולם פתח עבורך קישור אישי ל־Invistimo. בחרו את החבילה המתאימה
            והזינו את מספר הרשומות. אם בחרתם הושבה בלבד — תועברו ישירות
            לדשבורד. בחבילות הכוללות אישורי הגעה — תועברו לתשלום.
          </p>
        </motion.div>

        {isMissingData ? (
          <div className="mx-auto mt-10 max-w-xl rounded-[30px] border border-rose-200 bg-white p-7 text-center shadow-sm">
            <h2 className="text-xl font-black text-rose-700">
              קישור לא תקין
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-[#7B6754]">
              חסר מידע בקישור ההרשמה. נא לבקש מהאולם לשלוח קישור חדש.
            </p>

            <Link
              href="/"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-[#B8872E] px-6 text-sm font-black text-white"
            >
              חזרה לעמוד הבית
            </Link>
          </div>
        ) : (
          <>
            <div className="mx-auto mt-8 w-full max-w-xl rounded-[28px] border border-[#E3D2BC] bg-white/90 p-5 text-center shadow-sm">
              <label className="text-sm font-black text-[#4C3724]">
                מספר רשומות / מוזמנים
              </label>

              <input
                type="number"
                min={1}
                value={recordsCount}
                onChange={(event) => setRecordsCount(event.target.value)}
                placeholder="לדוגמה: 300"
                className="
                  mt-3 w-full rounded-[20px] border border-[#DDCBB3]
                  bg-white px-4 py-3.5 text-center text-xl font-black
                  text-[#3E2D20] shadow-sm outline-none transition
                  placeholder:text-[#AF9B87]
                  focus:border-[#C9A46A]
                  focus:ring-4 focus:ring-[#D8B16A]/15
                "
              />

              <p className="mt-2 text-xs font-semibold leading-5 text-[#8A765F]">
                בחבילת הושבה בלבד אין תשלום נוסף, אבל עדיין צריך להזין מספר
                רשומות כדי לפתוח את המערכת בהתאם.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {VENUE_PACKAGES.map((pkg) => {
                const active = selectedPackage === pkg.id;
                const packagePrice = calculatePrice(
                  pkg,
                  normalizedRecordsCount
                );

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={[
                      "group relative overflow-hidden rounded-[32px] border bg-white p-6 text-right shadow-sm transition",
                      active
                        ? "border-[#B8872E] ring-4 ring-[#B8872E]/15"
                        : "border-[#E3D2BC] hover:-translate-y-1 hover:border-[#C9A46A]",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex rounded-full bg-[#FFF4DE] px-3 py-1 text-[11px] font-black text-[#A86F2B]">
                          {pkg.badge}
                        </span>

                        <h2 className="mt-4 text-2xl font-black text-[#3E2D20]">
                          {pkg.title}
                        </h2>

                        <p className="mt-2 text-sm font-semibold leading-6 text-[#7B6754]">
                          {pkg.subtitle}
                        </p>
                      </div>

                      <div
                        className={[
                          "flex h-7 w-7 items-center justify-center rounded-full border text-sm font-black",
                          active
                            ? "border-[#B8872E] bg-[#B8872E] text-white"
                            : "border-[#D8C2A6] bg-white text-transparent",
                        ].join(" ")}
                      >
                        ✓
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl bg-[#FFF8EE] px-4 py-3 text-sm font-black text-[#8A6338]">
                      {pkg.requiresPayment ? (
                        <>
                          {pkg.pricePerRecord} ₪ לרשומה
                          {pkg.basePrice > 0 ? ` + ${pkg.basePrice} ₪` : ""}
                        </>
                      ) : (
                        <>כלול דרך האולם — ללא תשלום נוסף</>
                      )}
                    </div>

                    <div className="mt-3 rounded-2xl border border-[#E9DCCB] bg-white px-4 py-3 text-sm font-black text-[#3E2D20]">
                      {pkg.requiresPayment
                        ? `סה״כ לתשלום: ${formatMoney(packagePrice)}`
                        : "סה״כ לתשלום: 0 ₪"}
                    </div>

                    <ul className="mt-5 space-y-3">
                      {pkg.includes.map((feature) => (
                        <li
                          key={feature}
                          className="flex gap-2 text-sm font-semibold leading-6 text-[#5C4632]"
                        >
                          <span className="mt-0.5 text-[#B8872E]">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-5 rounded-2xl bg-[#FFFDF8] p-3 text-xs font-bold leading-5 text-[#8A765F]">
                      {pkg.note}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mx-auto mt-8 w-full max-w-2xl rounded-[30px] border border-[#E3D2BC] bg-white/90 p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-[#7B6754]">
                החבילה שנבחרה:
              </p>

              <h2 className="mt-1 text-2xl font-black text-[#3E2D20]">
                {selectedPackageData.title}
              </h2>

              <div className="mt-3 text-sm font-bold text-[#7B6754]">
                {selectedPackageData.requiresPayment ? (
                  <>
                    מחיר לתשלום:{" "}
                    <span className="text-lg font-black text-[#A86F2B]">
                      {formatMoney(totalPrice)}
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-black text-emerald-700">
                    ללא תשלום נוסף
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={loading}
                className="
                  mt-5 h-12 rounded-2xl
                  bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F]
                  px-8 text-sm font-black text-white
                  shadow-[0_16px_32px_rgba(168,111,43,0.24)]
                  transition hover:-translate-y-0.5
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                {loading
                  ? "פותח חבילה..."
                  : selectedPackageData.requiresPayment
                    ? "המשך לתשלום"
                    : "פתיחת מערכת והמשך לדשבורד"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function VenueClientPackagesPage() {
  return (
    <Suspense fallback={null}>
      <VenueClientPackagesInner />
    </Suspense>
  );
}