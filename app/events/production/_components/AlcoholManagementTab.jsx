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

/* ======================================================
   MAIN SYSTEM
====================================================== */

export default function AlcoholManagementSystem() {
  const [mode, setMode] = useState("planning");
  const [bottles, setBottles] = useState(INITIAL_BOTTLES);

  // inventory[bottleId] = { total, locations: { [name]: qty } }
  const [inventory, setInventory] = useState(() => {
    const inv = {};
    INITIAL_BOTTLES.forEach((b) => {
      inv[b.id] = {
        total: b.total,
        locations: { מחסן: b.total },
      };
    });
    return inv;
  });

  const [allocations, setAllocations] = useState({});
  const [log, setLog] = useState([]);

  /* live */
  const [liveFrom, setLiveFrom] = useState("מחסן");
  const [liveTo, setLiveTo] = useState("");
  const [liveQty, setLiveQty] = useState(1);

  /* ======================================================
     HELPERS
  ====================================================== */

  function addLog(text) {
    setLog((prev) => [
      { time: new Date().toLocaleTimeString(), text },
      ...prev,
    ]);
  }

  function addBottle() {
    const id = `b${Date.now()}`;
    setBottles((prev) => [
      ...prev,
      { id, category: "", brand: "", flavor: "", total: 1 },
    ]);

    setInventory((prev) => ({
      ...prev,
      [id]: { total: 1, locations: { מחסן: 1 } },
    }));
  }

  function updateBottle(index, field, value) {
    setBottles((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );

    if (field === "total") {
      const bottle = bottles[index];
      setInventory((prev) => ({
        ...prev,
        [bottle.id]: {
          ...prev[bottle.id],
          total: value,
          locations: { מחסן: value },
        },
      }));
    }
  }

  function saveAllocations() {
    const next = { ...inventory };

    Object.entries(allocations).forEach(([bottleId, rows]) => {
      rows.forEach(({ to, qty }) => {
        if (!next[bottleId].locations[to]) {
          next[bottleId].locations[to] = 0;
        }
        next[bottleId].locations[to] += qty;
        next[bottleId].locations["מחסן"] -= qty;
      });
    });

    setInventory(next);
    setAllocations({});
    addLog("נשמרו הקצאות");
  }

  function openBottleLive(bottleId) {
    const fromQty = inventory[bottleId].locations[liveFrom] || 0;
    if (fromQty < liveQty || !liveTo) return;

    setInventory((prev) => ({
      ...prev,
      [bottleId]: {
        ...prev[bottleId],
        locations: {
          ...prev[bottleId].locations,
          [liveFrom]: prev[bottleId].locations[liveFrom] - liveQty,
          [liveTo]:
            (prev[bottleId].locations[liveTo] || 0) + liveQty,
        },
      },
    }));

    const bottle = bottles.find((b) => b.id === bottleId);
    addLog(
      `${bottle.brand}: נפתחו ${liveQty} מ-${liveFrom} → ${liveTo}`
    );
  }

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🍾 מערכת ניהול אלכוהול</h1>
        <div className="flex gap-2">
          <ModeButton label="תכנון" active={mode === "planning"} onClick={() => setMode("planning")} />
          <ModeButton label="הקצאה" active={mode === "allocation"} onClick={() => setMode("allocation")} />
          <ModeButton label="לייב" active={mode === "live"} onClick={() => setMode("live")} />
        </div>
      </div>

      {/* ================= PLANNING ================= */}
      {mode === "planning" && (
        <>
          <Section title="מלאי בקבוקים">
            {bottles.map((b, i) => (
              <Card key={b.id}>
                <div className="grid grid-cols-4 gap-4">
                  <Input label="קטגוריה" value={b.category} onChange={(v) => updateBottle(i, "category", v)} />
                  <Input label="מותג" value={b.brand} onChange={(v) => updateBottle(i, "brand", v)} />
                  <Input label="טעם" value={b.flavor} onChange={(v) => updateBottle(i, "flavor", v)} />
                  <NumberInput label="סה״כ בקבוקים" value={b.total} onChange={(v) => updateBottle(i, "total", v)} />
                </div>
              </Card>
            ))}
          </Section>

          <button onClick={addBottle} className="px-5 py-2 bg-black text-white rounded-lg">
            ➕ הוסף בקבוק
          </button>
        </>
      )}

      {/* ================= ALLOCATION ================= */}
      {mode === "allocation" && (
        <>
          {bottles.map((b) => (
            <Card key={b.id}>
              <div className="font-semibold mb-2">{b.brand}</div>

              <AllocationRow
                onAdd={(row) =>
                  setAllocations((prev) => ({
                    ...prev,
                    [b.id]: [...(prev[b.id] || []), row],
                  }))
                }
              />

              <div className="text-sm text-gray-600 mt-2">
                מחסן: {inventory[b.id].locations["מחסן"] || 0}
              </div>
            </Card>
          ))}

          <button onClick={saveAllocations} className="px-6 py-3 bg-black text-white rounded-xl">
            💾 שמור הקצאות
          </button>
        </>
      )}

      {/* ================= LIVE ================= */}
      {mode === "live" && (
        <div className="grid grid-cols-3 gap-6">
          <Card>
            <h3 className="font-bold mb-2">יתרות</h3>
            {bottles.map((b) => (
              <div key={b.id} className="text-sm">
                <b>{b.brand}</b>:
                {Object.entries(inventory[b.id].locations).map(([k, v]) => (
                  <span key={k} className="ml-2">{k} {v}</span>
                ))}
              </div>
            ))}
          </Card>

          <div className="col-span-2 space-y-4">
            <Card>
              <div className="grid grid-cols-4 gap-3">
                <Input label="מאיפה" value={liveFrom} onChange={setLiveFrom} />
                <Input label="לאן" value={liveTo} onChange={setLiveTo} />
                <NumberInput label="כמות" value={liveQty} onChange={setLiveQty} />
              </div>
            </Card>

            {bottles.map((b) => (
              <Card key={b.id}>
                <button
                  className="px-4 py-2 bg-black text-white rounded"
                  onClick={() => openBottleLive(b.id)}
                >
                  פתח {b.brand}
                </button>
              </Card>
            ))}

            <Section title="לוג">
              {log.map((l, i) => (
                <div key={i} className="text-sm">{l.time} – {l.text}</div>
              ))}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================================================
   SMALL UI
====================================================== */

function ModeButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full ${
        active ? "bg-black text-white" : "bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="font-bold">{title}</h2>
      {children}
    </div>
  );
}

function Card({ children }) {
  return <div className="border rounded-xl p-4 bg-white">{children}</div>;
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <div className="text-xs">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="border rounded px-2 py-1 w-full" />
    </div>
  );
}

function NumberInput({ label, value, onChange }) {
  return (
    <div>
      <div className="text-xs">{label}</div>
      <input type="number" value={value} onChange={(e) => onChange(+e.target.value)} className="border rounded px-2 py-1 w-full" />
    </div>
  );
}

function AllocationRow({ onAdd }) {
  const [to, setTo] = useState("");
  const [qty, setQty] = useState(1);

  return (
    <div className="flex gap-2">
      <Input label="לאן" value={to} onChange={setTo} />
      <NumberInput label="כמות" value={qty} onChange={setQty} />
      <button onClick={() => to && qty && onAdd({ to, qty })} className="px-3 bg-gray-800 text-white rounded">
        הוסף
      </button>
    </div>
  );
}
