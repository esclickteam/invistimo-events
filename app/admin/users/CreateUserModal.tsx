"use client";

import { useState } from "react";

type UserRole = "user" | "producer" | "staff";
type PaymentStatus = "paid" | "stripe";
type PlanKey = "plan1" | "plan2" | "plan3";
type AddonKey = "calls" | "credit" | "seating" | "system" | "design";

type Props = {
  onClose: () => void;
};

/* כמה סבבים כלולים / נפתחים ידנית */
type AllowedMessageRounds = 2 | 3;

/* איזה אפסיילים כלולים בכל חבילה */
const includedByPlan: Record<PlanKey, AddonKey[]> = {
  plan1: [],
  plan2: ["calls"],
  plan3: ["calls", "credit", "seating"],
};

const addonLabels: Record<AddonKey, string> = {
  calls: "שיחות",
  credit: "מתנות באשראי",
  seating: "הושבה דיגיטלית",
  system: "מערכת ניהול אירוע",
  design: "עיצוב בהתאמה אישית",
};

export default function CreateUserModal({ onClose }: Props) {
  /* ===== USER BASIC ===== */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");

  /* ===== PLAN ===== */
  const [plan, setPlan] = useState<PlanKey>("plan1");

  /* ===== USER LIMITS ===== */
  const [records, setRecords] = useState(100);
  const [allowedMessageRounds, setAllowedMessageRounds] =
    useState<AllowedMessageRounds>(2);

  /* ===== ADDONS ===== */
  const [addons, setAddons] = useState<
    Record<AddonKey, { enabled: boolean; price: number }>
  >({
    calls: { enabled: false, price: 0 },
    credit: { enabled: false, price: 0 },
    seating: { enabled: false, price: 0 },
    system: { enabled: false, price: 0 },
    design: { enabled: false, price: 0 },
  });

  /* ===== USER BILLING ===== */
  const [price, setPrice] = useState<number | "">("");
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("stripe");

  /* ===== PRODUCER BILLING ===== */
  const [producerPricePerRecord, setProducerPricePerRecord] =
    useState<number | "">("");

  /* =====================================================
     SUBMIT
  ===================================================== */
  async function handleSubmit() {
    const included = new Set(includedByPlan[plan]);

    const effectiveIncludeCalls =
      included.has("calls") || addons.calls.enabled;

    const includeCreditGifts =
      included.has("credit") || addons.credit.enabled;

    const seatingEnabled =
      included.has("seating") || addons.seating.enabled;

    const selfManageEnabled =
      included.has("system") || addons.system.enabled;

    const customDesignEnabled =
      included.has("design") || addons.design.enabled;

    const payload =
      role === "producer"
        ? {
            name,
            email,
            role,
            billing: {
              pricePerRecord: producerPricePerRecord,
            },
          }
        : role === "staff"
        ? {
            name,
            email,
            role,
          }
        : {
            name,
            email,
            role,
            plan,

            limits: {
              records,

              /*
                ✅ חדש:
                המערכת לא עובדת לפי כמות הודעות,
                אלא לפי כמה סבבי הודעות פתוחים ללקוח.
                2 = כלול בחבילה
                3 = פתיחה ידנית מהאדמין
              */
              allowedMessageRounds,
            },

            billing: {
              price,
              paymentStatus,
            },

            includeCreditGifts,
            seatingEnabled,
            selfManageEnabled,
            customDesignEnabled,

            addons: {
              calls: {
                ...addons.calls,
                enabled: effectiveIncludeCalls,
              },
              credit: {
                ...addons.credit,
                enabled: includeCreditGifts,
              },
              seating: {
                ...addons.seating,
                enabled: seatingEnabled,
              },
              system: {
                ...addons.system,
                enabled: selfManageEnabled,
              },
              design: {
                ...addons.design,
                enabled: customDesignEnabled,
              },
            },
          };

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error("CREATE_USER_FAILED");
      }

      if (role === "user" && paymentStatus === "stripe" && data.userId) {
        const checkoutRes = await fetch(
          `/api/admin/users/${data.userId}/checkout`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        const checkoutData = await checkoutRes.json();

        if (checkoutData.checkoutUrl) {
          window.location.href = checkoutData.checkoutUrl;
          return;
        }
      }

      onClose();
    } catch (err) {
      console.error("CREATE USER FAILED:", err);
      alert("שגיאה ביצירת משתמש");
    }
  }

  /* =====================================================
     UI
  ===================================================== */
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center px-4"
    >
      <div className="w-full max-w-3xl bg-[#fffdf9] rounded-[28px] shadow-2xl border border-[#eadfce] max-h-[92vh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="px-7 py-5 border-b border-[#efe4d6] flex justify-between items-center bg-gradient-to-l from-[#fffaf2] to-white">
          <div>
            <h2 className="text-2xl font-bold text-[#3f3327]">
              יצירת משתמש חדש
            </h2>
            <p className="text-sm text-[#8b7b68] mt-1">
              הגדרת לקוח, חבילה, סבבי הודעות ואפסיילים
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-[#eadfce] bg-white text-[#8b7b68] hover:text-[#3f3327] hover:bg-[#fff7ec] transition text-xl flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-7 space-y-8 overflow-y-auto">
          {/* USER INFO */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#3f4856]">
                פרטי משתמש
              </h3>
              <p className="text-xs text-[#8b7b68] mt-1">
                פרטים בסיסיים והרשאת משתמש במערכת
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <input
                type="text"
                placeholder="שם מלא"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
              />

              <input
                type="email"
                placeholder="אימייל משתמש"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
              />

              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
              >
                <option value="user">לקוח</option>
                <option value="producer">מפיק</option>
                <option value="staff">עובד</option>
              </select>
            </div>
          </section>

          {/* USER */}
          {role === "user" && (
            <>
              {/* PLAN */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#3f4856]">
                    חבילה
                  </h3>
                  <p className="text-xs text-[#8b7b68] mt-1">
                    בחירת החבילה הבסיסית של הלקוח
                  </p>
                </div>

                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as PlanKey)}
                  className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                >
                  <option value="plan1">חבילה 1</option>
                  <option value="plan2">חבילה 2</option>
                  <option value="plan3">חבילה 3</option>
                </select>
              </section>

              {/* LIMITS */}
              <section className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[#3f4856]">
                    מגבלות מערכת
                  </h3>
                  <p className="text-xs text-[#8b7b68] mt-1">
                    הגדרת כמות רשומות וסבבי הודעות פתוחים ללקוח
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* RECORDS */}
                  <label className="space-y-2">
                    <span className="block text-sm font-semibold text-[#6b5a45]">
                      כמות רשומות
                    </span>

                    <input
                      type="number"
                      min={1}
                      value={records}
                      onChange={(e) => setRecords(Number(e.target.value))}
                      className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                    />

                    <p className="text-xs text-[#8b7b68]">
                      מספר הרשומות שהלקוח יכול לנהל במערכת.
                    </p>
                  </label>

                  {/* MESSAGE ROUNDS */}
                  <label className="space-y-2">
                    <span className="block text-sm font-semibold text-[#6b5a45]">
                      סבבי הודעות פתוחים ללקוח
                    </span>

                    <select
                      value={allowedMessageRounds}
                      onChange={(e) =>
                        setAllowedMessageRounds(
                          Number(e.target.value) as AllowedMessageRounds
                        )
                      }
                      className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                    >
                      <option value={2}>2 סבבים — כלול בחבילה</option>
                      <option value={3}>
                        3 סבבים — פתיחה ידנית מהאדמין
                      </option>
                    </select>

                    <p className="text-xs text-[#8b7b68]">
                      ברירת המחדל היא 2 סבבים. סבב שלישי נפתח רק לפי החלטת אדמין.
                    </p>
                  </label>
                </div>

                <div className="rounded-2xl border border-[#eadfce] bg-[#fff8ed] px-4 py-3 text-sm text-[#7a5a2f]">
                  שימי לב: המערכת לא מגבילה לפי כמות הודעות SMS, אלא לפי הרשאה
                  לפתיחת סבבי הודעות במערכת.
                </div>
              </section>

              {/* ADDONS */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#3f4856]">
                    אפסיילים
                  </h3>
                  <p className="text-xs text-[#8b7b68] mt-1">
                    שירותים נוספים שאפשר לפתוח ללקוח
                  </p>
                </div>

                <div className="space-y-3">
                  {(Object.keys(addons) as AddonKey[]).map((key) => {
                    const isIncluded = includedByPlan[plan].includes(key);
                    const value = addons[key];

                    return (
                      <div
                        key={key}
                        className="rounded-2xl border border-[#eadfce] bg-white p-4 space-y-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={isIncluded}
                              checked={isIncluded ? true : value.enabled}
                              onChange={() =>
                                setAddons((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    enabled: !prev[key].enabled,
                                  },
                                }))
                              }
                              className="w-4 h-4 accent-[#9b7a3c]"
                            />

                            <span className="text-[#4b3b2a] font-medium">
                              {addonLabels[key]}
                            </span>
                          </label>

                          {isIncluded && (
                            <span className="rounded-full bg-[#eef8ef] text-[#258343] px-3 py-1 text-xs font-bold">
                              כלול בחבילה
                            </span>
                          )}
                        </div>

                        {!isIncluded && value.enabled && (
                          <input
                            type="number"
                            placeholder="מחיר אפסייל (₪) – אפשר 0"
                            value={value.price}
                            onChange={(e) =>
                              setAddons((prev) => ({
                                ...prev,
                                [key]: {
                                  ...prev[key],
                                  price: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full h-12 rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* PAYMENT */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#3f4856]">
                    תשלום
                  </h3>
                  <p className="text-xs text-[#8b7b68] mt-1">
                    הגדרת מחיר ואופן תשלום ללקוח
                  </p>
                </div>

                <label className="space-y-2 block">
                  <span className="block text-sm font-semibold text-[#6b5a45]">
                    מחיר כולל (₪)
                  </span>

                  <input
                    type="number"
                    value={price}
                    onChange={(e) =>
                      setPrice(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                  />
                </label>

                <select
                  value={paymentStatus}
                  onChange={(e) =>
                    setPaymentStatus(e.target.value as PaymentStatus)
                  }
                  className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                >
                  <option value="stripe">לתשלום דרך Stripe</option>
                  <option value="paid">שולם ידנית</option>
                </select>
              </section>
            </>
          )}

          {/* PRODUCER */}
          {role === "producer" && (
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#3f4856]">
                  תמחור למפיק
                </h3>
                <p className="text-xs text-[#8b7b68] mt-1">
                  מחיר לפי רשומה עבור משתמש מסוג מפיק
                </p>
              </div>

              <label className="space-y-2 block">
                <span className="block text-sm font-semibold text-[#6b5a45]">
                  מחיר לרשומה (₪)
                </span>

                <input
                  type="number"
                  value={producerPricePerRecord}
                  onChange={(e) =>
                    setProducerPricePerRecord(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                />
              </label>
            </section>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-7 py-5 border-t border-[#efe4d6] bg-[#fffaf3] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-2xl border border-[#eadfce] bg-white text-[#5b4a3a] font-semibold hover:bg-[#fff7ec] transition"
          >
            ביטול
          </button>

          <button
            onClick={handleSubmit}
            disabled={
              !name ||
              !email ||
              (role === "user" && price === "") ||
              (role === "producer" && !producerPricePerRecord)
            }
            className="px-6 py-3 rounded-2xl bg-[#3f3327] text-white font-bold shadow-lg shadow-black/10 hover:bg-[#2f251d] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            צור משתמש
          </button>
        </div>
      </div>
    </div>
  );
}