"use client";

import { useState } from "react";

/* ======================================================
   INITIAL DATA
====================================================== */

const INITIAL_BOTTLES = [
  {
    id: "b1",
    category: "וודקה",
    brand: "Absolut",
    flavor: "טבעי",
    total: 6,
  },
  {
    id: "b2",
    category: "וודקה",
    brand: "Van Gogh",
    flavor: "וניל",
    total: 6,
  },
  {
    id: "b3",
    category: "וויסקי",
    brand: "Jameson",
    flavor: "",
    total: 6,
  },
];

const INITIAL_TABLES = [
  {
    tableNumber: 10,
    guests: 10,
    requests: "חברים של החתן – הרבה אלכוהול",
  },
];

const LOCATIONS = ["בר", "מחסן"];

/* ======================================================
   MAIN SYSTEM
====================================================== */

export default function AlcoholManagementSystem() {
  const [mode, setMode] = useState("planning"); // planning | allocation | live
  const [bottles, setBottles] = useState(INITIAL_BOTTLES);
  const [tables, setTables] = useState(INITIAL_TABLES);

  // inventory[bottleId][location] = qty
  const [inventory, setInventory] = useState(() => {
    const inv = {};
    INITIAL_BOTTLES.forEach((b) => {
      inv[b.id] = {
        בר: 0,
        מחסן: b.total,
      };
    });
    return inv;
  });

  const [log, setLog] = useState([]);

  /* ======================================================
     HELPERS
  ====================================================== */

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

  function addBottle() {
    const id = `b${Date.now()}`;
    setBottles((prev) => [
      ...prev,
      {
        id,
        category: "",
        brand: "",
        flavor: "",
        total: 1,
      },
    ]);
    setInventory((prev) => ({
      ...prev,
      [id]: { בר: 0, מחסן: 1 },
    }));
  }

  function allocateBottle(bottleId, from, to) {
    if (inventory[bottleId][from] <= 0) return;

    setInventory((prev) => ({
      ...prev,
      [bottleId]: {
        ...prev[bottleId],
        [from]: prev[bottleId][from] - 1,
        [to]: prev[bottleId][to] + 1,
      },
    }));

    addLog(`הועבר בקבוק מ-${from} ל-${to}`);
  }

  function openBottle(bottleId, location) {
    if (inventory[bottleId][location] <= 0) return;

    setInventory((prev) => ({
      ...prev,
      [bottleId]: {
        ...prev[bottleId],
        [location]: prev[bottleId][location] - 1,
      },
    }));

    const bottle = bottles.find((b) => b.id === bottleId);
    addLog(
      `נפתח ${bottle.brand} ${bottle.flavor && `(${bottle.flavor})`} ב-${location}`
    );
  }

  /* ======================================================
     RENDER
  ====================================================== */

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
            <Card key={b.id}>
              <div className="grid grid-cols-5 gap-3">
                <Input label="קטגוריה" value={b.category} onChange={(v) => updateBottle(i, "category", v)} />
                <Input label="מותג" value={b.brand} onChange={(v) => updateBottle(i, "brand", v)} />
                <Input label="טעם" value={b.flavor} onChange={(v) => updateBottle(i, "flavor", v)} />
                <NumberInput label="סה״כ" value={b.total} onChange={(v) => updateBottle(i, "total", v)} />
              </div>
            </Card>
          ))}

          <button className="btn-primary" onClick={addBottle}>
            + הוסף בקבוק
          </button>
        </Section>
      )}

      {/* =========================
          ALLOCATION
      ========================= */}
      {mode === "allocation" && (
        <Section title="הקצאה ראשונית">
          {bottles.map((b) => (
            <Card key={b.id}>
              <b>
                {b.category} – {b.brand} {b.flavor && `(${b.flavor})`}
              </b>

              <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                {Object.entries(inventory[b.id]).map(([loc, qty]) => (
                  <div key={loc}>
                    {loc}: <b>{qty}</b>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={() => allocateBottle(b.id, "מחסן", "בר")} className="btn-secondary">
                  העבר לבר
                </button>
                {tables.map((t) => (
                  <button
                    key={t.tableNumber}
                    onClick={() => allocateBottle(b.id, "מחסן", `שולחן ${t.tableNumber}`)}
                    className="btn-secondary"
                  >
                    שולחן {t.tableNumber}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </Section>
      )}

      {/* =========================
          LIVE
      ========================= */}
      {mode === "live" && (
        <div className="grid grid-cols-3 gap-6">
          {/* INVENTORY */}
          <Card>
            <h3 className="font-semibold mb-2">יתרות בזמן אמת</h3>
            {bottles.map((b) => (
              <div key={b.id} className="text-sm">
                <b>{b.brand}</b>:
                {Object.entries(inventory[b.id]).map(([loc, qty]) => (
                  <span key={loc} className="mr-2">
                    {loc} {qty}
                  </span>
                ))}
              </div>
            ))}
          </Card>

          {/* ACTIONS */}
          <div className="col-span-2 space-y-4">
            {bottles.map((b) => (
              <Card key={b.id}>
                <b>{b.brand}</b>
                <div className="flex gap-2 mt-2">
                  {Object.keys(inventory[b.id]).map((loc) => (
                    <button
                      key={loc}
                      onClick={() => openBottle(b.id, loc)}
                      className="btn-primary"
                    >
                      פתח ב-{loc}
                    </button>
                  ))}
                </div>
              </Card>
            ))}

            <Section title="לוג פעולות">
              {log.length === 0 && <div className="text-gray-400 text-sm">אין פעולות</div>}
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

function Card({ children }) {
  return <div className="bg-white border rounded-xl p-4 shadow-sm">{children}</div>;
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
        value={value}
        min={0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input"
      />
    </div>
  );
}
