"use client";

import { useState } from "react";

/* =========================
   INITIAL STRUCTURE
========================= */

const INITIAL_PLAN = {
  totalGuests: 250,
  generalAlcohol: [
    {
      id: "vodka",
      label: "וודקה",
      plannedTotal: 12,
      startQuantity: 6,
      bottles: ["Absolut", "Finlandia"],
    },
    {
      id: "whiskey",
      label: "וויסקי",
      plannedTotal: 6,
      startQuantity: 3,
      bottles: ["Jameson"],
    },
    {
      id: "wine",
      label: "יין",
      plannedTotal: 30,
      startQuantity: 20,
      bottles: ["אדום", "לבן"],
    },
  ],
  tableOverrides: [
    {
      tableNumber: 1,
      guests: 10,
      extraAlcohol: [
        { type: "vodka", quantity: 2 },
        { type: "whiskey", quantity: 1 },
      ],
      notes: "חברים של החתן",
    },
  ],
};

/* =========================
   COMPONENT
========================= */

export default function AlcoholManagementTab() {
  const [plan, setPlan] = useState(INITIAL_PLAN);
  const [isLiveMode, setIsLiveMode] = useState(false); // עתידי

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">ניהול אלכוהול</h2>

        {/* Future Live Mode Toggle */}
        <button
          disabled
          className="px-4 py-2 rounded-lg bg-gray-200 text-gray-500 cursor-not-allowed text-sm"
        >
          מצב לייב (בקרוב)
        </button>
      </div>

      {/* =========================
          🧩 PLANNING SECTION
      ========================= */}
      <section className="space-y-4">
        <h3 className="font-semibold text-lg">🧩 תכנון אלכוהול להפקה</h3>

        {/* General Alcohol Plan */}
        <div className="space-y-3">
          {plan.generalAlcohol.map((item) => (
            <div
              key={item.id}
              className="border rounded-xl p-4 flex flex-col gap-3 bg-white"
            >
              <div className="font-semibold">{item.label}</div>

              <div className="grid grid-cols-3 gap-4">
                <Field
                  label="סה״כ מתוכנן"
                  value={item.plannedTotal}
                  onChange={(v) =>
                    updateGeneralAlcohol(
                      plan,
                      setPlan,
                      item.id,
                      "plannedTotal",
                      v
                    )
                  }
                />
                <Field
                  label="להוצאה בתחילת האירוע"
                  value={item.startQuantity}
                  onChange={(v) =>
                    updateGeneralAlcohol(
                      plan,
                      setPlan,
                      item.id,
                      "startQuantity",
                      v
                    )
                  }
                />
                <div className="text-sm text-gray-500 flex items-center">
                  רזרבה: {item.plannedTotal - item.startQuantity}
                </div>
              </div>

              <div className="text-sm text-gray-500">
                בקבוקים: {item.bottles.join(", ")}
              </div>
            </div>
          ))}
        </div>

        {/* Table Overrides */}
        <div className="space-y-3">
          <h4 className="font-semibold">שולחנות עם תוספת אלכוהול</h4>

          {plan.tableOverrides.map((table, idx) => (
            <div
              key={idx}
              className="border rounded-xl p-4 bg-gray-50 space-y-2"
            >
              <div className="font-medium">
                שולחן {table.tableNumber} · {table.guests} אורחים
              </div>

              <div className="text-sm">
                {table.extraAlcohol.map((a, i) => (
                  <div key={i}>
                    +{a.quantity} {a.type}
                  </div>
                ))}
              </div>

              {table.notes && (
                <div className="text-xs text-gray-500">
                  הערה: {table.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* =========================
          🔴 LIVE MODE (READY)
      ========================= */}
      <section className="space-y-4 opacity-60">
        <h3 className="font-semibold text-lg">🔴 ניהול אלכוהול – לייב</h3>

        <div className="border rounded-xl p-4 bg-gray-100 text-sm text-gray-600">
          מצב זה ייפתח ביום האירוע:
          <ul className="list-disc pr-6 mt-2">
            <li>פתיחת בקבוק בפועל</li>
            <li>מעקב לפי מיקום (בר / שולחן / מחסן)</li>
            <li>הוספות לשולחנות</li>
            <li>חריגות בזמן אמת</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

/* =========================
   HELPERS
========================= */

function Field({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}

function updateGeneralAlcohol(plan, setPlan, id, field, value) {
  setPlan({
    ...plan,
    generalAlcohol: plan.generalAlcohol.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ),
  });
}
