"use client";

import { useState } from "react";

/* ======================
   INITIAL STRUCTURE
====================== */

const INITIAL_CATEGORIES = [
  {
    id: "photo",
    name: "צילום",
    subCategories: [
      "סטילס",
      "וידאו",
      "רחפן",
      "מגנטים",
      "סושיאל / רילסים",
    ],
  },
  {
    id: "music",
    name: "מוזיקה ובידור",
    subCategories: ["DJ", "להקה", "נגן סקסופון", "זמר חופה"],
  },
  {
    id: "food",
    name: "אוכל ושתייה",
    subCategories: ["קייטרינג", "בר אלכוהול", "בר קוקטיילים", "קינוחים"],
  },
];

export default function SuppliersTab() {
  const [categories] = useState(INITIAL_CATEGORIES);

  // ספקים לפי תת־תחום
  const [suppliers, setSuppliers] = useState({});
  // ספק נבחר לכל תת־תחום
  const [selectedSuppliers, setSelectedSuppliers] = useState({});
  // תתי־תחומים שנבחרו
  const [enabledSubCategories, setEnabledSubCategories] = useState({});

  /* ======================
     HANDLERS
  ====================== */

  function toggleSubCategory(categoryId, sub) {
    const key = `${categoryId}-${sub}`;
    setEnabledSubCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function addSupplier(subKey, supplier) {
    setSuppliers((prev) => ({
      ...prev,
      [subKey]: [...(prev[subKey] || []), supplier],
    }));
  }

  function selectSupplier(subKey, supplier) {
    setSelectedSuppliers((prev) => ({
      ...prev,
      [subKey]: supplier,
    }));
  }

  /* ======================
     RENDER
  ====================== */

  return (
    <div className="space-y-8 max-w-6xl" dir="rtl">
      {categories.map((cat) => (
        <section
          key={cat.id}
          className="border rounded-2xl p-5 bg-white space-y-4"
        >
          <h3 className="text-lg font-semibold">{cat.name}</h3>

          {/* Sub categories selection */}
          <div className="flex flex-wrap gap-4">
            {cat.subCategories.map((sub) => {
              const key = `${cat.id}-${sub}`;
              return (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!enabledSubCategories[key]}
                    onChange={() => toggleSubCategory(cat.id, sub)}
                  />
                  {sub}
                </label>
              );
            })}
          </div>

          {/* Active sub categories */}
          {cat.subCategories.map((sub) => {
            const subKey = `${cat.id}-${sub}`;
            if (!enabledSubCategories[subKey]) return null;

            const selected = selectedSuppliers[subKey];

            return (
              <div
                key={subKey}
                className="border rounded-xl p-4 bg-gray-50 space-y-3"
              >
                <h4 className="font-medium">{sub}</h4>

                {/* Suppliers table */}
                <table className="w-full text-sm border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-right">ספק</th>
                      <th className="p-2 text-right">מחיר</th>
                      <th className="p-2 text-right">טלפון</th>
                      <th className="p-2 text-right">קישור</th>
                      <th className="p-2 text-right">פעולה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(suppliers[subKey] || []).map((s, i) => {
                      const isSelected =
                        selected?.name === s.name;

                      return (
                        <tr
                          key={i}
                          className={`border-t ${
                            isSelected ? "bg-green-50" : ""
                          }`}
                        >
                          <td className="p-2 font-medium">
                            {s.name}
                          </td>
                          <td className="p-2">₪{s.price}</td>
                          <td className="p-2">{s.phone}</td>
                          <td className="p-2">
                            <a
                              href={s.link}
                              target="_blank"
                              className="text-blue-600 underline"
                            >
                              קישור
                            </a>
                          </td>
                          <td className="p-2">
                            {isSelected ? (
                              <span className="text-green-600 font-semibold">
                                נבחר ✓
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  selectSupplier(subKey, s)
                                }
                                className="px-3 py-1 text-sm rounded bg-black text-white"
                              >
                                בחר ספק
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Add supplier */}
                <AddSupplierForm
                  onAdd={(supplier) =>
                    addSupplier(subKey, supplier)
                  }
                />
              </div>
            );
          })}
        </section>
      ))}

      {/* ======================
          SUMMARY TABLE
      ====================== */}
      <section className="border rounded-2xl p-5 bg-white">
        <h3 className="font-semibold text-lg mb-4">
          📋 ספקים שנבחרו בפועל
        </h3>

        {Object.keys(selectedSuppliers).length === 0 ? (
          <p className="text-sm text-gray-500">
            עדיין לא נבחרו ספקים
          </p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">תחום / תת־תחום</th>
                <th className="p-2">ספק</th>
                <th className="p-2">מחיר</th>
                <th className="p-2">טלפון</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(selectedSuppliers).map(
                ([key, s]) => (
                  <tr key={key} className="border-t">
                    <td className="p-2">{key}</td>
                    <td className="p-2">{s.name}</td>
                    <td className="p-2">₪{s.price}</td>
                    <td className="p-2">{s.phone}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

/* ======================
   ADD SUPPLIER FORM
====================== */

function AddSupplierForm({ onAdd }) {
  const [form, setForm] = useState({
    name: "",
    price: "",
    phone: "",
    link: "",
  });

  function submit() {
    if (!form.name) return;
    onAdd(form);
    setForm({ name: "", price: "", phone: "", link: "" });
  }

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <input
        placeholder="שם ספק"
        className="border rounded px-2 py-1"
        value={form.name}
        onChange={(e) =>
          setForm({ ...form, name: e.target.value })
        }
      />
      <input
        placeholder="מחיר"
        className="border rounded px-2 py-1"
        value={form.price}
        onChange={(e) =>
          setForm({ ...form, price: e.target.value })
        }
      />
      <input
        placeholder="טלפון"
        className="border rounded px-2 py-1"
        value={form.phone}
        onChange={(e) =>
          setForm({ ...form, phone: e.target.value })
        }
      />
      <input
        placeholder="קישור"
        className="border rounded px-2 py-1"
        value={form.link}
        onChange={(e) =>
          setForm({ ...form, link: e.target.value })
        }
      />

      <button
        onClick={submit}
        className="bg-black text-white px-3 rounded"
      >
        הוסף ספק
      </button>
    </div>
  );
}
