import { useMemo, useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const STATUS_META = {
  pending: { label: "מתוכנן", class: "bg-yellow-100 text-yellow-700" },
  missing: { label: "לא מאושר", class: "bg-red-100 text-red-700" },
  done: { label: "בוצע", class: "bg-green-100 text-green-700" },
};

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="5" cy="4" r="1.1" />
      <circle cx="11" cy="4" r="1.1" />
      <circle cx="5" cy="8" r="1.1" />
      <circle cx="11" cy="8" r="1.1" />
      <circle cx="5" cy="12" r="1.1" />
      <circle cx="11" cy="12" r="1.1" />
    </svg>
  );
}

function SortableRow({ item, updateItem, deleteItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[84px_24px_1fr] items-start gap-4"
    >
      {/* Time column (display only) */}
      <div className="text-sm text-gray-500 font-mono text-right pt-3">
        {item.time || "--:--"}
      </div>

      {/* Axis dot */}
      <div className="flex justify-center">
        <div className="w-3 h-3 mt-4 rounded-full bg-purple-600 z-10" />
      </div>

      {/* Card */}
      <div className="bg-white border rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Drag handle ONLY */}
          <button
            type="button"
            className="shrink-0 w-9 h-9 rounded-lg border bg-white hover:bg-gray-50 text-gray-600 flex items-center justify-center cursor-grab active:cursor-grabbing"
            title="גרור לשינוי סדר"
            {...attributes}
            {...listeners}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <GripIcon />
          </button>

          {/* Time (editable) */}
          <input
            type="time"
            value={item.time}
            onChange={(e) => updateItem(item.id, "time", e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="border rounded-lg px-2 py-1 text-sm"
          />

          {/* Title (editable) */}
          <input
            value={item.title}
            onChange={(e) => updateItem(item.id, "title", e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="שם השלב (טקס, תוכן, הפסקה...)"
            className="flex-1 border rounded-lg px-3 py-1 text-sm"
          />

          {/* Source */}
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {item.source === "supplier"
              ? "ספק"
              : item.source === "template"
              ? "תבנית"
              : "ידני"}
          </span>

          {/* Status (editable) */}
          <select
            value={item.status}
            onChange={(e) => updateItem(item.id, "status", e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_META[item.status]?.class}`}
          >
            <option value="pending">מתוכנן</option>
            <option value="missing">לא מאושר</option>
            <option value="done">בוצע</option>
          </select>

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteItem(item.id);
            }}
            className="shrink-0 w-9 h-9 rounded-lg border bg-white hover:bg-red-50 text-red-500 hover:text-red-700 flex items-center justify-center"
            title="מחק שלב"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LogisticsTab() {
  const [timeline, setTimeline] = useState([
    { id: "1", time: "14:00", title: "הגעת ספק מרכזי", status: "pending", source: "supplier" },
    { id: "2", time: "16:00", title: "קליטת משתתפים / קבלת קהל", status: "pending", source: "template" },
    { id: "3", time: "18:00", title: "שלב מרכזי באירוע", status: "pending", source: "template" },
  ]);

  const [newItem, setNewItem] = useState({ time: "", title: "" });

  const ids = useMemo(() => timeline.map((t) => t.id), [timeline]);

  const updateItem = (id, field, value) => {
    setTimeline((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const deleteItem = (id) => {
    setTimeline((prev) => prev.filter((it) => it.id !== id));
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
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="text-center">
        <h3 className="text-xl font-semibold">🚚 לוגיסטיקה – לו״ז יום האירוע</h3>
        <p className="text-sm text-gray-500">
          עריכה חופשית · מחיקה · גרירה לשינוי סדר (דרך הידית)
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200" />

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-8">
              {timeline.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  updateItem={updateItem}
                  deleteItem={deleteItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Add */}
      <div className="flex items-center gap-3">
        <input
          type="time"
          value={newItem.time}
          onChange={(e) => setNewItem((p) => ({ ...p, time: e.target.value }))}
          className="border rounded-lg px-2 py-1 text-sm"
        />
        <input
          value={newItem.title}
          onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))}
          placeholder="הוסף שלב (טקס, תוכן, הפסקה, נאום...)"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addTimelineItem}
          className="bg-purple-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          הוספה
        </button>
      </div>

      {/* Notes */}
      <div className="bg-white border rounded-2xl p-6 space-y-3">
        <h4 className="font-medium text-sm text-gray-700">📝 הערות לוגיסטיות</h4>
        <textarea
          rows={4}
          className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          placeholder="כניסות מיוחדות, רצף לא שגרתי, דרישות טכניות, הערות למפיק…"
        />
      </div>
    </div>
  );
}
