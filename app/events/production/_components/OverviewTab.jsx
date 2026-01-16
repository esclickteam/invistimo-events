"use client";

import { useMemo } from "react";

export default function OverviewTab() {
  // 🔧 בהמשך יגיע מ־DB / Context
  const budgetTotal = 120000;
  const spent = 86500;
  const remaining = budgetTotal - spent;

  const meetings = [
    {
      id: 1,
      title: "פגישה עם הזוג",
      date: "היום",
      time: "18:00",
      type: "couple",
    },
    {
      id: 2,
      title: "אולם – סגירה",
      date: "מחר",
      time: "11:00",
      type: "supplier",
    },
    {
      id: 3,
      title: "צלם",
      date: "ה׳",
      time: "16:00",
      type: "supplier",
    },
  ];

  const urgentItems = [
    "הסעות לא סגורות",
    "DJ – אין מקדמה",
  ];

  const progress = Math.round((spent / budgetTotal) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border rounded-2xl p-5 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">
            חתונה | 14.09
          </h2>
          <p className="text-sm text-gray-500">
            🟢 האירוע בשליטה · 42 ימים לאירוע
          </p>
        </div>

        <div className="text-sm text-gray-600">
          ⏰ השבוע: {meetings.length} פגישות
        </div>
      </div>

      {/* Middle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Urgent */}
        <div className="border rounded-2xl p-5">
          <h3 className="font-semibold mb-3">
            ⚠️ דורש טיפול
          </h3>

          {urgentItems.length === 0 ? (
            <p className="text-sm text-gray-500">
              אין נושאים דחופים 🎉
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {urgentItems.map((item, i) => (
                <li key={i} className="text-red-600">
                  • {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Meetings */}
        <div className="border rounded-2xl p-5">
          <h3 className="font-semibold mb-3">
            📅 פגישות קרובות
          </h3>

          <ul className="space-y-3 text-sm">
            {meetings.map((m) => (
              <li
                key={m.id}
                className="flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-gray-500">
                    {m.date} · {m.time}
                  </p>
                </div>

                <span
                  className={`text-xs px-2 py-1 rounded ${
                    m.type === "couple"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {m.type === "couple" ? "זוג" : "ספק"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Budget */}
      <div className="border rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold">💰 תקציב</h3>

        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-black h-3"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span>מנוצל: ₪{spent.toLocaleString()}</span>
          <span className="font-semibold text-green-600">
            נשאר: ₪{remaining.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
