"use client";
import { useState } from "react";

/* =========================
   INITIAL DATA
========================= */

const INITIAL_BOTTLES = [
  { id: "b1", brand: "Absolut", category: "וודקה", flavor: "טבעי", total: 6 },
  { id: "b2", brand: "Van Gogh", category: "וודקה", flavor: "וניל", total: 6 },
  { id: "b3", brand: "Jameson", category: "וויסקי", flavor: "", total: 6 },
];

/* =========================
   MAIN
========================= */

export default function AlcoholManagementSystem() {
  const [mode, setMode] = useState("planning");
  const [bottles, setBottles] = useState(INITIAL_BOTTLES);

  const [inventory, setInventory] = useState(() => {
    const inv = {};
    INITIAL_BOTTLES.forEach((b) => {
      inv[b.id] = {
        total: b.total,
        warehouse: b.total,
        allocations: [],
      };
    });
    return inv;
  });

  const [log, setLog] = useState([]);

  /* ===== helpers ===== */

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
      { id, brand: "", category: "", flavor: "", total: 1 },
    ]);
    setInventory((prev) => ({
      ...prev,
      [id]: { total: 1, warehouse: 1, allocations: [] },
    }));
  }

  function updateBottle(index, field, value) {
    const bottle = bottles[index];
    setBottles((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );

    if (field === "total") {
      setInventory((prev) => ({
        ...prev,
        [bottle.id]: {
          ...prev[bottle.id],
          total: value,
          warehouse:
            value -
            prev[bottle.id].allocations.reduce(
              (s, a) => s + a.planned,
              0
            ),
        },
      }));
    }
  }

  /* ===== allocations ===== */

  function addAllocation(bottleId, target, qty) {
    setInventory((prev) => {
      if (prev[bottleId].warehouse < qty) return prev;

      return {
        ...prev,
        [bottleId]: {
          ...prev[bottleId],
          warehouse: prev[bottleId].warehouse - qty,
          allocations: [
            ...prev[bottleId].allocations,
            {
              id: Date.now(),
              target,
              planned: qty,
              opened: 0,
            },
          ],
        },
      };
    });

    const bottle = bottles.find((b) => b.id === bottleId);
    addLog(
      `הוקצו ${qty} בקבוקים של ${bottle.brand} ל-${target}`
    );
  }

  function openFromAllocation(bottleId, allocId) {
    setInventory((prev) => {
      const allocs = prev[bottleId].allocations.map((a) =>
        a.id === allocId && a.opened < a.planned
          ? { ...a, opened: a.opened + 1 }
          : a
      );
      return {
        ...prev,
        [bottleId]: { ...prev[bottleId], allocations: allocs },
      };
    });

    const bottle = bottles.find((b) => b.id === bottleId);
    const alloc = inventory[bottleId].allocations.find(
      (a) => a.id === allocId
    );

    addLog(
      `נפתח בקבוק ${bottle.brand} → ${alloc.target}`
    );
  }

  function openFromWarehouse(bottleId, target, qty) {
    setInventory((prev) => ({
      ...prev,
      [bottleId]: {
        ...prev[bottleId],
        warehouse: prev[bottleId].warehouse - qty,
      },
    }));

    const bottle = bottles.find((b) => b.id === bottleId);
    addLog(
      `נפתחו ${qty} בקבוקים של ${bottle.brand} מהמחסן → ${target} (חריג)`
    );
  }

  /* =========================
     UI
  ========================= */

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex gap-2">
        {["planning", "allocation", "live"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-full ${
              mode === m ? "bg-black text-white" : "bg-gray-200"
            }`}
          >
            {m === "planning"
              ? "תכנון"
              : m === "allocation"
              ? "הקצאות"
              : "לייב"}
          </button>
        ))}
      </div>

      {/* ===== PLANNING ===== */}
      {mode === "planning" && (
        <>
          {bottles.map((b, i) => (
            <div key={b.id} className="border rounded-xl p-4 bg-white">
              <div className="grid grid-cols-4 gap-3">
                <Input label="קטגוריה" value={b.category} onChange={(v) => updateBottle(i, "category", v)} />
                <Input label="מותג" value={b.brand} onChange={(v) => updateBottle(i, "brand", v)} />
                <Input label="טעם" value={b.flavor} onChange={(v) => updateBottle(i, "flavor", v)} />
                <NumberInput label="סה״כ" value={b.total} onChange={(v) => updateBottle(i, "total", v)} />
              </div>
            </div>
          ))}
          <button onClick={addBottle} className="px-5 py-2 bg-black text-white rounded">
            ➕ הוסף בקבוק
          </button>
        </>
      )}

      {/* ===== ALLOCATION ===== */}
      {mode === "allocation" &&
        bottles.map((b) => (
          <div key={b.id} className="border rounded-xl p-4 bg-[#fffaf3] space-y-3">
            <div className="font-semibold">
              {b.brand} | מחסן: {inventory[b.id].warehouse}
            </div>

            <AllocationCreator
              onAdd={(target, qty) => addAllocation(b.id, target, qty)}
            />
          </div>
        ))}

      {/* ===== LIVE ===== */}
      {mode === "live" &&
        bottles.map((b) => (
          <div key={b.id} className="border rounded-xl p-4 bg-[#f7f3ef] space-y-2">
            <div className="font-bold">
              {b.brand} | מחסן: {inventory[b.id].warehouse}
            </div>

            {inventory[b.id].allocations.map((a) => (
              <div key={a.id} className="flex justify-between text-sm">
                <span>
                  {a.target} | הוקצו {a.planned} | נפתחו {a.opened}
                </span>
                <button
                  disabled={a.opened >= a.planned}
                  onClick={() => openFromAllocation(b.id, a.id)}
                  className="px-3 py-1 bg-black text-white rounded disabled:bg-gray-300"
                >
                  פתח
                </button>
              </div>
            ))}

            <WarehouseOpen
              onOpen={(target, qty) =>
                openFromWarehouse(b.id, target, qty)
              }
            />
          </div>
        ))}

      {/* LOG */}
      <div className="border rounded-xl p-4 bg-white">
        <h3 className="font-bold mb-2">לוג</h3>
        {log.map((l, i) => (
          <div key={i} className="text-sm">
            {l.time} – {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================
   SMALL COMPONENTS
========================= */

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

function AllocationCreator({ onAdd }) {
  const [target, setTarget] = useState("");
  const [qty, setQty] = useState(1);

  return (
    <div className="flex gap-2">
      <Input label="יעד" value={target} onChange={setTarget} />
      <NumberInput label="כמות" value={qty} onChange={setQty} />
      <button
        onClick={() => target && qty && onAdd(target, qty)}
        className="px-3 bg-black text-white rounded"
      >
        הוסף
      </button>
    </div>
  );
}

function WarehouseOpen({ onOpen }) {
  const [target, setTarget] = useState("");
  const [qty, setQty] = useState(1);

  return (
    <div className="flex gap-2 mt-2">
      <Input label="חריג → לאן" value={target} onChange={setTarget} />
      <NumberInput label="כמות" value={qty} onChange={setQty} />
      <button
        onClick={() => target && qty && onOpen(target, qty)}
        className="px-3 bg-gray-800 text-white rounded"
      >
        פתח מהמחסן
      </button>
    </div>
  );
}
