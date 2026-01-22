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

  /* ======================
     LOAD INITIAL DATA
  ====================== */

  useEffect(() => {
    fetch("/api/supplier-categories")
      .then(r => r.json())
      .then(d => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    if (!eventId) return;

    fetch(`/api/events/${eventId}/suppliers`)
      .then(r => r.json())
      .then(d => setRows(d.suppliers || []));
  }, [eventId]);

  /* ======================
     ADD ROW (EVENT)
  ====================== */

  async function addRow({ categoryId, categoryName, sub }) {
    const res = await fetch(`/api/events/${eventId}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, sub }),
    });

    const data = await res.json();
    if (data.success) {
      setRows(prev => [...prev, data.row]);
    }
  }

  /* ======================
     UPDATE ROW
  ====================== */

  async function updateRow(rowId, patch) {
    await fetch(`/api/event-suppliers/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    setRows(prev =>
      prev.map(r => (r._id === rowId ? { ...r, ...patch } : r))
    );
  }

  /* ======================
     SELECT SUPPLIER
  ====================== */

  async function selectSupplier(row, supplier) {
    await updateRow(row._id, {
      supplierId: supplier._id,
      price: supplier.basePrice ?? row.price,
    });

    setOpenSupplierRow(null);
  }

  /* ======================
     RENDER
  ====================== */

  return (
    <div className="max-w-7xl mx-auto space-y-10" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">ספקים סגורים לאירוע</h1>
        <button
          onClick={() => setOpenAddModal(true)}
          className="bg-black text-white px-5 py-2 rounded-xl"
        >
          ➕ הוסף ספק / תחום
        </button>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["תחום", "תת־תחום", "ספק", "מחיר", "מקדמה", "יתרה", "פעולה"].map(h => (
                <th key={h} className="px-6 py-4 text-right">{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-400">
                  עדיין לא נוספו ספקים
                </td>
              </tr>
            )}

            {rows.map((row, i) => (
              <>
                <tr key={row._id} className="border-t">
                  <td className="px-6 py-3">{row.categoryName}</td>
                  <td className="px-6 py-3">{row.sub}</td>
                  <td className="px-6 py-3">
                    {row.supplierName || "לא נבחר"}
                  </td>

                  <td className="px-6 py-3">
                    <input
                      className="border rounded px-2 py-1 w-24"
                      value={row.price ?? ""}
                      onChange={e =>
                        updateRow(row._id, { price: Number(e.target.value) })
                      }
                    />
                  </td>

                  <td className="px-6 py-3">
                    <input
                      className="border rounded px-2 py-1 w-24"
                      value={row.advance ?? ""}
                      onChange={e =>
                        updateRow(row._id, { advance: Number(e.target.value) })
                      }
                    />
                  </td>

                  <td className="px-6 py-3 font-medium">
                    ₪{row.balance ?? 0}
                  </td>

                  <td className="px-6 py-3">
                    <button
                      className="border px-3 py-1 rounded"
                      onClick={() =>
                        setOpenSupplierRow(openSupplierRow === i ? null : i)
                      }
                    >
                      {row.supplierId ? "החלף ספק" : "בחר ספק"}
                    </button>
                  </td>
                </tr>

                {openSupplierRow === i && (
                  <tr className="bg-gray-50">
                    <td colSpan={7} className="px-6 py-4">
                      <SupplierPicker
                        categoryId={row.categoryId}
                        sub={row.sub}
                        onSelect={s => selectSupplier(row, s)}
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
          onClose={() => setOpenAddModal(false)}
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

  const category = categories.find(c => c._id === categoryId);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
        <select
          className="border w-full p-2 rounded"
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
        >
          <option value="">בחר תחום</option>
          {categories.map(c => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        {category && (
          <select
            className="border w-full p-2 rounded"
            value={sub}
            onChange={e => setSub(e.target.value)}
          >
            <option value="">בחר תת־תחום</option>
            {category.subs.map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose}>ביטול</button>
          <button
            className="bg-black text-white px-4 py-2 rounded"
            onClick={() =>
              category && sub && onAdd({
                categoryId: category._id,
                categoryName: category.name,
                sub,
              })
            }
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
    fetch(`/api/suppliers?categoryId=${categoryId}&sub=${encodeURIComponent(sub)}`)
      .then(r => r.json())
      .then(d => setSuppliers(d.suppliers || []));
  }, [categoryId, sub]);

  return (
    <div className="grid gap-3">
      {suppliers.map(s => (
        <div
          key={s._id}
          className="flex justify-between items-center border p-3 rounded"
        >
          <div>
            <div className="font-medium">{s.name}</div>
            <div className="text-xs text-gray-500">
              ₪{s.basePrice} · {s.phone}
            </div>
          </div>
          <button
            className="bg-black text-white px-3 py-1 rounded"
            onClick={() => onSelect(s)}
          >
            בחר
          </button>
        </div>
      ))}
    </div>
  );
}
