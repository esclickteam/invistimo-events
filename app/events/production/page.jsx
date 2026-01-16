"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* =========================
   ספקים קבועים לחתונה
========================= */
const WEDDING_SUPPLIERS = [
  { key: "venue", label: "אולם / גן אירועים", type: "perGuest" },
  { key: "dj", label: "DJ" },
  { key: "photography", label: "צילום" },
  { key: "design", label: "עיצוב אולם" },
  { key: "attractions", label: "אטרקציות" },
  { key: "lighting", label: "תאורה והגברה" },
  { key: "bridal_dress", label: "שמלת כלה" },
  { key: "groom_suit", label: "חליפה" },
  { key: "makeup", label: "איפור ושיער" },
  { key: "rabbi", label: "רב / חופה" },
  { key: "rings", label: "טבעות" },
  { key: "transport", label: "הסעות" },
];

export default function EventProductionPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [budgetTotal, setBudgetTotal] = useState(0);
  const [guestCount, setGuestCount] = useState(0);
  const [user, setUser] = useState(null);

  const [suppliers, setSuppliers] = useState(
    WEDDING_SUPPLIERS.map((s) => ({
      ...s,
      options: [],
      selectedOptionId: null,
      isCustom: false,
    }))
  );

  const [customSupplierName, setCustomSupplierName] = useState("");

  /* =========================
     AUTH – תנאי יחיד: מפיק יצר יוזר
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

      setUser(data.user);
      setLoading(false);
    }

    loadUser();
  }, [router]);

  /* =========================
     CALCULATIONS
  ========================= */
  const totalCost = suppliers.reduce((sum, s) => {
    const selected = s.options.find(
      (o) => o.id === s.selectedOptionId
    );
    if (!selected) return sum;

    const cost =
      s.type === "perGuest"
        ? selected.price * guestCount
        : selected.price;

    return sum + cost;
  }, 0);

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

  function removeSupplier(supplierKey) {
    setSuppliers((prev) =>
      prev.filter((s) => s.key !== supplierKey)
    );
  }

  function addCustomSupplier() {
    if (!customSupplierName.trim()) return;

    setSuppliers((prev) => [
      ...prev,
      {
        key: `custom_${crypto.randomUUID()}`,
        label: customSupplierName,
        type: "fixed",
        options: [],
        selectedOptionId: null,
        isCustom: true,
      },
    ]);

    setCustomSupplierName("");
  }

  if (loading) return <div>טוען…</div>;

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="p-6 space-y-8" dir="rtl">
      <h1 className="text-2xl font-bold">הפקת אירוע</h1>

      {/* תקציב */}
      <section className="border rounded-xl p-4 space-y-2">
        <div className="flex gap-4 items-center">
          <label>תקציב כולל:</label>
          <input
            type="number"
            value={budgetTotal}
            onChange={(e) => setBudgetTotal(Number(e.target.value))}
            className="border rounded px-3 py-1 w-40"
          />
        </div>

        <div>סה״כ הוצאות: ₪{totalCost}</div>
        <div
          className={`font-bold ${
            remainingBudget < 0 ? "text-red-600" : "text-green-600"
          }`}
        >
          יתרה: ₪{remainingBudget}
        </div>
      </section>

      {/* הוספת ספק חופשי */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">➕ הוספת ספק חופשי</h2>

        <div className="flex gap-3">
          <input
            placeholder="שם הספק"
            value={customSupplierName}
            onChange={(e) => setCustomSupplierName(e.target.value)}
            className="border rounded px-3 py-1 flex-1"
          />
          <button
            onClick={addCustomSupplier}
            className="bg-black text-white rounded px-4"
          >
            הוסף
          </button>
        </div>
      </section>

      {/* ספקים */}
      {suppliers.map((supplier) => (
        <section
          key={supplier.key}
          className="border rounded-xl p-4 space-y-3"
        >
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">{supplier.label}</h2>

            <div className="flex gap-3 text-sm">
              <button
                onClick={() => addOption(supplier.key)}
                className="underline"
              >
                הצעות מפיק
              </button>

              {supplier.isCustom && (
                <button
                  onClick={() => removeSupplier(supplier.key)}
                  className="text-red-600"
                >
                  מחק
                </button>
              )}
            </div>
          </div>

          {supplier.options.map((opt) => (
            <div
              key={opt.id}
              className="grid grid-cols-6 gap-2 items-center"
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
                className="border rounded px-2 py-1"
              />

              <input
                type="number"
                placeholder={
                  supplier.type === "perGuest"
                    ? "מחיר למנה"
                    : "מחיר"
                }
                value={opt.price}
                onChange={(e) =>
                  updateOption(
                    supplier.key,
                    opt.id,
                    "price",
                    Number(e.target.value)
                  )
                }
                className="border rounded px-2 py-1"
              />

              <input
                placeholder="מה כלול"
                value={opt.includes}
                onChange={(e) =>
                  updateOption(
                    supplier.key,
                    opt.id,
                    "includes",
                    e.target.value
                  )
                }
                className="border rounded px-2 py-1 col-span-3"
              />

              <input
                type="radio"
                checked={supplier.selectedOptionId === opt.id}
                onChange={() =>
                  selectOption(supplier.key, opt.id)
                }
              />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
