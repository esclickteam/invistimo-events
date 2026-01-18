"use client";

import { useState } from "react";

/* ======================================================
   INITIAL DATA
====================================================== */

const INITIAL_BOTTLES = [
  { id: "b1", category: "וודקה", brand: "Absolut", flavor: "טבעי", total: 6 },
  { id: "b2", category: "וודקה", brand: "Van Gogh", flavor: "וניל", total: 6 },
  { id: "b3", category: "וויסקי", brand: "Jameson", flavor: "", total: 6 },
];

const INITIAL_TABLES = [
  { tableNumber: 10, guests: 10, requests: "חברים של החתן – הרבה אלכוהול" },
];

const LOCATIONS = ["בר", "מחסן"];

/* ======================================================
   MAIN SYSTEM
====================================================== */

export default function AlcoholManagementSystem() {
  const [mode, setMode] = useState("planning");
  const [bottles, setBottles] = useState(INITIAL_BOTTLES);
  const [tables] = useState(INITIAL_TABLES);

  const [inventory, setInventory] = useState(() => {
    const inv = {};
    INITIAL_BOTTLES.forEach((b) => {
      inv[b.id] = { בר: 0, מחסן: b.total };
    });
    return inv;
  });

  const [allocations, setAllocations] = useState({});
  const [log, setLog] = useState([]);

  /* לייב */
  const [liveFrom, setLiveFrom] = useState("בר");
  const [liveTo, setLiveTo] = useState("");
  const [liveQty, setLiveQty] = useState(1);
  const [liveNote, setLiveNote] = useState("");

  function addLog(text) {
    setLog((prev) => [
      { time: new Date().toLocaleTimeString(), text },
      ...prev,
    ]);
  }

  function updateBottle(index, field, value) {
    setBottles((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  }

  function saveAllocations() {
    const newInventory = {};

    bottles.forEach((b) => {
      newInventory[b.id] = {};
      Object.entries(allocations[b.id] || {}).forEach(([loc, qty]) => {
        newInventory[b.id][loc] = qty;
      });
    });

    setInventory((prev) => ({ ...prev, ...newInventory }));
    addLog("נשמרו הקצאות מתוכננות");
  }

  function openBottleLive(bottleId) {
    if (!inventory[bottleId]?.[liveFrom]) return;

    const available = inventory[bottleId][liveFrom];
    const qty = Math.min(liveQty, available);

    setInventory((prev) => ({
      ...prev,
      [bottleId]: {
        ...prev[bottleId],
        [liveFrom]: prev[bottleId][liveFrom] - qty,
      },
    }));

    const bottle = bottles.find((b) => b.id === bottleId);
    addLog(
      `נפתחו ${qty} × ${bottle.brand} מ-${liveFrom}${
        liveTo ? ` → ${liveTo}` : ""
      }${liveNote ? ` | ${liveNote}` : ""}`
    );

    setLiveNote("");
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🍾 מערכת ניהול אלכוהול</h1>
        <div className="flex gap-2">
          <ModeButton label="תכנון" active={mode === "planning"} onClick={() => setMode("planning")} />
          <ModeButton label="הקצאה" active={mode === "allocation"} onClick={() => setMode("allocation")} />
          <ModeButton label="לייב" active={mode === "live"} onClick={() => setMode("live")} />
        </div>
      </div>

      {/* =========================
          PLANNING
      ========================= */}
      {mode === "planning" && (
        <Section title="מלאי בקבוקים">
          {bottles.map((b, i) => (
            <Card key={b.id} variant="planning">
              <div className="grid grid-cols-5 gap-3">
                <Input label="קטגוריה" value={b.category} onChange={(v) => updateBottle(i, "category", v)} />
                <Input label="מותג" value={b.brand} onChange={(v) => updateBottle(i, "brand", v)} />
                <Input label="טעם" value={b.flavor} onChange={(v) => updateBottle(i, "flavor", v)} />
                <NumberInput label="סה״כ" value={b.total} onChange={(v) => updateBottle(i, "total", v)} />
              </div>
            </Card>
          ))}
        </Section>
      )}

      {/* =========================
          ALLOCATION
      ========================= */}
      {mode === "allocation" && (
        <Section title="הקצאות מתוכננות (עריכה)">
          {bottles.map((b) => (
            <Card key={b.id} variant="allocation">
              <b>{b.category} – {b.brand}</b>

              <div className="grid grid-cols-4 gap-3 mt-3">
                {LOCATIONS.map((loc) => (
                  <NumberInput
                    key={loc}
                    label={loc}
                    value={allocations[b.id]?.[loc] || ""}
                    onChange={(v) =>
                      setAllocations((prev) => ({
                        ...prev,
                        [b.id]: { ...prev[b.id], [loc]: v },
                      }))
                    }
                  />
                ))}

                {tables.map((t) => (
                  <NumberInput
                    key={t.tableNumber}
                    label={`שולחן ${t.tableNumber}`}
                    value={allocations[b.id]?.[`שולחן ${t.tableNumber}`] || ""}
                    onChange={(v) =>
                      setAllocations((prev) => ({
                        ...prev,
                        [b.id]: {
                          ...prev[b.id],
                          [`שולחן ${t.tableNumber}`]: v,
                        },
                      }))
                    }
                  />
                ))}
              </div>
            </Card>
          ))}

          <button className="btn-primary" onClick={saveAllocations}>
            💾 שמור הקצאות
          </button>
        </Section>
      )}

      {/* =========================
          LIVE
      ========================= */}
      {mode === "live" && (
        <div className="grid grid-cols-3 gap-6">
          <Card variant="live">
            <h3 className="font-semibold mb-2">יתרות בזמן אמת</h3>
            {bottles.map((b) => (
              <div key={b.id} className="text-sm">
                <b>{b.brand}</b>:
                {Object.entries(inventory[b.id]).map(([loc, qty]) => (
                  <span key={loc} className="mr-2">{loc} {qty}</span>
                ))}
              </div>
            ))}
          </Card>

          <div className="col-span-2 space-y-4">
            <Card variant="live">
              <div className="grid grid-cols-4 gap-3">
                <select className="input" value={liveFrom} onChange={(e) => setLiveFrom(e.target.value)}>
                  {Object.keys(inventory[bottles[0].id]).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>

                <NumberInput label="כמות" value={liveQty} onChange={setLiveQty} />
                <Input label="לאן" value={liveTo} onChange={setLiveTo} />
                <Input label="הערה" value={liveNote} onChange={setLiveNote} />
              </div>
            </Card>

            {bottles.map((b) => (
              <Card key={b.id} variant="live">
                <b>{b.brand}</b>
                <button
                  className="btn-primary mt-2"
                  disabled={!inventory[b.id][liveFrom]}
                  onClick={() => openBottleLive(b.id)}
                >
                  פתח בקבוק
                </button>
              </Card>
            ))}

            <Section title="לוג פעולות">
              {log.map((l, i) => (
                <div key={i} className="text-sm">
                  {l.time} – {l.text}
                </div>
              ))}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================================================
   UI
====================================================== */

function ModeButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm ${
        active ? "bg-black text-white" : "bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Card({ children, variant }) {
  const variantClass =
    variant === "allocation"
      ? "card-allocation"
      : variant === "live"
      ? "card-live"
      : "card-planning";

  return <div className={`bg-white rounded-xl p-4 shadow-sm ${variantClass}`}>{children}</div>;
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="input" />
    </div>
  );
}

function NumberInput({ label, value, onChange }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input"
      />
    </div>
  );
}
