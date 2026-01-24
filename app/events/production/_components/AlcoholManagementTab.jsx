"use client";

import { useEffect, useState } from "react";

/* ======================================================
   MAIN
====================================================== */

export default function AlcoholManagementSystem({ eventId }) {
  const [mode, setMode] = useState("planning");
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState([]);

  /* ======================================================
     LOAD FROM API
  ====================================================== */

  useEffect(() => {
    if (!eventId) return;

    fetch(`/api/events/${eventId}/alcohol`)
  .then((res) => {
    if (!res.ok) throw new Error("Failed to load alcohol");
    return res.json();
  })

  .then((data) => {
    setBottles(Array.isArray(data?.alcohol) ? data.alcohol.filter(Boolean) : []);
  })
  .catch(() => setBottles([]))
  .finally(() => setLoading(false));

  }, [eventId]);

  if (!eventId || loading) {
    return (
      <div className="p-10 text-center text-gray-400">
        טוען מערכת אלכוהול…
      </div>
    );
  }

  /* ======================================================
     HELPERS
  ====================================================== */

  function addLog(text) {
    setLog((prev) => [
      { time: new Date().toLocaleTimeString(), text },
      ...prev,
    ]);
  }

  function totalAllocated(bottle) {
    return (bottle.allocations || []).reduce(
      (sum, a) => sum + a.qty,
      0
    );
  }

  function remainingUnallocated(bottle) {
    return bottle.total - totalAllocated(bottle);
  }

  /* ======================================================
     API ACTIONS
  ====================================================== */

  async function addBottle() {
  const res = await fetch(`/api/events/${eventId}/alcohol`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "",
      brand: "",
      flavor: "",
      total: 1,
    }),
  });

  if (!res.ok) return; // או throw

  const data = await res.json();
  if (data?.alcohol) {
    setBottles((prev) => [...prev, data.alcohol].filter(Boolean));
  }
}


  async function updateBottle(id, patch) {
  const res = await fetch(`/api/events/alcohol/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!res.ok) return;

  const data = await res.json();
  setBottles((prev) =>
    prev
      .filter(Boolean)
      .map((b) => (b._id === id ? (data?.alcohol ?? b) : b))
  );
}

  async function removeBottle(id) {
    await fetch(`/api/events/alcohol/${id}`, { method: "DELETE" });
    setBottles((prev) => prev.filter((b) => b._id !== id));
  }

  async function addAllocation(bottle, location, qty) {
    if (!location || qty <= 0) return;

    const updated = {
      allocations: [
        ...(bottle.allocations || []),
        { location, qty, opened: 0 },
      ],
    };

    updateBottle(bottle._id, updated);
  }

  async function openBottle(bottle, allocationIndex) {
    const allocations = [...bottle.allocations];
    const a = allocations[allocationIndex];

    if (a.opened >= a.qty) return;

    allocations[allocationIndex] = {
      ...a,
      opened: a.opened + 1,
    };

    updateBottle(bottle._id, { allocations });
    addLog(`${bottle.brand} – נפתח בקבוק (${a.location})`);
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
          <ModeButton label="הקצאות" active={mode === "allocation"} onClick={() => setMode("allocation")} />
          <ModeButton label="לייב" active={mode === "live"} onClick={() => setMode("live")} />
        </div>
      </div>

      {/* ================= PLANNING ================= */}
      {mode === "planning" && (
        <>
          {bottles.filter(Boolean).map((b) => (
  <Card key={b._id}>
    <div className="grid grid-cols-5 gap-3 items-end">
      <Input
        label="קטגוריה"
        value={b.category ?? ""}
        onChange={(v) => updateBottle(b._id, { category: v })}
      />
      <Input
        label="מותג"
        value={b.brand ?? ""}
        onChange={(v) => updateBottle(b._id, { brand: v })}
      />
      <Input
        label="טעם"
        value={b.flavor ?? ""}
        onChange={(v) => updateBottle(b._id, { flavor: v })}
      />
      <NumberInput
        label="סה״כ בקבוקים"
        value={b.total ?? 0}
        onChange={(v) => updateBottle(b._id, { total: v })}
      />
      <button onClick={() => removeBottle(b._id)} className="text-red-600 text-sm">
        מחיקה
      </button>
    </div>
  </Card>
))}


          <button onClick={addBottle} className="px-5 py-2 bg-black text-white rounded-lg">
            ➕ הוסף סוג אלכוהול
          </button>
        </>
      )}

      {/* ================= ALLOCATION ================= */}
      {mode === "allocation" && (
        <>
          {bottles.filter(Boolean).map((b) => (
            <Card key={b._id}>
              <div className="font-semibold mb-2">
                {b.brand} | סה״כ: {b.total} | נותר: {remainingUnallocated(b)}
              </div>

              {(b.allocations || []).map((a, i) => (
                <div key={i} className="text-sm">
                  {a.location} – {a.qty}
                </div>
              ))}

              <AllocationAdder
                max={remainingUnallocated(b)}
                onAdd={(loc, qty) => addAllocation(b, loc, qty)}
              />
            </Card>
          ))}
        </>
      )}

      {/* ================= LIVE ================= */}
      {mode === "live" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {bottles.filter(Boolean).map((b) => (
              <Card key={b._id}>
                <div className="font-bold mb-2">{b.brand}</div>

                {(b.allocations || []).map((a, i) => (
                  <div key={i} className="flex justify-between items-center text-sm mb-1">
                    <span>
                      {a.location} | הוקצו: {a.qty} | נפתחו: {a.opened} | נותרו: {a.qty - a.opened}
                    </span>
                    <button
                      disabled={a.opened >= a.qty}
                      onClick={() => openBottle(b, i)}
                      className="px-3 py-1 bg-black text-white rounded disabled:bg-gray-300"
                    >
                      פתח בקבוק
                    </button>
                  </div>
                ))}
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
   UI
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
      <input type="number" min={0} value={value} onChange={(e) => onChange(+e.target.value)} className="border rounded px-2 py-1 w-full" />
    </div>
  );
}

function AllocationAdder({ max, onAdd }) {
  const [location, setLocation] = useState("");
  const [qty, setQty] = useState(1);

  return (
    <div className="flex gap-2 mt-2">
      <Input label="מיקום" value={location} onChange={setLocation} />
      <NumberInput label="כמות" value={qty} onChange={setQty} />
      <button
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
