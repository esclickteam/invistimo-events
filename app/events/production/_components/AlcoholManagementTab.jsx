"use client";

import { useState } from "react";

/* ======================================================
   INITIAL DATA
====================================================== */

const INITIAL_ALCOHOL_TYPES = [
  { id: "vodka", label: "וודקה" },
  { id: "whiskey", label: "וויסקי" },
  { id: "wine", label: "יין" },
];

const INITIAL_TABLES = [
  {
    tableNumber: 10,
    guests: 10,
    requests: "חברים של החתן",
    alcoholPlan: [
      { type: "vodka", qty: 2 },
      { type: "whiskey", qty: 1 },
    ],
    alcoholLive: [],
  },
];

const INITIAL_WAREHOUSE = {
  vodka: 12,
  whiskey: 6,
  wine: 30,
};

/* ======================================================
   MAIN COMPONENT
====================================================== */

export default function AlcoholManagementTab() {
  const [mode, setMode] = useState("planning"); // planning | live
  const [tables, setTables] = useState(INITIAL_TABLES);
  const [warehouse, setWarehouse] = useState(INITIAL_WAREHOUSE);
  const [log, setLog] = useState([]);

  /* ======================================================
     HELPERS
  ====================================================== */

  function addLog(entry) {
    setLog((prev) => [
      { time: new Date().toLocaleTimeString(), entry },
      ...prev,
    ]);
  }

  function updateTable(tableIndex, field, value) {
    setTables((prev) =>
      prev.map((t, i) => (i === tableIndex ? { ...t, [field]: value } : t))
    );
  }

  function updateAlcoholPlan(tableIndex, alcoholIndex, field, value) {
    setTables((prev) =>
      prev.map((t, i) =>
        i === tableIndex
          ? {
              ...t,
              alcoholPlan: t.alcoholPlan.map((a, ai) =>
                ai === alcoholIndex ? { ...a, [field]: value } : a
              ),
            }
          : t
      )
    );
  }

  function addAlcoholToTable(tableIndex) {
    setTables((prev) =>
      prev.map((t, i) =>
        i === tableIndex
          ? {
              ...t,
              alcoholPlan: [...t.alcoholPlan, { type: "vodka", qty: 1 }],
            }
          : t
      )
    );
  }

  /* ======================================================
     LIVE ACTIONS
  ====================================================== */

  function openBottle(type, tableIndex) {
    if (warehouse[type] <= 0) return;

    setWarehouse((prev) => ({
      ...prev,
      [type]: prev[type] - 1,
    }));

    setTables((prev) =>
      prev.map((t, i) =>
        i === tableIndex
          ? {
              ...t,
              alcoholLive: [...t.alcoholLive, type],
            }
          : t
      )
    );

    addLog(`נפתח בקבוק ${type} לשולחן ${tables[tableIndex].tableNumber}`);
  }

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">🍾 ניהול אלכוהול</h2>

        <div className="flex gap-2">
          <ModeButton
            active={mode === "planning"}
            label="תכנון"
            onClick={() => setMode("planning")}
          />
          <ModeButton
            active={mode === "live"}
            label="לייב"
            onClick={() => setMode("live")}
          />
        </div>
      </div>

      {/* =========================
          PLANNING MODE
      ========================= */}
      {mode === "planning" && (
        <div className="space-y-6">
          {tables.map((table, tableIndex) => (
            <Card key={tableIndex}>
              <div className="flex justify-between items-center">
                <div className="font-bold">
                  שולחן {table.tableNumber} · {table.guests} אורחים
                </div>
              </div>

              {/* Requests */}
              <div className="mt-4">
                <Label>בקשות הזוג</Label>
                <textarea
                  value={table.requests}
                  onChange={(e) =>
                    updateTable(tableIndex, "requests", e.target.value)
                  }
                  className="w-full border rounded-lg p-2 text-sm"
                  placeholder="לדוגמה: לשים הרבה אלכוהול"
                />
              </div>

              {/* Alcohol Plan */}
              <div className="mt-4 space-y-2">
                <Label>אלכוהול מתוכנן לשולחן</Label>

                {table.alcoholPlan.map((a, alcoholIndex) => (
                  <div key={alcoholIndex} className="flex gap-2">
                    <select
                      value={a.type}
                      onChange={(e) =>
                        updateAlcoholPlan(
                          tableIndex,
                          alcoholIndex,
                          "type",
                          e.target.value
                        )
                      }
                      className="border rounded px-2 py-1"
                    >
                      {INITIAL_ALCOHOL_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      value={a.qty}
                      onChange={(e) =>
                        updateAlcoholPlan(
                          tableIndex,
                          alcoholIndex,
                          "qty",
                          Number(e.target.value)
                        )
                      }
                      className="border rounded px-2 py-1 w-20"
                    />
                  </div>
                ))}

                <button
                  onClick={() => addAlcoholToTable(tableIndex)}
                  className="text-sm text-blue-600"
                >
                  + הוסף אלכוהול לשולחן
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* =========================
          LIVE MODE
      ========================= */}
      {mode === "live" && (
        <div className="grid grid-cols-3 gap-6">
          {/* Warehouse */}
          <Card>
            <h3 className="font-semibold mb-2">📦 מחסן</h3>
            {Object.entries(warehouse).map(([type, qty]) => (
              <div key={type} className="flex justify-between">
                <span>{type}</span>
                <b>{qty}</b>
              </div>
            ))}
          </Card>

          {/* Tables */}
          <div className="col-span-2 space-y-4">
            {tables.map((table, tableIndex) => (
              <Card key={tableIndex}>
                <div className="font-bold mb-2">
                  שולחן {table.tableNumber}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {INITIAL_ALCOHOL_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openBottle(t.id, tableIndex)}
                      className="px-3 py-1 rounded bg-black text-white text-sm"
                    >
                      נפתח {t.label}
                    </button>
                  ))}
                </div>

                <div className="text-sm text-gray-600 mt-2">
                  נפתחו בפועל: {table.alcoholLive.join(", ") || "—"}
                </div>
              </Card>
            ))}
          </div>

          {/* Log */}
          <Card className="col-span-3">
            <h3 className="font-semibold mb-2">📜 לוג פעולות</h3>
            {log.length === 0 && (
              <div className="text-sm text-gray-400">אין פעולות עדיין</div>
            )}
            {log.map((l, i) => (
              <div key={i} className="text-sm">
                <b>{l.time}</b> – {l.entry}
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

/* ======================================================
   UI HELPERS
====================================================== */

function ModeButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-semibold ${
        active ? "bg-black text-white" : "bg-gray-100 text-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

function Card({ children }) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      {children}
    </div>
  );
}

function Label({ children }) {
  return <div className="text-xs text-gray-500 mb-1">{children}</div>;
}
