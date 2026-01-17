import { useState } from "react";

export default function LogisticsTab() {
  const [timeline, setTimeline] = useState([
    { time: "14:00", title: "הגעת אולם", status: "pending" },
    { time: "15:30", title: "הגעת DJ", status: "missing" },
    { time: "16:00", title: "עיצוב שולחנות", status: "pending" },
  ]);

  const [logisticsItems, setLogisticsItems] = useState({
    הסעות: false,
    ציוד: true,
    פרחים: true,
    השכרות: false,
  });

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          🚚 לוגיסטיקה – יום האירוע
        </h3>
        <span className="text-sm text-gray-500">
          תכנון ובקרה תפעולית
        </span>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h4 className="font-medium text-sm text-gray-700">
          ⏱ לו״ז יום האירוע
        </h4>

        <div className="space-y-3">
          {timeline.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm text-gray-500">
                  {item.time}
                </span>
                <span className="font-medium">{item.title}</span>
              </div>

              <span
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  item.status === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : item.status === "missing"
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {item.status === "pending"
                  ? "מתוכנן"
                  : item.status === "missing"
                  ? "לא מאושר"
                  : "בוצע"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Logistics checklist */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h4 className="font-medium text-sm text-gray-700">
          📦 רכיבים לוגיסטיים
        </h4>

        <div className="grid grid-cols-2 gap-4">
          {Object.entries(logisticsItems).map(([item, checked]) => (
            <label
              key={item}
              className="flex items-center justify-between border rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50"
            >
              <span className="font-medium">{item}</span>
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  setLogisticsItems((prev) => ({
                    ...prev,
                    [item]: !prev[item],
                  }))
                }
                className="w-4 h-4"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h4 className="font-medium text-sm text-gray-700">
          📝 הערות לוגיסטיות
        </h4>
        <textarea
          rows={4}
          className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          placeholder="כניסת ספקים משער אחורי, חניה מוגבלת אחרי 17:00, גיבוי חשמל…"
        />
      </div>
    </div>
  );
}
