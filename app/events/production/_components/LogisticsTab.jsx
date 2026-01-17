"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* -----------------------------
   UI meta
----------------------------- */
const STATUS_META = {
  pending: { label: "מתוכנן", pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  missing: { label: "לא מאושר", pill: "bg-rose-50 text-rose-700 ring-1 ring-rose-200" },
  done: { label: "בוצע", pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
};

const SOURCE_META = {
  supplier: { label: "ספק", pill: "bg-slate-50 text-slate-600 ring-1 ring-slate-200" },
  template: { label: "תבנית", pill: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" },
  manual: { label: "ידני", pill: "bg-purple-50 text-purple-700 ring-1 ring-purple-200" },
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

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 3h6m-7 4h8m-9 0 1 14h8l1-14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -----------------------------
   Sortable row
----------------------------- */
function SortableRow({ item, updateItem, deleteItem }) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
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
      {/* time column (visual) */}
      <div className="pt-4 text-right font-mono text-sm text-slate-500">
        {item.time || "--:--"}
      </div>

      {/* axis */}
      <div className="relative flex justify-center">
        <div className="mt-5 h-3 w-3 rounded-full bg-purple-600 shadow-[0_0_0_4px_rgba(147,51,234,0.12)]" />
      </div>

      {/* card */}
      <div className="group rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* drag handle (only here) */}
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-grab active:cursor-grabbing"
            title="גרור לשינוי סדר"
          >
            <GripIcon />
          </button>

          {/* editable time */}
          <input
            type="time"
            value={item.time}
            onChange={(e) => updateItem(item.id, "time", e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />

          {/* title */}
          <input
            value={item.title}
            onChange={(e) => updateItem(item.id, "title", e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="שם השלב (טקס, תוכן, הפסקה...)"
            className="h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />

          {/* source */}
          <span
            className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${SOURCE_META[item.source]?.pill}`}
          >
            {SOURCE_META[item.source]?.label}
          </span>

          {/* status */}
          <select
            value={item.status}
            onChange={(e) => updateItem(item.id, "status", e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className={`h-9 rounded-xl px-3 text-xs font-semibold ${STATUS_META[item.status]?.pill} focus:outline-none focus:ring-2 focus:ring-purple-200`}
          >
            <option value="pending">מתוכנן</option>
            <option value="missing">לא מאושר</option>
            <option value="done">בוצע</option>
          </select>

          {/* delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteItem(item.id);
            }}
            className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
            title="מחק שלב"
          >
            <TrashIcon />
          </button>
        </div>

        {/* small footer row (optional polish) */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          <span className="truncate">
            טיפ: גרירה רק דרך הידית • כדי למנוע בלבול עם עריכה
          </span>
          <span className="hidden sm:inline">ID: {item.id}</span>
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
   Main
----------------------------- */
export default function LogisticsTab() {
  const [timeline, setTimeline] = useState([
    { id: "1", time: "14:00", title: "הגעת ספק מרכזי", status: "pending", source: "supplier" },
    { id: "2", time: "16:00", title: "קליטת משתתפים / קבלת קהל", status: "pending", source: "template" },
    { id: "3", time: "18:00", title: "שלב מרכזי באירוע", status: "missing", source: "template" },
  ]);

  const [newItem, setNewItem] = useState({ time: "", title: "", source: "manual" });

  // Sensors = זה מה שמחזיר לך Drag יציב (ובעיקר עם handle)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => timeline.map((t) => t.id), [timeline]);

  const stats = useMemo(() => {
    const total = timeline.length;
    const missing = timeline.filter((x) => x.status === "missing").length;
    const done = timeline.filter((x) => x.status === "done").length;
    const next = timeline
      .filter((x) => x.status !== "done")
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""))[0];
    return { total, missing, done, next };
  }, [timeline]);

  const updateItem = (id, field, value) => {
    setTimeline((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
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
        source: newItem.source,
      },
    ]);
    setNewItem({ time: "", title: "", source: "manual" });
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setTimeline((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12">
      {/* SaaS header */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-slate-200 bg-[#f7f4ef]/80 backdrop-blur px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">לוגיסטיקה · לו״ז יום האירוע</h2>
            <p className="text-sm text-slate-600">
              גרירה לסדר · עריכה חופשית · מחיקה · מתאים לכל סוג אירוע
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => {
                // placeholder future: sync suppliers
                alert("בהמשך: סנכרון מספקים (API) 🙂");
              }}
            >
              סנכרון מספקים
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
              onClick={() => {
                const el = document.getElementById("add-row-title");
                el?.focus?.();
              }}
            >
              הוסף שלב
            </button>
          </div>
        </div>

        {/* summary row */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
            <div className="text-xs text-slate-500">שלבים</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{stats.total}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
            <div className="text-xs text-slate-500">לא מאושרים</div>
            <div className="mt-1 text-lg font-semibold text-rose-700">{stats.missing}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
            <div className="text-xs text-slate-500">הבא בתור</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {stats.next ? `${stats.next.time} · ${stats.next.title}` : "הכל בוצע 🎉"}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline area */}
      <div className="relative rounded-3xl border border-slate-200 bg-white/60 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        {/* axis */}
        <div className="pointer-events-none absolute left-1/2 top-6 bottom-6 w-px bg-slate-200" />

        {timeline.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <div className="text-lg font-semibold text-slate-900">אין עדיין שלבים בלו״ז</div>
            <div className="mt-1 text-sm text-slate-600">הוסיפי שלב ראשון, או סנכרני מספקים</div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
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
        )}

        {/* Add row */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-sm font-semibold text-slate-900">הוספת שלב חדש</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr_160px_120px] sm:items-center">
            <input
              type="time"
              value={newItem.time}
              onChange={(e) => setNewItem((p) => ({ ...p, time: e.target.value }))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <input
              id="add-row-title"
              value={newItem.title}
              onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))}
              placeholder="לדוגמה: טקס / תוכן / הפסקה / תדרוך צוות / החלפה..."
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <select
              value={newItem.source}
              onChange={(e) => setNewItem((p) => ({ ...p, source: e.target.value }))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="manual">ידני</option>
              <option value="template">תבנית</option>
              <option value="supplier">ספק</option>
            </select>
            <button
              type="button"
              onClick={addTimelineItem}
              className="h-10 rounded-xl bg-purple-600 px-4 text-sm font-semibold text-white hover:bg-purple-700"
            >
              הוספה
            </button>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-8 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">📝 הערות לוגיסטיות</h4>
          <span className="text-xs text-slate-500">טיפים, דגשים, כניסות, חניה, גיבויים…</span>
        </div>
        <textarea
          rows={4}
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-200"
          placeholder="כניסת ספקים משער אחורי, חניה מוגבלת, סדר טקס מיוחד, דרישות טכניות…"
        />
      </div>
    </div>
  );
}
