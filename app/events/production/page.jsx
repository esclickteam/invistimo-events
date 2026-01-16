"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* =========================
   ספקים
========================= */
const WEDDING_SUPPLIERS = [
  { key: "venue", label: "אולם / גן אירועים", type: "perGuest" },
  { key: "dj", label: "DJ", type: "fixed" },
  { key: "photography", label: "צילום", type: "fixed" },
  { key: "lighting", label: "תאורה והגברה", type: "fixed" },
  { key: "design", label: "עיצוב אולם", type: "fixed" },
  { key: "attractions", label: "אטרקציות", type: "fixed" },
];

const CORE_SUPPLIERS_KEYS = ["venue", "dj", "photography", "lighting"];

export default function EventProductionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [budgetTotal, setBudgetTotal] = useState(0);
  const [guestCount, setGuestCount] = useState(0);

  const [suppliers, setSuppliers] = useState(
    WEDDING_SUPPLIERS.map((s) => ({
      ...s,
      options: [],
      selectedOptionId: null,
      notes: "",
      isOpen: true,
    }))
  );

  /* =========================
     AUTH
  ========================= */
  useEffect(() => {
    async function loadUser() {
      const res = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();

      if (!data?.success || !data.user?.createdByProducer) {
        router.replace("/dashboard");
        return;
      }

      setGuestCount(data.user.guestCount || 0);
      setLoading(false);
    }

    loadUser();
  }, [router]);

  /* =========================
     חישובים
  ========================= */
  const totalCost = useMemo(() => {
    return suppliers.reduce((sum, s) => {
      const sel = s.options.find(
        (o) => o.id === s.selectedOptionId
      );
      if (!sel) return sum;

      const cost =
        s.type === "perGuest"
          ? sel.price * guestCount
          : sel.price;

      return sum + cost;
    }, 0);
  }, [suppliers, guestCount]);

  const remainingBudget = budgetTotal - totalCost;

  /* =========================
     HANDLERS
  ========================= */
  function addOption(supplierKey) {
    setSuppliers((prev) =>
      prev.map((s) =>
        s.key === supplierKey
          ? {
              ...s,
              options: [
                ...s.options,
                {
                  id: crypto.randomUUID(),
                  name: "",
                  price: 0,
                  deposit: 0,
                  includes: "",
                },
              ],
            }
          : s
      )
    );
  }

  function updateOption(supplierKey, optionId, field, value) {
    setSuppliers((prev) =>
      prev.map((s) =>
        s.key === supplierKey
          ? {
              ...s,
              options: s.options.map((o) =>
                o.id === optionId ? { ...o, [field]: value } : o
              ),
            }
          : s
      )
    );
  }

  function selectOption(supplierKey, optionId) {
    setSuppliers((prev) =>
      prev.map((s) =>
        s.key === supplierKey
          ? { ...s, selectedOptionId: optionId }
          : s
      )
    );
  }

  if (loading) return <div className="p-6">טוען…</div>;

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="p-6 space-y-10" dir="rtl">
      <h1 className="text-2xl font-bold">הפקת אירוע</h1>

      {/* ===== סיכום ===== */}
      <section className="grid grid-cols-4 gap-4 border rounded-xl p-4 bg-white">
        <div>👥 מוזמנים: {guestCount}</div>
        <div>💰 תקציב: ₪{budgetTotal}</div>
        <div>📊 הוצאות: ₪{totalCost}</div>
        <div
          className={`font-bold ${
            remainingBudget < 0 ? "text-red-600" : "text-green-600"
          }`}
        >
          יתרה: ₪{remainingBudget}
        </div>
      </section>

      {/* ===== תקציב ===== */}
      <section className="border rounded-xl p-4">
        <label className="font-semibold">תקציב כולל</label>
        <input
          type="number"
          value={budgetTotal}
          onChange={(e) => setBudgetTotal(+e.target.value)}
          className="border rounded px-3 py-1 w-48 block mt-2"
        />
      </section>

      {/* ===== ספקי ליבה ===== */}
      <section>
        <h2 className="text-xl font-bold mb-4">ספקים מרכזיים</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers
            .filter((s) => CORE_SUPPLIERS_KEYS.includes(s.key))
            .map((supplier) => {
              const selected = supplier.options.find(
                (o) => o.id === supplier.selectedOptionId
              );

              return (
                <div
                  key={supplier.key}
                  className="border rounded-xl p-4 space-y-4 bg-white"
                >
                  <h3 className="font-semibold text-lg">
                    {supplier.label}
                  </h3>

                  <button
                    onClick={() => addOption(supplier.key)}
                    className="text-sm underline"
                  >
                    ➕ הוסף הצעת מפיק
                  </button>

                  {supplier.options.map((opt) => {
                    const total =
                      supplier.type === "perGuest"
                        ? opt.price * guestCount
                        : opt.price;

                    const remaining =
                      total - (opt.deposit || 0);

                    return (
                      <div
                        key={opt.id}
                        className={`border rounded-lg p-3 space-y-3 ${
                          supplier.selectedOptionId === opt.id
                            ? "border-green-500 bg-green-50"
                            : ""
                        }`}
                      >
                        <input
                          placeholder="שם ספק"
                          value={opt.name}
                          onChange={(e) =>
                            updateOption(
                              supplier.key,
                              opt.id,
                              "name",
                              e.target.value
                            )
                          }
                          className="border rounded px-2 py-1 w-full"
                        />

                        <input
                          type="number"
                          placeholder={
                            supplier.type === "perGuest"
                              ? "מחיר לאורח"
                              : "מחיר כולל"
                          }
                          value={opt.price}
                          onChange={(e) =>
                            updateOption(
                              supplier.key,
                              opt.id,
                              "price",
                              +e.target.value
                            )
                          }
                          className="border rounded px-2 py-1 w-full"
                        />

                        <input
                          type="number"
                          placeholder="מקדמה"
                          value={opt.deposit}
                          onChange={(e) =>
                            updateOption(
                              supplier.key,
                              opt.id,
                              "deposit",
                              +e.target.value
                            )
                          }
                          className="border rounded px-2 py-1 w-full"
                        />

                        {/* ===== טבלה כספית ===== */}
                        <div className="border rounded overflow-hidden text-sm">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="p-2">מחיר</th>
                                <th className="p-2">מקדמה</th>
                                <th className="p-2">
                                  יתרה לתשלום
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="text-center">
                                <td className="p-2">
                                  ₪{total}
                                </td>
                                <td className="p-2">
                                  ₪{opt.deposit || 0}
                                </td>
                                <td className="p-2 font-bold">
                                  ₪{remaining}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <button
                          onClick={() =>
                            selectOption(
                              supplier.key,
                              opt.id
                            )
                          }
                          className="text-green-700 text-sm font-semibold"
                        >
                          ✔ בחירת זוג
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}
