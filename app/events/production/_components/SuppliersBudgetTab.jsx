"use client";

import { useEffect, useState } from "react";

/* ======================================================
   SuppliersBudgetTab – DEBUG VERSION
====================================================== */

export default function SuppliersBudgetTab({ eventId }) {
  console.log("🟢 SuppliersBudgetTab render", { eventId });

  const [rows, setRows] = useState([]);
  const [openSupplierRow, setOpenSupplierRow] = useState(null);
  const [suppliersCache, setSuppliersCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ======================================================
     LOAD EVENT SUPPLIERS
  ====================================================== */
  useEffect(() => {
    console.log("🟡 useEffect triggered", { eventId });

    if (!eventId) {
      console.warn("⚠️ No eventId – skipping suppliers load");
      return;
    }

    let cancelled = false;

    async function loadEventSuppliers() {
      console.log("🚀 loadEventSuppliers start");

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/events/${eventId}/suppliers`);
        console.log("📡 suppliers response", res.status);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("📦 suppliers data", data);

        if (!cancelled) {
          setRows(Array.isArray(data.suppliers) ? data.suppliers : []);
        }
      } catch (err) {
        console.error("❌ loadEventSuppliers error", err);
        if (!cancelled) {
          setError("שגיאה בטעינת ספקים");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEventSuppliers();

    return () => {
      cancelled = true;
      console.log("🧹 cleanup loadEventSuppliers");
    };
  }, [eventId]);

  /* ======================================================
     UPDATE EVENT SUPPLIER ROW
  ====================================================== */
  async function updateRow(rowId, patch) {
    console.log("✏️ updateRow", { rowId, patch });

    try {
      const res = await fetch(`/api/event-suppliers/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      console.log("📡 PATCH response", res.status);

      if (!res.ok) {
        throw new Error(`PATCH failed ${res.status}`);
      }

      const data = await res.json();
      console.log("📦 PATCH data", data);

      if (data?.success) {
        setRows((prev) =>
          prev.map((r) => (r._id === rowId ? data.row : r))
        );
      }
    } catch (err) {
      console.error("❌ updateRow error", err);
    }
  }

  /* ======================================================
     LOAD SUPPLIERS FOR PICKER
  ====================================================== */
  async function loadPickerSuppliers(categoryId, sub) {
    const key = `${categoryId}-${sub}`;

    console.log("🔍 loadPickerSuppliers", { categoryId, sub });

    if (suppliersCache[key]) {
      console.log("🧠 suppliers from cache", key);
      return;
    }

    try {
      const res = await fetch(
        `/api/suppliers?categoryId=${categoryId}&sub=${encodeURIComponent(sub)}`
      );

      console.log("📡 picker suppliers response", res.status);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("📦 picker suppliers data", data);

      setSuppliersCache((prev) => ({
        ...prev,
        [key]: Array.isArray(data.suppliers) ? data.suppliers : [],
      }));
    } catch (err) {
      console.error("❌ loadPickerSuppliers error", err);
    }
  }

  /* ======================================================
     ADD EVENT SUPPLIER ROW
  ====================================================== */
  async function addRow({ categoryId, sub }) {
    console.log("➕ addRow", { categoryId, sub });

    try {
      const res = await fetch(`/api/events/${eventId}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, sub }),
      });

      console.log("📡 addRow response", res.status);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("📦 addRow data", data);

      if (data?.success) {
        setRows((prev) => [...prev, data.row]);
      }
    } catch (err) {
      console.error("❌ addRow error", err);
    }
  }

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <div className="space-y-4" dir="rtl">
      <h2 className="text-lg font-semibold">ספקים ותקציב (DEBUG)</h2>

      <pre className="bg-gray-100 p-2 text-xs rounded">
        {JSON.stringify(
          {
            eventId,
            rowsCount: rows.length,
            loading,
            error,
          },
          null,
          2
        )}
      </pre>

      {loading && <div>טוען ספקים…</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["תחום", "תת־תחום", "ספק", "מחיר", "מקדמה", "יתרה", ""].map(
                (h) => (
                  <th key={h} className="px-3 py-2 text-right">
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
                    <td className="px-3 py-2">{row.categoryName}</td>
                    <td className="px-3 py-2">{row.sub}</td>
                    <td className="px-3 py-2">
                      {row.supplierName || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border px-2 py-1 w-24"
                        value={row.price ?? ""}
                        onChange={(e) =>
                          updateRow(row._id, {
                            price: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border px-2 py-1 w-24"
                        value={row.advance ?? ""}
                        onChange={(e) =>
                          updateRow(row._id, {
                            advance: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">₪{row.balance ?? 0}</td>
                    <td className="px-3 py-2">
                      <button
                        className="underline text-sm"
                        onClick={() => {
                          loadPickerSuppliers(row.categoryId, row.sub);
                          setOpenSupplierRow(
                            openSupplierRow === i ? null : i
                          );
                        }}
                      >
                        בחר ספק
                      </button>
                    </td>
                  </tr>

                  {openSupplierRow === i && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="p-3">
                        <SupplierPicker
                          suppliers={suppliers}
                          onSelect={(s) =>
                            updateRow(row._id, { supplierId: s._id })
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
    </div>
  );
}

/* ======================================================
   SupplierPicker – DEBUG
====================================================== */

function SupplierPicker({ suppliers, onSelect }) {
  console.log("🟣 SupplierPicker render", suppliers.length);

  return (
    <div className="space-y-2">
      {suppliers.map((s) => (
        <div
          key={s._id}
          className="flex justify-between items-center border p-2 rounded"
        >
          <div>
            <div className="font-medium">{s.name}</div>
            <div className="text-xs text-gray-500">
              ₪{s.basePrice ?? "—"} · {s.phone}
            </div>
          </div>
          <button
            className="bg-black text-white px-3 py-1 rounded"
            onClick={() => {
              console.log("✅ supplier selected", s._id);
              onSelect(s);
            }}
          >
            בחר
          </button>
        </div>
      ))}
    </div>
  );
}
