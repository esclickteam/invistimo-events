"use client";

import { useEffect, useState } from "react";

/* ======================
   MAIN
====================== */

export default function SuppliersTab({ eventId }) {
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openSupplierRow, setOpenSupplierRow] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ======================
     LOAD DATA
  ====================== */

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [cats, eventSuppliers] = await Promise.all([
        fetch("/api/suppliers/categories").then(r => r.json()),
        fetch(`/api/events/${eventId}/suppliers`).then(r => r.json()),
      ]);

      setCategories(cats);
      setRows(
        eventSuppliers.map(r => ({
          id: r._id,
          categoryId: r.categoryId,
          category: r.category,
          sub: r.sub,
          supplier: r.supplierId,
          price: r.price || "",
          advance: r.advance || "",
          balance: r.balance || "",
          files: r.files || [],
        }))
      );

      setLoading(false);
    }

    load();
  }, [eventId]);

  /* ======================
     ADD ROW
  ====================== */

  async function addRow({ categoryId, categoryName, sub }) {
    const res = await fetch(`/api/events/${eventId}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        category: categoryName,
        sub,
      }),
    });

    const created = await res.json();

    setRows(prev => [
      ...prev,
      {
        id: created._id,
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

  /* ======================
     UPDATE ROW (PATCH)
  ====================== */

  async function updateRow(i, field, value) {
    const row = rows[i];

    const updatedRow = {
      ...row,
      [field]: value,
    };

    if (field === "price" || field === "advance") {
      const price = Number(field === "price" ? value : row.price);
      const advance = Number(field === "advance" ? value : row.advance);
      updatedRow.balance = Math.max(price - advance, 0);
    }

    setRows(prev => {
      const copy = [...prev];
      copy[i] = updatedRow;
      return copy;
    });

    await fetch(`/api/events/${eventId}/suppliers/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [field]: value,
        ...(field === "price" || field === "advance"
          ? { balance: updatedRow.balance }
          : {}),
      }),
    });
  }

  /* ======================
     SELECT SUPPLIER
  ====================== */

  async function selectSupplier(i, supplier) {
    const row = rows[i];

    setRows(prev => {
      const copy = [...prev];
      copy[i] = {
        ...copy[i],
        supplier,
        price: supplier.basePrice || "",
        advance: "",
        balance: supplier.basePrice || "",
      };
      return copy;
    });

    await fetch(`/api/events/${eventId}/suppliers/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: supplier._id,
        price: supplier.basePrice || 0,
        advance: 0,
        balance: supplier.basePrice || 0,
      }),
    });

    setOpenSupplierRow(null);
  }

  /* ======================
     DELETE ROW
  ====================== */

  async function removeRow(i) {
    const row = rows[i];

    setRows(prev => prev.filter((_, index) => index !== i));

    await fetch(`/api/events/${eventId}/suppliers/${row.id}`, {
      method: "DELETE",
    });
  }

  if (loading) {
    return <div className="py-20 text-center text-gray-400">טוען ספקים…</div>;
  }

  /* ======================
     RENDER
  ====================== */

  return (
    <div className="max-w-7xl mx-auto space-y-10" dir="rtl">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">ספקים סגורים לאירוע</h1>
        <button
  onClick={() => setOpenAddModal(true)}
  disabled={categories.length === 0}
  className="bg-black text-white px-5 py-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
>

          ➕ הוסף ספק / תחום
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["תחום","תת־תחום","ספק","מחיר","מקדמה","יתרה","קבצים","פעולה"].map(h => (
                <th key={h} className="px-6 py-4 text-right font-medium text-gray-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                  עדיין לא נוספו ספקים לאירוע
                </td>
              </tr>
            )}

            {rows.map((row, i) => (
              <>
                <tr key={row.id} className="border-t">
                  <td className="px-6 py-4">{row.category}</td>
                  <td className="px-6 py-4">{row.sub}</td>
                  <td className="px-6 py-4 font-medium">
                    {row.supplier?.name || "לא נבחר"}
                  </td>

                  {["price","advance","balance"].map(f => (
                    <td key={f} className="px-6 py-4">
                      <input
                        disabled={f === "balance"}
                        className="border rounded-lg px-3 py-2 w-28 disabled:bg-gray-100"
                        value={row[f]}
                        onChange={e => updateRow(i, f, e.target.value)}
                      />
                    </td>
                  ))}

                  <td className="px-6 py-4">
                    <input type="file" multiple />
                  </td>

                  <td className="px-6 py-4 space-y-2">
                    <button
                      onClick={() =>
                        setOpenSupplierRow(openSupplierRow === i ? null : i)
                      }
                      className="border px-4 py-2 rounded-lg w-full"
                    >
                      {row.supplier ? "החלף ספק" : "בחר ספק"}
                    </button>

                    <button
                      onClick={() => removeRow(i)}
                      className="text-red-600 text-sm underline w-full"
                    >
                      הסר מהאירוע
                    </button>
                  </td>
                </tr>

                {openSupplierRow === i && (
                  <tr className="bg-gray-50">
                    <td colSpan={8} className="px-8 py-6">
                      <SupplierPicker
                        categoryId={row.categoryId}
                        sub={row.sub}
                        onSelect={s => selectSupplier(i, s)}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {openAddModal && (
  <AddRowModal
    categories={categories}
    onClose={() => {
      setOpenAddModal(false);
    }}
    onAdd={data => {
      addRow(data);
      setOpenAddModal(false);
    }}
  />
)}

    </div>
  );
}


/* ======================
   ADD ROW MODAL
====================== */

function AddRowModal({ categories, onClose, onAdd }) {
  const [categoryId, setCategoryId] = useState("");
  const [sub, setSub] = useState("");

  // ✅ GUARD – אם הקטגוריות עוד לא נטענו
  if (!categories || categories.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl w-full max-w-lg p-8 text-center">
          טוען תחומים…
        </div>
      </div>
    );
  }

  const category = categories.find(c => c._id === categoryId);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-8 space-y-6">

        <h3 className="text-lg font-semibold">הוספת תחום לאירוע</h3>

        <select
          className="border rounded-xl px-4 py-3 w-full"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setSub("");
          }}
        >
          <option value="" disabled>
            בחר תחום
          </option>

          {categories.map(c => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        {category && (
          <select
            className="border rounded-xl px-4 py-3 w-full"
            value={sub}
            onChange={(e) => setSub(e.target.value)}
          >
            <option value="" disabled>
              בחר תת־תחום
            </option>

            {category.subs.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose}>ביטול</button>
          <button
            onClick={() =>
              category && sub &&
              onAdd({
                categoryId: category._id,
                categoryName: category.name,
                sub,
              })
            }
            className="bg-black text-white px-5 py-2 rounded-xl"
          >
            הוסף
          </button>
        </div>
      </div>
    </div>
  );
}


/* ======================
   SUPPLIER PICKER
====================== */

function SupplierPicker({ categoryId, sub, onSelect }) {
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    fetch(`/api/suppliers?categoryId=${categoryId}&sub=${sub}`)
      .then(r => r.json())
      .then(setSuppliers);
  }, [categoryId, sub]);

  return (
    <div className="space-y-4">
      {suppliers.map(s => (
        <div key={s._id} className="flex justify-between border rounded-xl px-5 py-4">
          <div>
            <div className="font-medium">{s.name}</div>
            <div className="text-xs text-gray-500">
              ₪{s.basePrice} · {s.phone}
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
  );
}
