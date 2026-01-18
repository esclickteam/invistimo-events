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

  /* LIVE */
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
    const available = inventory[bottleId]?.[liveFrom] || 0;
    if (available <= 0) return;

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
    <div className="max-w-6xl mx-auto p-6 space-y-8">

      {/* HEADER */}
      <div className="flex items-center justify-between">
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
            <Card key={b.id} tone="neutral">
              <div className="grid grid-cols-4 gap-4">
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
        <Section title="הקצאות מתוכננות">
          {bottles.map((b) => (
            <Card key={b.id} tone="edit">
              <div className="mb-3 font-semibold text-lg">
                {b.category} – {b.brand}
              </div>

              <div className="grid grid-cols-4 gap-4">
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

          <button
            onClick={saveAllocations}
            className="mt-4 px-6 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-800"
          >
            💾 שמור הקצאות
          </button>
        </Section>
      )}

      {/* =========================
          LIVE
      ========================= */}
      {mode === "live" && (
        <div className="grid grid-cols-3 gap-6">

          {/* INVENTORY */}
          <Card tone="live">
            <h3 className="font-bold mb-3">יתרות בזמן אמת</h3>
            {bottles.map((b) => (
              <div key={b.id} className="text-sm mb-1">
                <span className="font-semibold">{b.brand}:</span>{" "}
                {Object.entries(inventory[b.id]).map(([loc, qty]) => (
                  <span key={loc} className="ml-2">{loc} {qty}</span>
                ))}
              </div>
            ))}
          </Card>

          {/* ACTIONS */}
          <div className="col-span-2 space-y-4">
            <Card tone="live">
              <div className="grid grid-cols-4 gap-4">
                <Select label="מאיפה" value={liveFrom} onChange={setLiveFrom} options={Object.keys(inventory[bottles[0].id])} />
                <NumberInput label="כמות" value={liveQty} onChange={setLiveQty} />
                <Input label="לאן" value={liveTo} onChange={setLiveTo} />
                <Input label="הערה" value={liveNote} onChange={setLiveNote} />
              </div>
            </Card>

            {bottles.map((b) => (
              <Card key={b.id} tone="live">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{b.brand}</span>
                  <button
                    disabled={!inventory[b.id][liveFrom]}
                    onClick={() => openBottleLive(b.id)}
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      inventory[b.id][liveFrom]
                        ? "bg-black text-white hover:bg-gray-800"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    פתח בקבוק
                  </button>
                </div>
              </Card>
            ))}

            <Section title="לוג פעולות">
              {log.map((l, i) => (
                <div key={i} className="text-sm text-gray-700">
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
   UI COMPONENTS
====================================================== */

function ModeButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full font-semibold text-sm transition ${
        active
          ? "bg-black text-white shadow"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      {label}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Card({ children, tone }) {
  const toneClass =
    tone === "edit"
      ? "bg-[#fffaf3] border-2 border-[#e6cfa8]"
      : tone === "live"
      ? "bg-[#f7f3ef] border-2 border-[#c9b18a]"
      : "bg-white border border-gray-200";

  return <div className={`rounded-2xl p-5 ${toneClass}`}>{children}</div>;
}

function Input({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border-2 border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black"
      />
    </div>
  );
}

function NumberInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-xl border-2 border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border-2 border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-black"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
