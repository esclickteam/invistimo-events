"use client";

import { useState } from "react";

/* ======================
   CONFIG
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
    subs: ["DJ", "להקה", "נגן סקסופון", "זמר חופה"],
  },
  {
    id: "food",
    name: "אוכל ושתייה",
    subs: ["קייטרינג", "בר אלכוהול", "קינוחים"],
  },
];

/* ======================
   MAIN
====================== */

export default function SuppliersTab() {
  const [rows, setRows] = useState([]);
  const [openPicker, setOpenPicker] = useState(null);

  const [suppliersDB, setSuppliersDB] = useState({
    "photo-סטילס": [
      {
        id: "s1",
        name: "עידן לוי",
        price: 8500,
        phone: "050-1234567",
        link: "https://instagram.com/idan",
      },
    ],
    "music-DJ": [
      {
        id: "s2",
        name: "DJ איתי",
        price: 7000,
        phone: "054-3332222",
        link: "https://instagram.com/dj_itay",
      },
    ],
  });

  /* ======================
     HELPERS
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
      },
    ]);
  }

  function selectSupplier(rowIndex, supplier) {
    const updated = [...rows];
    updated[rowIndex].supplier = supplier;
    updated[rowIndex].totalPrice = supplier.price;
    setRows(updated);
    setOpenPicker(null);
  }

  function updateRowField(i, field, value) {
    const updated = [...rows];
    updated[i][field] = value;
    setRows(updated);
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
    <div className="space-y-10 max-w-6xl" dir="rtl">

      {/* הוספת שורות */}
      <section className="bg-white p-5 rounded-2xl border space-y-4">
        <h3 className="font-semibold text-lg">➕ הוספת ספקים ותחומים לאירוע</h3>

        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="flex flex-wrap gap-3">
            <span className="font-medium">{cat.name}:</span>
            {cat.subs.map((sub) => (
              <button
                key={sub}
                onClick={() => addRow(cat, sub)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
              >
                {sub}
              </button>
            ))}
          </div>
        ))}
      </section>

      {/* טבלת ספקים סגורים */}
      <section className="bg-white p-5 rounded-2xl border">
        <h3 className="font-semibold text-lg mb-4">📋 ספקים סגורים</h3>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">לא נוספו ספקים</p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th>תחום</th>
                <th>תת־תחום</th>
                <th>ספק</th>
                <th>מחיר</th>
                <th>מקדמה</th>
                <th>יתרה</th>
                <th>בחירה</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const dbKey = `${row.categoryId}-${row.sub}`;
                const suppliers = suppliersDB[dbKey] || [];

                return (
                  <>
                    <tr key={row.id} className="border-t">
                      <td>{row.category}</td>
                      <td>{row.sub}</td>
                      <td>{row.supplier?.name || "—"}</td>
                      <td>
                        <input
                          className="border px-2 py-1 w-24"
                          value={row.totalPrice}
                          onChange={(e) =>
                            updateRowField(i, "totalPrice", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="border px-2 py-1 w-24"
                          value={row.advance}
                          onChange={(e) =>
                            updateRowField(i, "advance", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="border px-2 py-1 w-24"
                          value={row.balance}
                          onChange={(e) =>
                            updateRowField(i, "balance", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <button
                          onClick={() => setOpenPicker(i)}
                          className="border px-3 py-1 rounded"
                        >
                          בחר ספק
                        </button>
                      </td>
                    </tr>

                    {/* פאנל בחירה + הוספה */}
                    {openPicker === i && (
                      <tr>
                        <td colSpan={7} className="bg-gray-50 p-4">
                          <SupplierPicker
                            suppliers={suppliers}
                            onSelect={(s) => selectSupplier(i, s)}
                            onAdd={(s) =>
                              addSupplierToDB(dbKey, {
                                ...s,
                                id: Date.now().toString(),
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
        )}
      </section>
    </div>
  );
}

/* ======================
   PICKER COMPONENT
====================== */

function SupplierPicker({ suppliers, onSelect, onAdd }) {
  const [form, setForm] = useState({
    name: "",
    price: "",
    phone: "",
    link: "",
  });

  return (
    <div className="space-y-4">
      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th>שם</th>
            <th>מחיר</th>
            <th>טלפון</th>
            <th>קישור</th>
            <th>בחירה</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s.id} className="border-t">
              <td>{s.name}</td>
              <td>₪{s.price}</td>
              <td>{s.phone}</td>
              <td>
                <a
                  href={s.link}
                  target="_blank"
                  className="text-blue-600 underline"
                >
                  קישור
                </a>
              </td>
              <td>
                <button
                  onClick={() => onSelect(s)}
                  className="bg-black text-white px-3 py-1 rounded"
                >
                  בחר
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* הוספת ספק */}
      <div className="flex flex-wrap gap-2 text-sm">
        <input
          placeholder="שם ספק"
          className="border px-2 py-1"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="מחיר"
          className="border px-2 py-1 w-24"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <input
          placeholder="טלפון"
          className="border px-2 py-1"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          placeholder="קישור"
          className="border px-2 py-1"
          value={form.link}
          onChange={(e) => setForm({ ...form, link: e.target.value })}
        />
        <button
          onClick={() => {
            if (!form.name) return;
            onAdd(form);
            setForm({ name: "", price: "", phone: "", link: "" });
          }}
          className="bg-black text-white px-3 py-1 rounded"
        >
          ➕ הוסף ספק
        </button>
      </div>
    </div>
  );
}
