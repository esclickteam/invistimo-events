"use client";

import { useState } from "react";

/* ======================================================
   INITIAL DATA
====================================================== */

const INITIAL_ALCOHOL_TYPES = [
  {
    id: "vodka",
    type: "וודקה",
    brand: "Absolut / Finlandia",
    total: 12,
    start: 6,
  },
  {
    id: "whiskey",
    type: "וויסקי",
    brand: "Jameson",
    total: 6,
    start: 3,
  },
  {
    id: "wine",
    type: "יין",
    brand: "אדום / לבן",
    total: 30,
    start: 20,
  },
];

const INITIAL_TABLE_REQUESTS = [
  {
    tableNumber: 10,
    guests: 10,
    bottles: [
      { type: "vodka", qty: 2 },
      { type: "whiskey", qty: 1 },
    ],
    notes: "חברים של החתן – הרבה אלכוהול",
  },
];

/* ======================================================
   MAIN MODULE
====================================================== */

export default function AlcoholManagementModule() {
  const [mode, setMode] = useState("planning"); // planning | live
  const [alcohol, setAlcohol] = useState(INITIAL_ALCOHOL_TYPES);
  const [tables, setTables] = useState(INITIAL_TABLE_REQUESTS);
  const [liveOpened, setLiveOpened] = useState([]);

  /* ======================================================
     HELPERS
  ====================================================== */

  function updateAlcohol(index, field, value) {
    setAlcohol((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  }

  function updateTable(index, field, value) {
    setTables((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  }

  function updateTableBottle(tableIndex, bottleIndex, field, value) {
    setTables((prev) =>
      prev.map((t, i) =>
        i === tableIndex
          ? {
              ...t,
              bottles: t.bottles.map((b, bi) =>
                bi === bottleIndex ? { ...b, [field]: value } : b
              ),
            }
          : t
      )
    );
  }

  function addBottleToTable(tableIndex) {
    setTables((prev) =>
      prev.map((t, i) =>
        i === tableIndex
          ? {
              ...t,
              bottles: [...t.bottles, { type: "vodka", qty: 1 }],
            }
          : t
      )
    );
  }

  function openBottleLive(type, tableNumber) {
    setLiveOpened((prev) => [
      ...prev,
      {
        time: new Date().toLocaleTimeString(),
        type,
        tableNumber,
      },
    ]);
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
            label="תכנון"
            active={mode === "planning"}
            onClick={() => setMode("planning")}
          />
          <ModeButton
            label="לייב"
            active={mode === "live"}
            onClick={() => setMode("live")}
          />
        </div>
      </div>

      {/* ======================================================
          PLANNING MODE
      ====================================================== */}
      {mode === "planning" && (
        <div className="space-y-8">
          {/* ALCOHOL TYPES */}
          <Section title="כמויות כלליות">
            {alcohol.map((a, i) => (
              <Card key={a.id}>
                <div className="grid grid-cols-5 gap-4 items-center">
                  <div>
                    <b>{a.type}</b>
                    <div className="text-xs text-gray-500">{a.brand}</div>
                  </div>

                  <Field
                    label="סה״כ"
                    value={a.total}
                    onChange={(v) => updateAlcohol(i, "total", v)}
                  />

                  <Field
                    label="להתחלה"
                    value={a.start}
                    onChange={(v) => updateAlcohol(i, "start", v)}
                  />

                  <div className="text-sm">
                    רזרבה:
                    <b className="mr-1">{a.total - a.start}</b>
                  </div>
                </div>
              </Card>
            ))}
          </Section>

          {/* TABLE REQUESTS */}
          <Section title="בקשות זוג / חריגות לפי שולחן">
            {tables.map((t, ti) => (
              <Card key={ti}>
                <div className="flex justify-between mb-3">
                  <b>שולחן {t.tableNumber}</b>
                  <span className="text-sm text-gray-500">
                    {t.guests} אורחים
                  </span>
                </div>

                <textarea
                  value={t.notes}
                  onChange={(e) =>
                    updateTable(ti, "notes", e.target.value)
                  }
                  placeholder="הערות / בקשות מיוחדות"
                  className="w-full border rounded-lg p-2 text-sm mb-3"
                />

                {t.bottles.map((b, bi) => (
                  <div key={bi} className="flex gap-2 mb-2">
                    <select
                      value={b.type}
                      onChange={(e) =>
                        updateTableBottle(
                          ti,
                          bi,
                          "type",
                          e.target.value
                        )
                      }
                      className="border rounded px-2 py-1"
                    >
                      {alcohol.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.type}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      value={b.qty}
                      onChange={(e) =>
                        updateTableBottle(
                          ti,
                          bi,
                          "qty",
                          Number(e.target.value)
                        )
                      }
                      className="border rounded px-2 py-1 w-20"
                    />
                  </div>
                ))}

                <button
                  onClick={() => addBottleToTable(ti)}
                  className="text-sm text-blue-600"
                >
                  + הוסף בקבוק לשולחן
                </button>
              </Card>
            ))}
          </Section>
        </div>
      )}

      {/* ======================================================
          LIVE MODE
      ====================================================== */}
      {mode === "live" && (
        <div className="space-y-6">
          <Section title="פתיחת בקבוקים בזמן אמת">
            {tables.map((t, ti) => (
              <Card key={ti}>
                <b>שולחן {t.tableNumber}</b>

                <div className="flex gap-2 mt-2 flex-wrap">
                  {alcohol.map((a) => (
                    <button
                      key={a.id}
                      onClick={() =>
                        openBottleLive(a.type, t.tableNumber)
                      }
                      className="px-3 py-1 bg-black text-white rounded text-sm"
                    >
                      נפתח {a.type}
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </Section>

          <Section title="מעקב לייב">
            {liveOpened.length === 0 && (
              <div className="text-sm text-gray-400">
                אין פתיחות עדיין
              </div>
            )}

            {liveOpened.map((l, i) => (
              <div key={i} className="text-sm">
                {l.time} – נפתח {l.type} לשולחן {l.tableNumber}
              </div>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

/* ======================================================
   UI COMPONENTS
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

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Card({ children }) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      {children}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border rounded-lg px-3 py-2 w-full"
      />
    </div>
  );
}
