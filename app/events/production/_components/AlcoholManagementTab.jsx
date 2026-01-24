"use client";

import { useState } from "react";

/* ======================================================
   INITIAL
====================================================== */

const INITIAL_BOTTLES = [
  { id: "b1", category: "וודקה", brand: "Absolut", flavor: "טבעי", total: 6 },
  { id: "b2", category: "וודקה", brand: "Van Gogh", flavor: "וניל", total: 6 },
  { id: "b3", category: "וויסקי", brand: "Jameson", flavor: "", total: 6 },
];

/* ======================================================
   MAIN
====================================================== */

export default function AlcoholManagementSystem() {
  const [mode, setMode] = useState("planning");
  const [bottles, setBottles] = useState(INITIAL_BOTTLES);

  // allocations[bottleId] = [{ id, location, qty, opened }]
  const [allocations, setAllocations] = useState({});
  const [log, setLog] = useState([]);

  /* ======================================================
     HELPERS
  ====================================================== */

  function addLog(text) {
    setLog((prev) => [{ time: new Date().toLocaleTimeString(), text }, ...prev]);
  }

  function totalAllocated(bottleId) {
    return (allocations[bottleId] || []).reduce((sum, r) => sum + r.qty, 0);
  }

  function remainingUnallocated(bottle) {
    return bottle.total - totalAllocated(bottle.id);
  }

  /* ======================================================
     PLANNING
  ====================================================== */

  function addBottle() {
    setBottles((prev) => [
      ...prev,
      {
        id: `b${Date.now()}`,
        category: "",
        brand: "",
        flavor: "",
        total: 1,
      },
    ]);
  }

  function updateBottle(index, field, value) {
    setBottles((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  }

  function removeBottle(id) {
    setBottles((prev) => prev.filter((b) => b.id !== id));
    setAllocations((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  /* ======================================================
     ALLOCATIONS
  ====================================================== */

  function addAllocation(bottleId, location, qty) {
    if (!location || qty <= 0) return;

    setAllocations((prev) => ({
      ...prev,
      [bottleId]: [
        ...(prev[bottleId] || []),
        {
          id: Date.now(),
          location,
          qty,
          opened: 0,
        },
      ],
    }));
  }

  /* ======================================================
     LIVE
  ====================================================== */

  function openBottle(bottle, allocation) {
    if (allocation.opened >= allocation.qty) return;

    setAllocations((prev) => ({
      ...prev,
      [bottle.id]: (prev[bottle.id] || []).map((a) =>
        a.id === allocation.id ? { ...a, opened: a.opened + 1 } : a
      ),
    }));

    addLog(`${bottle.brand} – נפתח בקבוק (${allocation.location})`);
  }

  function openExtraBottle(bottle, location) {
    if (!location) return;
    addLog(`${bottle.brand} – נפתח בקבוק נוסף → ${location}`);
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
          <ModeButton
            label="תכנון"
            active={mode === "planning"}
            onClick={() => setMode("planning")}
          />
          <ModeButton
            label="הקצאות"
            active={mode === "allocation"}
            onClick={() => setMode("allocation")}
          />
          <ModeButton
            label="לייב"
            active={mode === "live"}
            onClick={() => setMode("live")}
          />
        </div>
      </div>

      {/* ================= PLANNING ================= */}
      {mode === "planning" && (
        <>
          {bottles.map((b, i) => (
            <Card key={b.id}>
              <div className="grid grid-cols-5 gap-3 items-end">
                <Input
                  label="קטגוריה"
                  value={b.category}
                  onChange={(v) => updateBottle(i, "category", v)}
                />
                <Input
                  label="מותג"
                  value={b.brand}
                  onChange={(v) => updateBottle(i, "brand", v)}
                />
                <Input
                  label="טעם"
                  value={b.flavor}
                  onChange={(v) => updateBottle(i, "flavor", v)}
                />
                <NumberInput
                  label="סה״כ בקבוקים"
                  value={b.total}
                  onChange={(v) => updateBottle(i, "total", v)}
                />
                <button
                  type="button"
                  onClick={() => removeBottle(b.id)}
                  className="text-red-600 text-sm"
                >
                  מחיקה
                </button>
              </div>
            </Card>
          ))}

          <button
            type="button"
            onClick={addBottle}
            className="px-5 py-2 bg-black text-white rounded-lg"
          >
            ➕ הוסף סוג אלכוהול
          </button>
        </>
      )}

      {/* ================= ALLOCATION ================= */}
      {mode === "allocation" && (
        <>
          {bottles.map((b) => (
            <Card key={b.id}>
              <div className="font-semibold mb-2">
                {b.brand} | סה״כ: {b.total} | נותר להקצאה: {remainingUnallocated(b)}
              </div>

              {(allocations[b.id] || []).map((a) => (
                <div key={a.id} className="text-sm">
                  {a.location} – {a.qty}
                </div>
              ))}

              <AllocationAdder
                max={remainingUnallocated(b)}
                onAdd={(loc, qty) => addAllocation(b.id, loc, qty)}
              />
            </Card>
          ))}
        </>
      )}

      {/* ================= LIVE ================= */}
      {mode === "live" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {bottles.map((b) => (
              <Card key={b.id}>
                <div className="font-bold mb-2">{b.brand}</div>

                {(allocations[b.id] || []).map((a) => (
                  <div
                    key={a.id}
                    className="flex justify-between items-center text-sm mb-1"
                  >
                    <span>
                      {a.location} | הוקצו: {a.qty} | נפתחו: {a.opened} | נותרו:{" "}
                      {a.qty - a.opened}
                    </span>
                    <button
                      type="button"
                      disabled={a.opened >= a.qty}
                      onClick={() => openBottle(b, a)}
                      className="px-3 py-1 bg-black text-white rounded disabled:bg-gray-300"
                    >
                      פתח בקבוק
                    </button>
                  </div>
                ))}

                <ExtraOpen onOpen={(loc) => openExtraBottle(b, loc)} />
              </Card>
            ))}
          </div>

          <Card>
            <h3 className="font-bold mb-2">לוג פעולות</h3>
            {log.map((l, i) => (
              <div key={i} className="text-sm">
                {l.time} – {l.text}
              </div>
            ))}
          </Card>
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
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full ${
        active ? "bg-black text-white" : "bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function Card({ children }) {
  return <div className="border rounded-xl p-4 bg-white">{children}</div>;
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <div className="text-xs">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded px-2 py-1 w-full"
      />
    </div>
  );
}

function NumberInput({ label, value, onChange }) {
  return (
    <div>
      <div className="text-xs">{label}</div>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="border rounded px-2 py-1 w-full"
      />
    </div>
  );
}

function AllocationAdder({ max, onAdd }) {
  const [location, setLocation] = useState("");
  const [qty, setQty] = useState(1);

  return (
    <div className="flex gap-2 mt-2">
      <Input label="מיקום (בר / מחסן / שולחן 10)" value={location} onChange={setLocation} />
      <NumberInput label="כמות" value={qty} onChange={setQty} />
      <button
        type="button"
        disabled={qty > max}
        onClick={() => {
          onAdd(location, qty);
          setLocation("");
          setQty(1);
        }}
        className="px-3 bg-black text-white rounded disabled:bg-gray-300"
      >
        הוסף
      </button>
    </div>
  );
}

function ExtraOpen({ onOpen }) {
  const [location, setLocation] = useState("");

  return (
    <div className="mt-2 flex gap-2">
      <Input label="פתיחה נוספת → לאן" value={location} onChange={setLocation} />
      <button
        type="button"
        onClick={() => onOpen(location)}
        className="px-3 bg-gray-800 text-white rounded"
      >
        פתח בקבוק נוסף
      </button>
    </div>
  );
}
