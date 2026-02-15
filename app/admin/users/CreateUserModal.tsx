"use client";

import { useEffect, useState } from "react";

type UserRole = "user" | "producer" | "staff";
type PaymentStatus = "paid" | "stripe";
type PlanKey = "plan1" | "plan2" | "plan3";

type Props = {
  onClose: () => void;
};

const SMS_PER_RECORD = 3;

const RECORD_PACKAGES = [
  50, 100, 150, 200, 250, 300, 350, 400,
  450, 500, 550, 600, 650, 700, 750, 800,
];

/* ================= מדרגות מחיר ================= */

const plan1Rates: [number, number][] = [
  [50, 1.19],[100, 1.16],[150, 1.13],[200, 1.1],
  [250, 1.08],[300, 1.06],[350, 1.04],[400, 1.02],
  [450, 1.0],[500, 0.98],[550, 0.96],[600, 0.94],
  [650, 0.93],[700, 0.92],[750, 0.9],[800, 0.88],
];

const plan2Rates: [number, number][] = [
  [50, 2.85],[100, 2.38],[150, 2.35],[200, 2.29],
  [250, 2.26],[300, 2.19],[350, 2.15],[400, 2.1],
  [450, 2.05],[500, 2.0],[550, 1.96],[600, 1.92],
  [650, 1.92],[700, 1.92],[750, 1.92],[800, 1.9],
];

const plan3Rates: [number, number][] = [
  [50, 3.75],[100, 3.22],[150, 2.98],[200, 2.76],
  [250, 2.65],[300, 2.52],[350, 2.43],[400, 2.35],
  [450, 2.28],[500, 2.21],[550, 2.14],[600, 2.07],
  [650, 2.06],[700, 2.05],[750, 2.04],[800, 2.03],
];

function getRate(plan: PlanKey, records: number) {
  const table =
    plan === "plan1"
      ? plan1Rates
      : plan === "plan2"
      ? plan2Rates
      : plan3Rates;

  for (const [limit, rate] of table) {
    if (records <= limit) return rate;
  }

  return table[table.length - 1][1];
}

function calculatePrice(plan: PlanKey, records: number) {
  return Math.round(records * getRate(plan, records));
}

export default function CreateUserModal({ onClose }: Props) {
  /* ===== USER BASIC ===== */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");

  /* ===== PLAN ===== */
  const [plan, setPlan] = useState<PlanKey>("plan1");

  /* ===== USER LIMITS ===== */
  const [records, setRecords] = useState(100);
  const [smsTotal, setSmsTotal] = useState(records * SMS_PER_RECORD);
  const [smsAuto, setSmsAuto] = useState(true);
  const [includeCalls, setIncludeCalls] = useState(false);

  /* ===== USER BILLING ===== */
  const [price, setPrice] = useState<number | "">("");
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("stripe");

  /* ===== PRODUCER BILLING ===== */
  const [producerPricePerRecord, setProducerPricePerRecord] =
    useState<number | "">("");

  /* ===== AUTO SMS ===== */
  useEffect(() => {
    if (smsAuto) {
      setSmsTotal(records * SMS_PER_RECORD);
    }
  }, [records, smsAuto]);

  /* ===== AUTO PRICE ===== */
  useEffect(() => {
    if (role === "user" && records) {
      const calculated = calculatePrice(plan, records);
      setPrice(calculated);
    }
  }, [records, plan, role]);

  /* ===================================================== */
  async function handleSubmit() {
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
            limits: {
              records,
              smsTotal,
              smsPerRecord: SMS_PER_RECORD,
              smsAuto,
              includeCalls,
            },
            billing: {
              price,
              paymentStatus,
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

      if (paymentStatus === "stripe" && data.userId) {
        const checkoutRes = await fetch(
          `/api/admin/users/${data.userId}/checkout`,
          { method: "POST", credentials: "include" }
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

  /* ===================================================== */
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border max-h-[90vh] flex flex-col">

        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">יצירת משתמש חדש</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-xl">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto">

          {/* PLAN SELECT */}
          {role === "user" && (
            <section>
              <label className="block text-sm font-medium mb-2">
                בחרי חבילה
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as PlanKey)}
                className="w-full border rounded-lg px-4 py-2"
              >
                <option value="plan1">קל להזמין</option>
                <option value="plan2">מזמינים חכם</option>
                <option value="plan3">מזמינים ומושיבים</option>
              </select>
            </section>
          )}

          {/* RECORDS */}
          {role === "user" && (
            <section>
              <label className="block text-sm font-medium mb-1">
                כמות רשומות
              </label>

              <input
                type="number"
                min={1}
                value={records}
                onChange={(e) => setRecords(Number(e.target.value))}
                className="w-full border rounded-lg px-4 py-2"
              />

              <div className="mt-4 grid grid-cols-4 gap-2">
                {RECORD_PACKAGES.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRecords(num)}
                    className={`text-xs py-2 rounded-md border transition ${
                      records === num
                        ? "bg-black text-white border-black"
                        : "bg-white hover:bg-gray-100"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* PRICE DISPLAY */}
          {role === "user" && (
            <section>
              <label className="block text-sm font-medium mb-1">
                מחיר כולל (₪)
              </label>
              <input
                type="number"
                value={price}
                readOnly
                className="w-full border rounded-lg px-4 py-2 bg-gray-50"
              />
            </section>
          )}

        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            ביטול
          </button>

          <button
            onClick={handleSubmit}
            disabled={
              !name ||
              !email ||
              (role === "producer" && !producerPricePerRecord)
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
