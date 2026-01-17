"use client";

import { useState } from "react";

/* ======================
   INITIAL CATALOG
====================== */

const INITIAL_CATEGORIES = [
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

/* ======================
   MAIN
====================== */

export default function SuppliersTab() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [rows, setRows] = useState([]);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openSupplierRow, setOpenSupplierRow] = useState(null);

  const [suppliersDB, setSuppliersDB] = useState({});

  /* ======================
     ADD ROW (EVENT LEVEL)
  ====================== */

  function addRow({ categoryId, categoryName, sub }) {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        categoryId,
        category: categoryName,
        sub,
        supplier: null,
        price: "",
        advance: "",
        balance: "",
        files: [],
      },
    ]);
  }

  function updateRow(i, field, value) {
    const copy = [...rows];
    copy[i][field] = value;
    setRows(copy);
  }

  function selectSupplier(i, supplier) {
    const copy = [...rows];
    copy[i].supplier = supplier;
    copy[i].price = supplier.price;
    setRows(copy);
    setOpenSupplierRow(null);
  }

  function addSupplier(dbKey, supplier) {
    setSuppliersDB((prev) => ({
      ...prev,
      [dbKey]: [...(prev[dbKey] || []), { ...supplier, id: Date.now() }],
    }));
  }

  /* ======================
     RENDER
  ====================== */

  return (
    <div className="max-w-7xl mx-auto space-y-10" dir="rtl">

      {/* HEADER ACTION */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">ספקים סגורים לאירוע</h1>
        <button
          onClick={() => setOpenAddModal(true)}
          className="bg-black text-white px-5 py-2 rounded-xl"
        >
          ➕ הוסף ספק / תחום
        </button>
      </div>

      {/* ======================
          TABLE (ALWAYS VISIBLE)
      ====================== */}
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
                "פעולה",
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
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-gray-400"
                >
                  עדיין לא נוספו ספקים לאירוע
                </td>
              </tr>
            )}

            {rows.map((row, i) => {
              const dbKey = `${row.categoryId}-${row.sub}`;
              const suppliers = suppliersDB[dbKey] || [];

              return (
                <>
                  <tr key={row.id} className="border-t">
                    <td className="px-6 py-4">{row.category}</td>
                    <td className="px-6 py-4">{row.sub}</td>
                    <td className="px-6 py-4 font-medium">
                      {row.supplier?.name || "לא נבחר"}
                    </td>
                    <td className="px-6 py-4">
                      <input
                        className="border rounded-lg px-3 py-2 w-28"
                        value={row.price}
                        onChange={(e) =>
                          updateRow(i, "price", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        className="border rounded-lg px-3 py-2 w-28"
                        value={row.advance}
                        onChange={(e) =>
                          updateRow(i, "advance", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        className="border rounded-lg px-3 py-2 w-28"
                        value={row.balance}
                        onChange={(e) =>
                          updateRow(i, "balance", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input type="file" multiple />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          setOpenSupplierRow(
                            openSupplierRow === i ? null : i
                          )
                        }
                        className="border px-4 py-2 rounded-lg"
                      >
                        {row.supplier ? "החלף ספק" : "בחר ספק"}
                      </button>
                    </td>
                  </tr>

                  {/* SUPPLIER PICKER */}
                  {openSupplierRow === i && (
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="px-8 py-6">
                        <SupplierPicker
                          suppliers={suppliers}
                          onSelect={(s) => selectSupplier(i, s)}
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

      {/* ======================
          ADD MODAL
      ====================== */}
      {openAddModal && (
        <AddRowModal
          categories={categories}
          onClose={() => setOpenAddModal(false)}
          onAdd={(data) => {
            addRow(data);
            setOpenAddModal(false);
          }}
          onAddCategory={(cat) =>
            setCategories((prev) => [...prev, cat])
          }
          onAddSub={(catId, sub) =>
            setCategories((prev) =>
              prev.map((c) =>
                c.id === catId ? { ...c, subs: [...c.subs, sub] } : c
              )
            )
          }
        />
      )}
    </div>
  );
}

/* ======================
   ADD ROW MODAL
====================== */

function AddRowModal({ categories, onClose, onAdd, onAddCategory, onAddSub }) {
  const [categoryId, setCategoryId] = useState("");
  const [sub, setSub] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSub, setNewSub] = useState("");

  const category = categories.find((c) => c.id === categoryId);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-8 space-y-6">
        <h3 className="text-lg font-semibold">הוספת ספק / תחום לאירוע</h3>

        <div className="space-y-4">
          <select
            className="border rounded-xl px-4 py-3 w-full"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSub("");
            }}
          >
            <option value="">בחר תחום</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {category && (
            <select
              className="border rounded-xl px-4 py-3 w-full"
              value={sub}
              onChange={(e) => setSub(e.target.value)}
            >
              <option value="">בחר תת־תחום</option>
              {category.subs.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}

          <div className="border-t pt-4 space-y-3">
            <input
              placeholder="➕ תחום חדש"
              className="border rounded-xl px-4 py-2 w-full"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <button
              onClick={() => {
                if (!newCategory) return;
                onAddCategory({
                  id: Date.now().toString(),
                  name: newCategory,
                  subs: [],
                });
                setNewCategory("");
              }}
              className="text-sm underline"
            >
              הוסף תחום
            </button>

            {categoryId && (
              <>
                <input
                  placeholder="➕ תת־תחום חדש"
                  className="border rounded-xl px-4 py-2 w-full"
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (!newSub) return;
                    onAddSub(categoryId, newSub);
                    setNewSub("");
                  }}
                  className="text-sm underline"
                >
                  הוסף תת־תחום
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2">
            ביטול
          </button>
          <button
            onClick={() =>
              category && sub &&
              onAdd({
                categoryId: category.id,
                categoryName: category.name,
                sub,
              })
            }
            className="bg-black text-white px-5 py-2 rounded-xl"
          >
            הוסף לטבלה
          </button>
        </div>
      </div>
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
        <h4 className="font-medium">➕ הוסף ספק חדש</h4>
        <div className="flex flex-wrap gap-3">
          {["name", "price", "phone", "link"].map((f) => (
            <input
              key={f}
              placeholder={f}
              className="border rounded-lg px-3 py-2"
              value={form[f]}
              onChange={(e) =>
                setForm({ ...form, [f]: e.target.value })
              }
            />
          ))}
          <button
            onClick={() => {
              if (!form.name) return;
              onAdd(form);
              setForm({ name: "", price: "", phone: "", link: "" });
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
