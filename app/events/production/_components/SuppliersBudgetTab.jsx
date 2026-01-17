"use client";

import { useState } from "react";

/* ======================
   DATA
====================== */

const INITIAL_CATEGORIES = [
  { id: "photo", name: "צילום", subs: ["סטילס", "וידאו", "מגנטים", "רחפן", "סושיאל"] },
  { id: "music", name: "מוזיקה", subs: ["DJ", "להקה", "נגן", "זמר חופה"] },
  { id: "food", name: "אוכל ושתייה", subs: ["אולם", "קייטרינג", "בר אלכוהול", "קינוחים"] },
  { id: "design", name: "עיצוב והפקה", subs: ["חופה", "שולחנות", "פרחים", "תאורה", "הגברה"] },
  { id: "extras", name: "אטרקציות", subs: ["מגנטים מיוחדים", "360", "עשן כבד", "זיקוקים"] },
  { id: "content", name: "תוכן וניהול", subs: ["רב / מנחה", "מפיק יום", "סידורי הושבה"] },
];

/* ======================
   MAIN
====================== */

export default function SuppliersTab() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [rows, setRows] = useState([]);
  const [openRow, setOpenRow] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSub, setSelectedSub] = useState("");

  const [newCategory, setNewCategory] = useState("");
  const [newSub, setNewSub] = useState("");

  const [suppliersDB, setSuppliersDB] = useState({});

  /* ======================
     ACTIONS
  ====================== */

  function addRow() {
    if (!selectedCategory || !selectedSub) return;

    const cat = categories.find((c) => c.id === selectedCategory);

    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        categoryId: cat.id,
        category: cat.name,
        sub: selectedSub,
        supplier: null,
        price: "",
        advance: "",
        balance: "",
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
    setOpenRow(null);
  }

  function addSupplier(dbKey, supplier) {
    setSuppliersDB((prev) => ({
      ...prev,
      [dbKey]: [...(prev[dbKey] || []), { ...supplier, id: Date.now() }],
    }));
  }

  function addCategory() {
    if (!newCategory) return;
    setCategories((prev) => [...prev, { id: Date.now().toString(), name: newCategory, subs: [] }]);
    setNewCategory("");
  }

  function addSubCategory() {
    if (!selectedCategory || !newSub) return;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === selectedCategory ? { ...c, subs: [...c.subs, newSub] } : c
      )
    );
    setNewSub("");
  }

  /* ======================
     RENDER
  ====================== */

  return (
    <div className="space-y-12 max-w-7xl" dir="rtl">

      {/* ======================
          ADD BAR
      ====================== */}
      <section className="bg-white rounded-2xl border p-8 space-y-6">
        <h2 className="text-xl font-semibold">➕ הוספת ספק / תחום לאירוע</h2>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm mb-1 block">תחום</label>
            <select
              className="border rounded-xl px-4 py-2 min-w-[180px]"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSub("");
              }}
            >
              <option value="">בחר תחום</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm mb-1 block">תת־תחום</label>
            <select
              className="border rounded-xl px-4 py-2 min-w-[180px]"
              value={selectedSub}
              onChange={(e) => setSelectedSub(e.target.value)}
            >
              <option value="">בחר תת־תחום</option>
              {categories.find((c) => c.id === selectedCategory)?.subs.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <button
            onClick={addRow}
            className="bg-black text-white px-6 py-2 rounded-xl"
          >
            הוסף לטבלה
          </button>
        </div>

        <div className="flex gap-6 text-sm text-gray-600">
          <button onClick={addCategory}>➕ הוסף תחום חדש</button>
          <button onClick={addSubCategory}>➕ הוסף תת־תחום</button>
        </div>
      </section>

      {/* ======================
          TABLE
      ====================== */}
      <section className="bg-white rounded-2xl border p-8">
        <h2 className="text-xl font-semibold mb-6">📋 ספקים סגורים לאירוע</h2>

        <table className="w-full border-separate border-spacing-y-3 text-sm">
          <thead>
            <tr className="text-gray-500">
              {["תחום", "תת־תחום", "ספק", "מחיר", "מקדמה", "יתרה", "קבצים", ""].map((h) => (
                <th key={h} className="px-4 text-right font-medium">{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">
                  עדיין לא נוספו ספקים
                </td>
              </tr>
            )}

            {rows.map((r, i) => {
              const dbKey = `${r.categoryId}-${r.sub}`;
              const suppliers = suppliersDB[dbKey] || [];

              return (
                <>
                  <tr key={r.id} className="bg-gray-50 rounded-xl">
                    <td className="px-4 py-4">{r.category}</td>
                    <td className="px-4 py-4">{r.sub}</td>
                    <td className="px-4 py-4 font-medium">
                      {r.supplier?.name || "לא נבחר"}
                    </td>
                    <td className="px-4 py-4">
                      <input className="border rounded-lg px-3 py-2 w-28" value={r.price}
                        onChange={(e) => updateRow(i, "price", e.target.value)} />
                    </td>
                    <td className="px-4 py-4">
                      <input className="border rounded-lg px-3 py-2 w-28" value={r.advance}
                        onChange={(e) => updateRow(i, "advance", e.target.value)} />
                    </td>
                    <td className="px-4 py-4">
                      <input className="border rounded-lg px-3 py-2 w-28" value={r.balance}
                        onChange={(e) => updateRow(i, "balance", e.target.value)} />
                    </td>
                    <td className="px-4 py-4"><input type="file" multiple /></td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setOpenRow(openRow === i ? null : i)}
                        className="border px-4 py-2 rounded-lg"
                      >
                        {r.supplier ? "החלף ספק" : "בחר ספק"}
                      </button>
                    </td>
                  </tr>

                  {openRow === i && (
                    <tr>
                      <td colSpan={8} className="px-6 py-6">
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
      </section>
    </div>
  );
}

/* ======================
   PICKER
====================== */

function SupplierPicker({ suppliers, onSelect, onAdd }) {
  const [form, setForm] = useState({ name: "", price: "", phone: "", link: "" });

  return (
    <div className="space-y-6 border rounded-xl p-6 bg-white">
      <h4 className="font-semibold">בחירת ספק</h4>

      <div className="grid gap-3">
        {suppliers.map((s) => (
          <div key={s.id} className="flex justify-between items-center border rounded-lg px-4 py-3">
            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-gray-500">₪{s.price} · {s.phone}</div>
            </div>
            <button onClick={() => onSelect(s)} className="bg-black text-white px-4 py-2 rounded-lg">
              בחר
            </button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t">
        <h5 className="font-medium mb-2">➕ הוספת ספק חדש</h5>
        <div className="flex flex-wrap gap-3">
          {["name", "price", "phone", "link"].map((f) => (
            <input
              key={f}
              placeholder={f}
              className="border rounded-lg px-3 py-2"
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
            className="bg-black text-white px-5 py-2 rounded-lg"
          >
            הוסף
          </button>
        </div>
      </div>
    </div>
  );
}
