import { useState } from "react";

const STATUS_META = {
  pending: {
    label: "מתוכנן",
    class: "bg-yellow-100 text-yellow-700",
  },
  missing: {
    label: "לא מאושר",
    class: "bg-red-100 text-red-700",
  },
  done: {
    label: "בוצע",
    class: "bg-green-100 text-green-700",
  },
};

export default function LogisticsTab() {
  const [timeline, setTimeline] = useState([
    {
      id: 1,
      time: "14:00",
      title: "הגעת אולם",
      status: "pending",
      source: "supplier",
    },
    {
      id: 2,
      time: "15:30",
      title: "הגעת DJ",
      status: "missing",
      source: "supplier",
    },
    {
      id: 3,
      time: "18:00",
      title: "קבלת פנים",
      status: "pending",
      source: "template",
    },
    {
      id: 4,
      time: "19:30",
      title: "חופה",
      status: "pending",
      source: "template",
    },
  ]);

  const [newItem, setNewItem] = useState({
    time: "",
    title: "",
  });

  const addTimelineItem = () => {
    if (!newItem.time || !newItem.title) return;

    setTimeline((prev) => [
      ...prev,
      {
        id: Date.now(),
        time: newItem.time,
        title: newItem.title,
        status: "pending",
        source: "manual",
      },
    ]);

    setNewItem({ time: "", title: "" });
  };

  const updateItem = (id, field, value) => {
    setTimeline((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  return (
    <div className="max-w-5xl space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          🚚 לוגיסטיקה – לו״ז יום האירוע
        </h3>
        <span className="text-sm text-gray-500">
          מבוסס ספקים + תבנית אירוע + תוספות מפיק
        </span>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border p-6 space-y-5">
        <h4 className="font-medium text-sm text-gray-700">
          ⏱ Timeline תפעולי
        </h4>

        <div className="space-y-3">
          {timeline
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 border rounded-xl px-4 py-3"
              >
                {/* Time */}
                <input
                  type="time"
                  value={item.time}
                  onChange={(e) =>
                    updateItem(item.id, "time", e.target.value)
                  }
                  className="border rounded-lg px-2 py-1 text-sm"
                />

                {/* Title */}
                <input
                  value={item.title}
                  onChange={(e) =>
                    updateItem(item.id, "title", e.target.value)
                  }
                  className="flex-1 border rounded-lg px-3 py-1 text-sm"
                />

                {/* Source */}
                <span className="text-xs text-gray-500">
                  {item.source === "supplier"
                    ? "ספק"
                    : item.source === "template"
                    ? "תבנית"
                    : "ידני"}
                </span>

                {/* Status */}
                <select
                  value={item.status}
                  onChange={(e) =>
                    updateItem(item.id, "status", e.target.value)
                  }
                  className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_META[item.status].class}`}
                >
                  <option value="pending">מתוכנן</option>
                  <option value="missing">לא מאושר</option>
                  <option value="done">בוצע</option>
                </select>
              </div>
            ))}
        </div>

        {/* Add new item */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <input
            type="time"
            value={newItem.time}
            onChange={(e) =>
              setNewItem((p) => ({ ...p, time: e.target.value }))
            }
            className="border rounded-lg px-2 py-1 text-sm"
          />
          <input
            placeholder="הוסף שלב ללוז (החלפת שמלה, נאום, ריקוד מיוחד...)"
            value={newItem.title}
            onChange={(e) =>
              setNewItem((p) => ({ ...p, title: e.target.value }))
            }
            className="flex-1 border rounded-lg px-3 py-1 text-sm"
          />
          <button
            onClick={addTimelineItem}
            className="bg-purple-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            הוספה
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border p-6 space-y-3">
        <h4 className="font-medium text-sm text-gray-700">
          📝 הערות לוגיסטיות
        </h4>
        <textarea
          rows={4}
          className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          placeholder="כניסת ספקים משער אחורי, חניה מוגבלת אחרי 17:00, גיבוי חשמל, סדר חופה מיוחד…"
        />
      </div>
    </div>
  );
}
