import { useState } from "react";
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

function SortableCard({ item, updateItem }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-4 border rounded-xl px-4 py-3 bg-white cursor-grab active:cursor-grabbing"
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
    </div>
  );
}

export default function LogisticsTab() {
  const [timeline, setTimeline] = useState([
    { id: "1", time: "14:00", title: "הגעת אולם", status: "pending", source: "supplier" },
    { id: "2", time: "15:30", title: "הגעת DJ", status: "missing", source: "supplier" },
    { id: "3", time: "18:00", title: "קבלת פנים", status: "pending", source: "template" },
    { id: "4", time: "19:30", title: "חופה", status: "pending", source: "template" },
  ]);

  const [newItem, setNewItem] = useState({ time: "", title: "" });

  const updateItem = (id, field, value) => {
    setTimeline((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addTimelineItem = () => {
    if (!newItem.time || !newItem.title) return;

    setTimeline((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        time: newItem.time,
        title: newItem.title,
        status: "pending",
        source: "manual",
      },
    ]);
    setNewItem({ time: "", title: "" });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setTimeline((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">
          🚚 לוגיסטיקה – לו״ז יום האירוע
        </h3>
        <p className="text-sm text-gray-500">
          גרירה משנה סדר · הציר מתעדכן אוטומטית
        </p>
      </div>

      {/* Timeline with axis */}
      <div className="relative">
        {/* Axis */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200" />

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={timeline.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {timeline.map((item, index) => (
                <div key={item.id} className="relative flex items-start gap-6">
                  {/* Axis dot + time */}
                  <div className="w-1/4 flex justify-end pr-6">
                    <div className="text-sm text-gray-500 font-mono">
                      {item.time}
                    </div>
                  </div>

                  <div className="relative z-10 w-3 h-3 mt-3 rounded-full bg-purple-600" />

                  {/* Card */}
                  <div className="w-3/4">
                    <SortableCard
                      item={item}
                      updateItem={updateItem}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Add item */}
      <div className="flex items-center gap-3">
        <input
          type="time"
          value={newItem.time}
          onChange={(e) =>
            setNewItem((p) => ({ ...p, time: e.target.value }))
          }
          className="border rounded-lg px-2 py-1 text-sm"
        />
        <input
          placeholder="הוסף שלב ללוז (החלפת שמלה, נאום...)"
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

      {/* Notes */}
      <div className="bg-white rounded-2xl border p-6 space-y-3">
        <h4 className="font-medium text-sm text-gray-700">
          📝 הערות לוגיסטיות
        </h4>
        <textarea
          rows={4}
          className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          placeholder="כניסת ספקים משער אחורי, חניה מוגבלת, סדר חופה מיוחד…"
        />
      </div>
    </div>
  );
}
