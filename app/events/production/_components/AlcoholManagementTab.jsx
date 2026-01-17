"use client";

import { useState } from "react";

/* ======================================================
   DATA MODELS (TEMP – בעתיד DB)
====================================================== */

const INITIAL_ALCOHOL = [
  {
    id: "vodka",
    label: "וודקה",
    brands: ["Absolut", "Finlandia"],
    totalPlanned: 12,
    startAllocated: 6,
  },
  {
    id: "whiskey",
    label: "וויסקי",
    brands: ["Jameson"],
    totalPlanned: 6,
    startAllocated: 3,
  },
  {
    id: "wine",
    label: "יין",
    brands: ["אדום", "לבן"],
    totalPlanned: 30,
    startAllocated: 20,
  },
];

const INITIAL_TABLES = [
  {
    tableNumber: 10,
    guests: 10,
    alcohol: [
      { type: "vodka", qty: 2 },
      { type: "whiskey", qty: 1 },
    ],
    notes: "חברים של החתן",
  },
];

/* ======================================================
   MAIN COMPONENT
====================================================== */

export default function AlcoholManagementTab() {
  const [mode, setMode] = useState("planning"); // planning | distribution | live
  const [alcohol, setAlcohol] = useState(INITIAL_ALCOHOL);
  const [tables, setTables] = useState(INITIAL_TABLES);

  /* =========================
     DERIVED
  ========================= */

  const warehouse = alcohol.map((a) => ({
    ...a,
    remaining:
      a.totalPlanned -
      a.startAllocated -
      tables.reduce(
        (sum, t) =>
          sum +
          (t.alcohol.find((x) => x.type === a.id)?.qty || 0),
        0
      ),
  }));

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ניהול אלכוהול</h2>

        <div className="flex gap-2">
          <ModeButton
            active={mode === "planning"}
            onClick={() => setMode("planning")}
            label="תכנון"
          />
          <ModeButton
            active={mode === "distribution"}
            onClick={() => setMode("distribution")}
            label="הקצאה"
          />
          <ModeButton
            active={mode === "live"}
            onClick={() => setMode("live")}
            label="לייב"
          />
        </div>
      </div>

      {/* =========================
          🧩 PLANNING
      ========================= */}
      {mode === "planning" && (
        <div className="space-y-6">
          <SectionTitle title="כמויות כלליות" />

          {alcohol.map((item, idx) => (
            <Card key={item.id}>
              <div className="grid grid-cols-4 gap-4 items-end">
                <div>
                  <Label>סוג</Label>
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-xs text-gray-500">
                    {item.brands.join(", ")}
                  </div>
                </div>

                <Field
                  label="סה״כ מתוכנן"
                  value={item.totalPlanned}
                  onChange={(v) =>
                    updateAlcohol(setAlcohol, idx, "totalPlanned", v)
                  }
                />

                <Field
                  label="להוצאה בתחילת האירוע"
                  value={item.startAllocated}
                  onChange={(v) =>
                    updateAlcohol(setAlcohol, idx, "startAllocated", v)
                  }
                />

                <div className="text-sm">
                  רזרבה:{" "}
                  <b>{item.totalPlanned - item.startAllocated}</b>
                </div>
              </div>
            </Card>
          ))}

          <SectionTitle title="שולחנות עם תוספת אלכוהול" />

          {tables.map((table, idx) => (
            <Card key={idx}>
              <div className="flex justify-between">
                <div>
                  <b>שולחן {table.tableNumber}</b> · {table.guests} אורחים
                  <div className="text-sm mt-1">
                    {table.alcohol.map((a, i) => (
                      <div key={i}>
                        +{a.qty} {a.type}
                      </div>
                    ))}
                  </div>
                </div>

                {table.notes && (
                  <div className="text-xs text-gray-500">
                    {table.notes}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* =========================
          📦 DISTRIBUTION
      ========================= */}
      {mode === "distribution" && (
        <div className="space-y-6">
          <SectionTitle title="מחסן מרכזי" />

          {warehouse.map((item) => (
            <Card key={item.id}>
              <div className="flex justify-between items-center">
                <div>
                  <b>{item.label}</b>
                  <div className="text-xs text-gray-500">
                    נשארו במחסן
                  </div>
                </div>

                <div className="text-xl font-bold">
                  {item.remaining}
                </div>
              </div>
            </Card>
          ))}

          <SectionTitle title="שולחנות" />

          {tables.map((table, idx) => (
            <Card key={idx}>
              <div className="flex justify-between items-center">
                <div>
                  <b>שולחן {table.tableNumber}</b>
                  <div className="text-sm">
                    {table.alcohol.map((a, i) => (
                      <span key={i} className="ml-3">
                        {a.type}: {a.qty}
                      </span>
                    ))}
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                  חריגה
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* =========================
          🔴 LIVE (READY)
      ========================= */}
      {mode === "live" && (
        <div className="space-y-4">
          <Card>
            <div className="text-center text-gray-600">
              🔴 מצב לייב ייפתח ביום האירוע
              <div className="text-sm mt-2">
                כאן יתבצע:
                <ul className="list-disc pr-6 text-right mt-2">
                  <li>פתיחת בקבוק</li>
                  <li>העברה בין מיקומים</li>
                  <li>חריגות בזמן אמת</li>
                  <li>סגירה ודוחות</li>
                </ul>
              </div>
            </div>
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
        active
          ? "bg-black text-white"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

function SectionTitle({ title }) {
  return <h3 className="text-lg font-semibold">{title}</h3>;
}

function Card({ children }) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      {children}
    </div>
  );
}

function Label({ children }) {
  return <div className="text-xs text-gray-500">{children}</div>;
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border rounded-lg px-3 py-2 w-full"
      />
    </div>
  );
}

function updateAlcohol(setAlcohol, idx, field, value) {
  setAlcohol((prev) =>
    prev.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    )
  );
}
