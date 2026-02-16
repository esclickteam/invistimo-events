"use client";

import { useEffect, useState } from "react";

type UserRole = "user" | "producer" | "staff";
type PaymentStatus = "paid" | "stripe";
type PlanKey = "plan1" | "plan2" | "plan3";
type AddonKey = "credit" | "seating" | "system" | "design";

type Props = {
  onClose: () => void;
};

const SMS_PER_RECORD = 3;

/* איזה אפסיילים כלולים בכל חבילה */
const includedByPlan: Record<PlanKey, AddonKey[]> = {
  plan1: [],
  plan2: [],
  plan3: ["credit", "seating"],
};

export default function CreateUserModal({ onClose }: Props) {
  /* ===== USER BASIC ===== */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");

  /* ===== PLAN (חדש) ===== */
  const [plan, setPlan] = useState<PlanKey>("plan1");

  /* ===== USER LIMITS ===== */
  const [records, setRecords] = useState(100);
  const [smsTotal, setSmsTotal] = useState(records * SMS_PER_RECORD);
  const [smsAuto, setSmsAuto] = useState(true);
  const [includeCalls, setIncludeCalls] = useState(false);

  /* ===== ADDONS (חדש) ===== */
  const [addons, setAddons] = useState<Record<
    AddonKey,
    { enabled: boolean; price: number }
  >>({
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

  /* ===== AUTO SMS CALC ===== */
  useEffect(() => {
    if (smsAuto) {
      setSmsTotal(records * SMS_PER_RECORD);
    }
  }, [records, smsAuto]);

  

  /* ===================================================== SUBMIT */
  async function handleSubmit() {
  // ✅ לשים כאן
  const included = new Set(includedByPlan[plan]);

  const includeCreditGifts =
    included.has("credit") || addons.credit.enabled;

  const seatingEnabled =
    included.has("seating") || addons.seating.enabled;

  const selfManageEnabled =
    included.has("system") || addons.system.enabled;

  const customDesignEnabled =
    included.has("design") || addons.design.enabled;

    const effectiveIncludeCalls =
    plan === "plan2" || plan === "plan3" || includeCalls;

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
  smsTotal,
  smsPerRecord: SMS_PER_RECORD,
  smsAuto,
  includeCalls: effectiveIncludeCalls,
},
          billing: {
            price,
            paymentStatus,
          },

          // ✅ להוסיף כאן בתוך ה-user payload
          includeCreditGifts,
          seatingEnabled,
          selfManageEnabled,
          customDesignEnabled,

          addons: {
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

  /* ===================================================== UI */
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">יצירת משתמש חדש</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto">
          {/* USER INFO */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-gray-600">
              פרטי משתמש
            </h3>

            <input
              type="text"
              placeholder="שם מלא"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
            />

            <input
              type="email"
              placeholder="אימייל משתמש"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="user">לקוח</option>
              <option value="producer">מפיק</option>
              <option value="staff">עובד</option>
            </select>
          </section>

          {/* USER */}
          {role === "user" && (
            <>
              {/* PLAN (חדש) */}
              <section>
                <h3 className="text-sm font-bold text-gray-600 mb-3">
                  חבילה
                </h3>

                <select
                  value={plan}
                  onChange={(e) =>
                    setPlan(e.target.value as PlanKey)
                  }
                  className="w-full border rounded-lg px-4 py-2"
                >
                  <option value="plan1">חבילה 1</option>
                  <option value="plan2">חבילה 2</option>
                  <option value="plan3">חבילה 3</option>
                </select>
              </section>

              {/* LIMITS */}
              <section>
                <h3 className="text-sm font-bold text-gray-600 mb-3">
                  מגבלות מערכת
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      כמות רשומות
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={records}
                      onChange={(e) =>
                        setRecords(Number(e.target.value))
                      }
                      className="w-full border rounded-lg px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      כמות הודעות SMS
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={smsTotal}
                      onChange={(e) => {
                        setSmsAuto(false);
                        setSmsTotal(Number(e.target.value));
                      }}
                      className="w-full border rounded-lg px-4 py-2"
                    />

                    <label className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={smsAuto}
                        onChange={(e) =>
                          setSmsAuto(e.target.checked)
                        }
                      />
                      חישוב אוטומטי לפי רשומות
                    </label>
                  </div>
                </div>
              </section>

              {/* ADDONS (חדש) */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-600">
                  אפסיילים
                </h3>

                {(Object.keys(addons) as AddonKey[]).map((key) => {
                  const isIncluded =
                    includedByPlan[plan].includes(key);
                  const value = addons[key];

                  return (
                    <div
                      key={key}
                      className="border rounded-lg p-3 space-y-2 bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={isIncluded}
                            checked={
                              isIncluded ? true : value.enabled
                            }
                            onChange={() =>
                              setAddons((prev) => ({
                                ...prev,
                                [key]: {
                                  ...prev[key],
                                  enabled: !prev[key].enabled,
                                },
                              }))
                            }
                          />

                          <span>
                            {key === "credit" &&
                              "מתנות באשראי"}
                            {key === "seating" &&
                              "הושבה דיגיטלית"}
                            {key === "system" &&
                              "מערכת ניהול אירוע"}
                            {key === "design" &&
                              "עיצוב בהתאמה אישית"}
                          </span>
                        </label>

                        {isIncluded && (
                          <span className="text-green-600 text-sm font-medium">
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
                          className="w-full border rounded-lg px-4 py-2"
                        />
                      )}
                    </div>
                  );
                })}
              </section>

              {/* PAYMENT */}
              <section>
                <h3 className="text-sm font-bold text-gray-600 mb-3">
                  תשלום
                </h3>

                <label className="block text-sm mb-1">
                  מחיר כולל (₪)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) =>
                    setPrice(
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                    )
                  }
                  className="w-full border rounded-lg px-4 py-2 mb-3"
                />

                <select
                  value={paymentStatus}
                  onChange={(e) =>
                    setPaymentStatus(
                      e.target.value as PaymentStatus
                    )
                  }
                  className="w-full border rounded-lg px-4 py-2"
                >
                  <option value="stripe">
                    לתשלום דרך Stripe
                  </option>
                  <option value="paid">
                    שולם ידנית
                  </option>
                </select>
              </section>
            </>
          )}

          {/* PRODUCER */}
          {role === "producer" && (
            <section>
              <h3 className="text-sm font-bold text-gray-600 mb-3">
                תמחור למפיק
              </h3>

              <label className="block text-sm mb-1">
                מחיר לרשומה (₪)
              </label>
              <input
                type="number"
                value={producerPricePerRecord}
                onChange={(e) =>
                  setProducerPricePerRecord(
                    e.target.value === ""
                      ? ""
                      : Number(e.target.value)
                  )
                }
                className="w-full border rounded-lg px-4 py-2"
              />
            </section>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg"
          >
            ביטול
          </button>

          <button
            onClick={handleSubmit}
            disabled={
              !name ||
              !email ||
              (role === "user" && !price) ||
              (role === "producer" &&
                !producerPricePerRecord)
            }
            className="px-5 py-2 rounded-lg bg-black text-white disabled:opacity-40"
          >
            צור משתמש
          </button>
        </div>
      </div>
    </div>
  );
}
