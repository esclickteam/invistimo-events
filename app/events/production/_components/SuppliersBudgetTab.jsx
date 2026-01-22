"use client";

import { useEffect, useState } from "react";

/* ======================
   MAIN
====================== */

export default function SuppliersBudgetTab({ eventId }) {
  const [rows, setRows] = useState([]);
  const [openSupplierRow, setOpenSupplierRow] = useState(null);
  const [suppliersCache, setSuppliersCache] = useState({});

  /* ======================
     LOAD EVENT SUPPLIERS
  ====================== */
  useEffect(() => {
    if (!eventId) return;

    fetch(`/api/events/${eventId}/suppliers`)
      .then((r) => r.json())
      .then((data) => setRows(data.suppliers || []))
      .catch(() => setRows([]));
  }, [eventId]);

  /* ======================
     UPDATE ROW (PATCH)
  ====================== */
  async function updateRow(rowId, patch) {
    const res = await fetch(`/api/event-suppliers/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    const data = await res.json();
    if (data.success) {
      setRows((prev) =>
        prev.map((r) => (r._id === rowId ? data.row : r))
      );
    }
  }

  /* ======================
     LOAD SUPPLIERS (Picker)
  ====================== */
  async function loadSuppliers(categoryId, sub) {
    const key = `${categoryId}-${sub}`;
    if (suppliersCache[key]) return;

    const res = await fetch(
      `/api/suppliers?categoryId=${categoryId}&sub=${encodeURIComponent(sub)}`
    );
    const data = await res.json();

    setSuppliersCache((prev) => ({
      ...prev,
      [key]: data.suppliers || [],
    }));
  }

  /* ======================
     ADD EVENT SUPPLIER
  ====================== */
  async function addRow({ categoryId, sub }) {
    const res = await fetch(`/api/events/${eventId}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, sub }),
    });

    const data = await res.json();
    if (data.success) {
      setRows((prev) => [...prev, data.row]);
    }
  }

  /* ======================
     RENDER
  ====================== */

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-lg font-semibold">ספקים ותקציב</h2>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["תחום", "תת־תחום", "ספק", "מחיר", "מקדמה", "יתרה", ""].map(
                (h) => (
                  <th key={h} className="px-4 py-3 text-right">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => {
              const key = `${row.categoryId}-${row.sub}`;
              const suppliers = suppliersCache[key] || [];

              return (
                <>
                  <tr key={row._id} className="border-t">
                    <td className="px-4 py-2">{row.categoryName}</td>
                    <td className="px-4 py-2">{row.sub}</td>
                    <td className="px-4 py-2">
                      {row.supplierName || "—"}
                    </td>

                    <td className="px-4 py-2">
                      <input
                        className="border px-2 py-1 w-24"
                        value={row.price || ""}
                        onChange={(e) =>
                          updateRow(row._id, {
                            price: Number(e.target.value),
                          })
                        }
                      />
                    </td>

                    <td className="px-4 py-2">
                      <input
                        className="border px-2 py-1 w-24"
                        value={row.advance || ""}
                        onChange={(e) =>
                          updateRow(row._id, {
                            advance: Number(e.target.value),
                          })
                        }
                      />
                    </td>

                    <td className="px-4 py-2">
                      ₪{row.balance || 0}
                    </td>

                    <td className="px-4 py-2">
                      <button
                        onClick={() => {
                          loadSuppliers(row.categoryId, row.sub);
                          setOpenSupplierRow(
                            openSupplierRow === i ? null : i
                          );
                        }}
                        className="text-sm underline"
                      >
                        בחר ספק
                      </button>
                    </td>
                  </tr>

                  {openSupplierRow === i && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="p-4">
                        <SupplierPicker
                          suppliers={suppliers}
                          onSelect={(s) =>
                            updateRow(row._id, { supplierId: s._id })
                          }
                          onAdd={async (form) => {
                            const res = await fetch("/api/suppliers", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                ...form,
                                categoryId: row.categoryId,
                                sub: row.sub,
                              }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              loadSuppliers(row.categoryId, row.sub);
                            }
                          }}
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

/* ======================
   SUPPLIER PICKER
====================== */

function SupplierPicker({ suppliers, onSelect, onAdd }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    basePrice: "",
  });

  return (
    <div className="space-y-4">
      {suppliers.map((s) => (
        <div
          key={s._id}
          className="flex justify-between items-center border p-3 rounded"
        >
          <div>
            <div className="font-medium">{s.name}</div>
            <div className="text-xs text-gray-500">
              ₪{s.basePrice || "—"} · {s.phone}
            </div>
          </div>
          <button
            onClick={() => onSelect(s)}
            className="bg-black text-white px-3 py-1 rounded"
          >
            בחר
          </button>
        </div>
      ))}

      <div className="border-t pt-3 space-y-2">
        <input
          placeholder="שם ספק"
          className="border px-2 py-1 w-full"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />
        <input
          placeholder="טלפון"
          className="border px-2 py-1 w-full"
          value={form.phone}
          onChange={(e) =>
            setForm({ ...form, phone: e.target.value })
          }
        />
        <input
          placeholder="מחיר בסיס"
          className="border px-2 py-1 w-full"
          value={form.basePrice}
          onChange={(e) =>
            setForm({ ...form, basePrice: e.target.value })
          }
        />
        <button
          onClick={() => onAdd(form)}
          className="bg-black text-white px-4 py-2 rounded"
        >
          הוסף ספק
        </button>
      </div>
    </div>
  );
}
