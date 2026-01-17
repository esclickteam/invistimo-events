"use client";

import { useState, useMemo } from "react";

/* =====================================================
   קטלוג קבוע – כל תחומי האירוע
===================================================== */

const CATEGORIES = [
  {
    id: "photo",
    name: "צילום",
    subs: ["סטילס", "וידאו", "מגנטים", "רחפן", "סושיאל"],
  },
  {
    id: "music",
    name: "מוזיקה ובידור",
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

/* =====================================================
   COMPONENT
===================================================== */

export default function SuppliersTab() {
  /* -------------------------------------------------
     יצירת כל שורות הטבלה מראש (UX נכון)
  -------------------------------------------------- */
  const initialRows = useMemo(() => {
    return CATEGORIES.flatMap((cat) =>
      cat.subs.map((sub) => ({
        id: `${cat.id}-${sub}`,
        categoryId: cat.id,
        category: cat.name,
        sub,
        supplier: null,
        price: "",
        advance: "",
        balance: "",
        files: [],
      }))
    );
  }, []);

  const [rows, setRows] = useState(initialRows);
  const [openRowIndex, setOpenRowIndex] = useState(null);

  /* ספקים לפי תחום + תת תחום */
  const [suppliersDB, setSuppliersDB] = useState({});

  /* -------------------------------------------------
     פעולות
  -------------------------------------------------- */

  function updateRow(index, field, value) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  }

  function selectSupplier(index, supplier) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              supplier,
              price: supplier.price || "",
            }
          : row
      )
    );
    setOpenRowIndex(null);
  }

  function addSupplier(dbKey, supplier) {
    setSuppliersDB((prev) => ({
      ...prev,
      [dbKey]: [
        ...(prev[dbKey] || []),
        { ...supplier, id: Date.now() },
      ],
    }));
  }

  /* -------------------------------------------------
     UI
  -------------------------------------------------- */

  return (
    <div className="max-w-7xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-xl font-semibold">ספקים סגורים לאירוע</h1>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
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
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-4 text-right font-medium text-gray-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => {
              const dbKey = `${row.categoryId}-${row.sub}`;
              const suppliers = suppliersDB[dbKey] || [];

              return (
                <>
                  <tr key={row.id} className="border-t">
                    <td className="px-6 py-4">{row.category}</td>
                    <td className="px-6 py-4">{row.sub}</td>
                    <td className="px-6 py-4 font-medium">
                      {row.supplier ? row.supplier.name : "לא נבחר"}
                    </td>

                    <td className="px-6 py-4">
                      <input
                        className="border rounded-lg px-3 py-2 w-28"
                        value={row.price}
                        onChange={(e) =>
                          updateRow(index, "price", e.target.value)
                        }
                      />
                    </td>

                    <td className="px-6 py-4">
                      <input
                        className="border rounded-lg px-3 py-2 w-28"
                        value={row.advance}
                        onChange={(e) =>
                          updateRow(index, "advance", e.target.value)
                        }
                      />
                    </td>

                    <td className="px-6 py-4">
                      <input
                        className="border rounded-lg px-3 py-2 w-28"
                        value={row.balance}
                        onChange={(e) =>
                          updateRow(index, "balance", e.target.value)
                        }
                      />
                    </td>

                    <td className="px-6 py-4">
                      <input type="file" multiple />
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          setOpenRowIndex(
                            openRowIndex === index ? null : index
                          )
                        }
                        className="border px-4 py-2 rounded-lg"
                      >
                        {row.supplier ? "החלף ספק" : "בחר ספק"}
                      </button>
                    </td>
                  </tr>

                  {openRowIndex === index && (
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="px-8 py-6">
                        <SupplierPicker
                          suppliers={suppliers}
                          onSelect={(s) =>
                            selectSupplier(index, s)
                          }
                          onAdd={(s) => addSupplier(dbKey, s)}
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
    </div>
  );
}

/* =====================================================
   Supplier Picker – בחירה + הוספה
===================================================== */

function SupplierPicker({ suppliers, onSelect, onAdd }) {
  const [form, setForm] = useState({
    name: "",
    price: "",
    phone: "",
    link: "",
  });

  return (
    <div className="space-y-5">
      {suppliers.length === 0 && (
        <div className="text-sm text-gray-500">
          אין ספקים עדיין בתחום הזה
        </div>
      )}

      <div className="grid gap-3">
        {suppliers.map((s) => (
          <div
            key={s.id}
            className="flex justify-between items-center border rounded-xl px-5 py-4"
          >
            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-gray-500">
                ₪{s.price} · {s.phone}
              </div>
            </div>
            <button
              onClick={() => onSelect(s)}
              className="bg-black text-white px-4 py-2 rounded-lg"
            >
              בחר
            </button>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-3">
        <h4 className="font-medium">➕ הוספת ספק חדש</h4>

        <div className="flex flex-wrap gap-3">
          <input
            placeholder="שם ספק"
            className="border rounded-lg px-3 py-2"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />
          <input
            placeholder="מחיר"
            className="border rounded-lg px-3 py-2 w-28"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: e.target.value })
            }
          />
          <input
            placeholder="טלפון"
            className="border rounded-lg px-3 py-2"
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />
          <input
            placeholder="קישור"
            className="border rounded-lg px-3 py-2"
            value={form.link}
            onChange={(e) =>
              setForm({ ...form, link: e.target.value })
            }
          />

          <button
            onClick={() => {
              if (!form.name) return;
              onAdd(form);
              setForm({
                name: "",
                price: "",
                phone: "",
                link: "",
              });
            }}
            className="bg-black text-white px-5 py-2 rounded-lg"
          >
            הוסף
          </button>
        </div>
      </div>
    </div>
  );
}
