"use client";

import { useState } from "react";

/* ======================
   INITIAL DATA
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
  const [showModal, setShowModal] = useState(false);

  function handleAddFromModal({ categoryName, subName }) {
    let category = categories.find((c) => c.name === categoryName);

    // אם התחום לא קיים – צור אותו
    if (!category) {
      category = {
        id: Date.now().toString(),
        name: categoryName,
        subs: [],
      };
      setCategories((prev) => [...prev, category]);
    }

    // אם תת־תחום לא קיים – הוסף
    if (!category.subs.includes(subName)) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === category.id
            ? { ...c, subs: [...c.subs, subName] }
            : c
        )
      );
    }

    // הוספה לטבלה
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        category: categoryName,
        sub: subName,
        supplier: null,
        price: "",
        advance: "",
        balance: "",
      },
    ]);

    setShowModal(false);
  }

  return (
    <div className="space-y-10 max-w-7xl" dir="rtl">
      {/* ADD BUTTON */}
      <section className="bg-white border rounded-2xl p-6 flex justify-between items-center">
        <h2 className="text-lg font-semibold">📋 ספקים סגורים לאירוע</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-black text-white px-5 py-2 rounded-xl"
        >
          ➕ הוספת ספק / תחום
        </button>
      </section>

      {/* TABLE */}
      <section className="bg-white border rounded-2xl p-6">
        <table className="w-full border-separate border-spacing-y-3 text-sm">
          <thead>
            <tr className="text-gray-500">
              {["תחום", "תת־תחום", "ספק", "מחיר", "מקדמה", "יתרה"].map((h) => (
                <th key={h} className="px-4 text-right font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  עדיין לא נוספו ספקים
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="bg-gray-50 rounded-xl">
                <td className="px-4 py-4">{r.category}</td>
                <td className="px-4 py-4">{r.sub}</td>
                <td className="px-4 py-4">לא נבחר</td>
                <td className="px-4 py-4"><input className="input" /></td>
                <td className="px-4 py-4"><input className="input" /></td>
                <td className="px-4 py-4"><input className="input" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* MODAL */}
      {showModal && (
        <AddCategoryModal
          categories={categories}
          onClose={() => setShowModal(false)}
          onSubmit={handleAddFromModal}
        />
      )}
    </div>
  );
}

/* ======================
   MODAL
====================== */

function AddCategoryModal({ categories, onClose, onSubmit }) {
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [sub, setSub] = useState("");
  const [newSub, setNewSub] = useState("");

  const selectedCategory = categories.find((c) => c.name === category);

  function submit() {
    const finalCategory = newCategory || category;
    const finalSub = newSub || sub;

    if (!finalCategory || !finalSub) return;

    onSubmit({
      categoryName: finalCategory,
      subName: finalSub,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-6">
        <h3 className="text-lg font-semibold">➕ הוספת תחום / תת־תחום</h3>

        {/* CATEGORY */}
        <div>
          <label className="text-sm block mb-1">תחום קיים</label>
          <select
            className="border rounded-xl px-4 py-2 w-full"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSub("");
            }}
          >
            <option value="">בחר תחום</option>
            {categories.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            placeholder="או הוסף תחום חדש"
            className="border rounded-xl px-4 py-2 w-full mt-2"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
        </div>

        {/* SUB */}
        <div>
          <label className="text-sm block mb-1">תת־תחום</label>
          <select
            className="border rounded-xl px-4 py-2 w-full"
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            disabled={!selectedCategory}
          >
            <option value="">בחר תת־תחום</option>
            {selectedCategory?.subs.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <input
            placeholder="או הוסף תת־תחום חדש"
            className="border rounded-xl px-4 py-2 w-full mt-2"
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
          />
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-xl">
            ביטול
          </button>
          <button
            onClick={submit}
            className="bg-black text-white px-6 py-2 rounded-xl"
          >
            הוסף לטבלה
          </button>
        </div>
      </div>
    </div>
  );
}
