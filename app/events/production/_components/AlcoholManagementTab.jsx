"use client";

import { useState } from "react";

/* ======================================================
   INITIAL DATA
====================================================== */

const INITIAL_ALCOHOL_TYPES = [
  {
    id: "vodka",
    type: "וודקה",
    bottles: [
      { id: "v1", brand: "Absolut", flavor: "טבעי", total: 6 },
      { id: "v2", brand: "Van Gogh", flavor: "וניל", total: 6 },
    ],
    start: 6,
  },
  {
    id: "whiskey",
    type: "וויסקי",
    bottles: [{ id: "w1", brand: "Jameson", flavor: "", total: 6 }],
    start: 3,
  },
];

const INITIAL_TABLE_REQUESTS = [
  {
    tableNumber: 10,
    guests: 10,
    bottles: [
      { bottleId: "v1", qty: 1 },
      { bottleId: "w1", qty: 1 },
    ],
    notes: "חברים של החתן – הרבה אלכוהול",
  },
];

/* ======================================================
   MAIN MODULE
====================================================== */

export default function AlcoholManagementModule() {
  const [mode, setMode] = useState("planning");
  const [alcohol, setAlcohol] = useState(INITIAL_ALCOHOL_TYPES);
  const [tables, setTables] = useState(INITIAL_TABLE_REQUESTS);

  // מחסן לייב
  const [inventory, setInventory] = useState(() => {
    const inv = {};
    INITIAL_ALCOHOL_TYPES.forEach((t) =>
      t.bottles.forEach((b) => {
        inv[b.id] = b.total;
      })
    );
    return inv;
  });

  const [liveLog, setLiveLog] = useState([]);

  /* ======================================================
     HELPERS
  ====================================================== */

  function openBottle({ bottleId, location }) {
    if (inventory[bottleId] <= 0) return;

    setInventory((prev) => ({
      ...prev,
      [bottleId]: prev[bottleId] - 1,
    }));

    setLiveLog((prev) => [
      {
        time: new Date().toLocaleTimeString(),
        bottleId,
        location,
      },
      ...prev,
    ]);
  }

  function getBottleById(id) {
    for (const t of alcohol) {
      const b = t.bottles.find((x) => x.id === id);
      if (b) return { ...b, type: t.type };
    }
    return null;
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
          PLANNING MODE – נשאר כמו שהיה
      ====================================================== */}
      {mode === "planning" && (
        <div className="space-y-6">
          <Section title="בקשות זוג / חריגות לפי שולחן">
            {tables.map((t, ti) => (
              <Card key={ti}>
                <b>שולחן {t.tableNumber}</b>

                <textarea
                  value={t.notes}
                  className="w-full border rounded-lg p-2 text-sm mt-2"
                  readOnly
                />

                <div className="text-sm mt-2">
                  {t.bottles.map((b, i) => {
                    const bottle = getBottleById(b.bottleId);
                    return (
                      <div key={i}>
                        {bottle?.type} – {bottle?.brand} × {b.qty}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </Section>
        </div>
      )}

      {/* ======================================================
          LIVE MODE – מערכת אמיתית
      ====================================================== */}
      {mode === "live" && (
        <div className="grid grid-cols-3 gap-6">
          {/* INVENTORY */}
          <Card>
            <h3 className="font-semibold mb-2">📦 מחסן</h3>
            {Object.entries(inventory).map(([id, qty]) => {
              const b = getBottleById(id);
              return (
                <div key={id} className="flex justify-between text-sm">
                  <span>
                    {b?.type} – {b?.brand} {b?.flavor && `(${b.flavor})`}
                  </span>
                  <b>{qty}</b>
                </div>
              );
            })}
          </Card>

          {/* ACTIONS */}
          <div className="col-span-2 space-y-4">
            <Section title="פתיחת בקבוק">
              {alcohol.map((t) =>
                t.bottles.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <div>
                      <b>{t.type}</b> – {b.brand}{" "}
                      {b.flavor && `(${b.flavor})`}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          openBottle({
                            bottleId: b.id,
                            location: "בר",
                          })
                        }
                        className="px-3 py-1 bg-black text-white rounded text-sm"
                      >
                        פתח בבר
                      </button>

                      {tables.map((t) => (
                        <button
                          key={t.tableNumber}
                          onClick={() =>
                            openBottle({
                              bottleId: b.id,
                              location: `שולחן ${t.tableNumber}`,
                            })
                          }
                          className="px-3 py-1 bg-gray-200 rounded text-sm"
                        >
                          שולחן {t.tableNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </Section>

            {/* LIVE LOG */}
            <Section title="לוג בזמן אמת">
              {liveLog.length === 0 && (
                <div className="text-sm text-gray-400">אין פתיחות</div>
              )}

              {liveLog.map((l, i) => {
                const b = getBottleById(l.bottleId);
                return (
                  <div key={i} className="text-sm">
                    {l.time} – {b?.brand} ({b?.type}) → {l.location}
                  </div>
                );
              })}
            </Section>
          </div>
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
