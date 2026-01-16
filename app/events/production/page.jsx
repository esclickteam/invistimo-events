"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* =========================
   ספקים קבועים
========================= */
const WEDDING_SUPPLIERS = [
  { key: "venue", label: "אולם / גן אירועים", type: "perGuest" },
  { key: "dj", label: "DJ", type: "fixed" },
  { key: "photography", label: "צילום", type: "fixed" },
  { key: "design", label: "עיצוב אולם", type: "fixed" },
  { key: "attractions", label: "אטרקציות", type: "fixed" },
  { key: "lighting", label: "תאורה והגברה", type: "fixed" },
  { key: "bridal_dress", label: "שמלת כלה", type: "fixed" },
  { key: "groom_suit", label: "חליפה", type: "fixed" },
  { key: "makeup", label: "איפור ושיער", type: "fixed" },
  { key: "rabbi", label: "רב / חופה", type: "fixed" },
  { key: "rings", label: "טבעות", type: "fixed" },
  { key: "transport", label: "הסעות", type: "fixed" },
];

/* =========================
   סטטוסים
========================= */
const SUPPLIER_STATUS = {
  OPEN: "פתוח",
  CONSIDERING: "בהתלבטות",
  SELECTED: "סגור",
};

export default function EventProductionPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [budgetTotal, setBudgetTotal] = useState(0);
  const [guestCount, setGuestCount] = useState(0);

  const [suppliers, setSuppliers] = useState(
    WEDDING_SUPPLIERS.map((s) => ({
      ...s,
      status: SUPPLIER_STATUS.OPEN,
      notes: "",
      options: [],
      selectedOptionId: null,
      isCustom: false,
      isOpen: true,
    }))
  );

  const [customSupplierName, setCustomSupplierName] = useState("");

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

      setUser(data.user);
      setGuestCount(data.user.guestCount || 0);
      setLoading(false);
    }

    loadUser();
  }, [router]);

  /* =========================
     חישובי תקציב
  ========================= */
  const totalCost = useMemo(() => {
    return suppliers.reduce((sum, s) => {
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
  }, [suppliers, guestCount]);

  const remainingBudget = budgetTotal - totalCost;

  const openSuppliersCount = suppliers.filter(
    (s) => s.status !== SUPPLIER_STATUS.SELECTED
  ).length;

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
                  notes: "",
                  isRecommended: false,
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
          ? {
              ...s,
              selectedOptionId: optionId,
              status: SUPPLIER_STATUS.SELECTED,
              isOpen: false,
            }
          : s
      )
    );
  }

  function toggleSupplierOpen(key) {
    setSuppliers((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, isOpen: !s.isOpen } : s
      )
    );
  }

  function updateSupplierField(key, field, value) {
    setSuppliers((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, [field]: value } : s
      )
    );
  }

  function removeSupplier(key) {
    setSuppliers((prev) => prev.filter((s) => s.key !== key));
  }

  function addCustomSupplier() {
    if (!customSupplierName.trim()) return;

    setSuppliers((prev) => [
      ...prev,
      {
        key: `custom_${crypto.randomUUID()}`,
        label: customSupplierName,
        type: "fixed",
        status: SUPPLIER_STATUS.OPEN,
        notes: "",
        options: [],
        selectedOptionId: null,
        isCustom: true,
        isOpen: true,
      },
    ]);

    setCustomSupplierName("");
  }

  if (loading) return <div className="p-6">טוען…</div>;

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="p-6 space-y-8" dir="rtl">
      <h1 className="text-2xl font-bold">הפקת אירוע</h1>

      {/* ===== תמונת מצב ===== */}
      <section className="sticky top-0 z-10 bg-white border rounded-xl p-4 grid grid-cols-4 gap-4">
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
        <div className="col-span-4 text-sm text-gray-500">
          תחומים פתוחים: {openSuppliersCount}
        </div>
      </section>

      {/* ===== תקציב ===== */}
      <section className="border rounded-xl p-4 space-y-2">
        <label className="font-semibold">תקציב כולל</label>
        <input
          type="number"
          value={budgetTotal}
          onChange={(e) => setBudgetTotal(Number(e.target.value))}
          className="border rounded px-3 py-1 w-48"
        />
      </section>

      {/* ===== הוספת ספק חופשי ===== */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">➕ הוספת תחום ספק</h2>
        <div className="flex gap-3">
          <input
            placeholder="שם התחום"
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

      {/* ===== ספקים ===== */}
      {suppliers.map((supplier) => {
        const selected = supplier.options.find(
          (o) => o.id === supplier.selectedOptionId
        );

        return (
          <section
            key={supplier.key}
            className="border rounded-xl p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex justify-between items-center">
              <div
                className="cursor-pointer"
                onClick={() => toggleSupplierOpen(supplier.key)}
              >
                <h2 className="font-semibold text-lg">
                  {supplier.label}{" "}
                  <span className="text-sm text-gray-500">
                    ({supplier.status})
                  </span>
                </h2>

                {selected && (
                  <div className="text-sm text-green-600">
                    ✔ נבחר: {selected.name} – ₪
                    {supplier.type === "perGuest"
                      ? selected.price * guestCount
                      : selected.price}
                  </div>
                )}
              </div>

              {supplier.isCustom && (
                <button
                  onClick={() => removeSupplier(supplier.key)}
                  className="text-red-600 text-sm"
                >
                  מחק
                </button>
              )}
            </div>

            {/* תוכן */}
            {supplier.isOpen && (
              <>
                <button
                  onClick={() => addOption(supplier.key)}
                  className="text-sm underline"
                >
                  ➕ הוסף הצעת מפיק
                </button>

                {supplier.options.map((opt) => (
                  <div
                    key={opt.id}
                    className="grid grid-cols-7 gap-2 items-center border rounded p-2"
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
                          ? "מחיר לאורח"
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
                      className="border rounded px-2 py-1 col-span-2"
                    />

                    <input
                      placeholder="הערות מפיק"
                      value={opt.notes}
                      onChange={(e) =>
                        updateOption(
                          supplier.key,
                          opt.id,
                          "notes",
                          e.target.value
                        )
                      }
                      className="border rounded px-2 py-1 col-span-2"
                    />

                    <button
                      onClick={() =>
                        selectOption(supplier.key, opt.id)
                      }
                      className="text-green-600 text-sm"
                    >
                      בחירת זוג
                    </button>
                  </div>
                ))}

                <textarea
                  placeholder="הערות כלליות לתחום"
                  value={supplier.notes}
                  onChange={(e) =>
                    updateSupplierField(
                      supplier.key,
                      "notes",
                      e.target.value
                    )
                  }
                  className="border rounded w-full p-2 mt-2"
                />
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
