"use client";

import { useState } from "react";

/* ======================
   CONFIG – תחומים
====================== */

const CATEGORIES = [
  {
    id: "photo",
    name: "צילום",
    subs: ["סטילס", "וידאו", "מגנטים", "רחפן", "סושיאל"],
  },
  {
    id: "music",
    name: "מוזיקה",
    subs: ["DJ", "להקה", "נגן", "זמר חופה"],
  },
  {
    id: "food",
    name: "אוכל ושתייה",
    subs: ["אולם", "קייטרינג", "בר אלכוהול", "קינוחים"],
  },
  {
    id: "design",
    name: "עיצוב והפקה",
    subs: ["חופה", "שולחנות", "פרחים", "תאורה", "הגברה"],
  },
  {
    id: "extras",
    name: "אטרקציות",
    subs: ["מגנטים מיוחדים", "360", "עשן כבד", "זיקוקים"],
  },
  {
    id: "content",
    name: "תוכן וניהול",
    subs: ["רב / מנחה", "מפיק יום", "סידורי הושבה"],
  },
];

/* ======================
   MAIN COMPONENT
====================== */

export default function SuppliersTab() {
  const [rows, setRows] = useState([]);
  const [openPickerRow, setOpenPickerRow] = useState(null);

  const [suppliersDB, setSuppliersDB] = useState({});

  /* ======================
     ACTIONS
  ====================== */

  function addRow(category, sub) {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        category: category.name,
        categoryId: category.id,
        sub,
        supplier: null,
        totalPrice: "",
        advance: "",
        balance: "",
        files: [],
      },
    ]);
  }

  function updateRow(index, field, value) {
    const copy = [...rows];
    copy[index][field] = value;
    setRows(copy);
  }

  function selectSupplier(index, supplier) {
    const copy = [...rows];
    copy[index].supplier = supplier;
    copy[index].totalPrice = supplier.price;
    setRows(copy);
    setOpenPickerRow(null);
  }

  function addSupplierToDB(key, supplier) {
    setSuppliersDB((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), supplier],
    }));
  }

  /* ======================
     RENDER
  ====================== */

  return (
    <div className="space-y-10 max-w-7xl" dir="rtl">

      {/* ======================
          ADD ROWS
      ====================== */}
      <section className="bg-white rounded-2xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">➕ הוספת ספק / תחום לאירוע</h2>

        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="flex flex-wrap items-center gap-3">
            <span className="font-medium">{cat.name}:</span>
            {cat.subs.map((sub) => (
              <button
                key={sub}
                onClick={() => addRow(cat, sub)}
                className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-100"
              >
                {sub}
              </button>
            ))}
          </div>
        ))}
      </section>

      {/* ======================
          TABLE (ALWAYS VISIBLE)
      ====================== */}
      <section className="bg-white rounded-2xl border p-6">
        <h2 className="text-lg font-semibold mb-4">📋 ספקים סגורים לאירוע</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "תחום",
                  "תת־תחום",
                  "ספק",
                  "מחיר כולל",
                  "מקדמה",
                  "יתרה",
                  "קבצים",
                  "פעולה",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-right font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    עדיין לא נוספו ספקים
                  </td>
                </tr>
              )}

              {rows.map((row, i) => {
                const dbKey = `${row.categoryId}-${row.sub}`;
                const suppliers = suppliersDB[dbKey] || [];

                return (
                  <>
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-3">{row.category}</td>
                      <td className="px-4 py-3">{row.sub}</td>
                      <td className="px-4 py-3">
                        {row.supplier?.name || "לא נבחר"}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="border rounded-lg px-2 py-1 w-28"
                          value={row.totalPrice}
                          onChange={(e) =>
                            updateRow(i, "totalPrice", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="border rounded-lg px-2 py-1 w-28"
                          value={row.advance}
                          onChange={(e) =>
                            updateRow(i, "advance", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="border rounded-lg px-2 py-1 w-28"
                          value={row.balance}
                          onChange={(e) =>
                            updateRow(i, "balance", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input type="file" multiple />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setOpenPickerRow(i)}
                          className="px-3 py-1.5 border rounded-lg text-sm"
                        >
                          {row.supplier ? "החלף ספק" : "בחר ספק"}
                        </button>
                      </td>
                    </tr>

                    {/* ======================
                        SUPPLIER PICKER
                    ====================== */}
                    {openPickerRow === i && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-6 py-5">
                          <SupplierPicker
                            suppliers={suppliers}
                            onSelect={(s) => selectSupplier(i, s)}
                            onAdd={(s) =>
                              addSupplierToDB(dbKey, {
                                ...s,
                                id: Date.now(),
                              })
                            }
                          />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ======================
   SUPPLIER PICKER
====================== */

function SupplierPicker({ suppliers, onSelect, onAdd }) {
  const [form, setForm] = useState({
    name: "",
    price: "",
    phone: "",
    link: "",
  });

  return (
    <div className="space-y-6">
      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            {["שם", "מחיר", "טלפון", "קישור", "בחירה"].map((h) => (
              <th key={h} className="px-4 py-2 text-right">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="px-4 py-2">{s.name}</td>
              <td className="px-4 py-2">₪{s.price}</td>
              <td className="px-4 py-2">{s.phone}</td>
              <td className="px-4 py-2">
                <a
                  href={s.link}
                  target="_blank"
                  className="text-blue-600 underline"
                >
                  קישור
                </a>
              </td>
              <td className="px-4 py-2">
                <button
                  onClick={() => onSelect(s)}
                  className="bg-black text-white px-3 py-1 rounded-lg"
                >
                  בחר
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ADD NEW SUPPLIER */}
      <div className="flex flex-wrap gap-3">
        {["name", "price", "phone", "link"].map((f) => (
          <input
            key={f}
            placeholder={f === "name" ? "שם ספק" : f}
            className="border rounded-lg px-3 py-1.5"
            value={form[f]}
            onChange={(e) => setForm({ ...form, [f]: e.target.value })}
          />
        ))}
        <button
          onClick={() => {
            if (!form.name) return;
            onAdd(form);
            setForm({ name: "", price: "", phone: "", link: "" });
          }}
          className="bg-black text-white px-4 py-1.5 rounded-lg"
        >
          ➕ הוסף ספק
        </button>
      </div>
    </div>
  );
}
