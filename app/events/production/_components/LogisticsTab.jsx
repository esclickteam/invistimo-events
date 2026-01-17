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
    <svg width="16" height="16" viewBox="0 0 16 16">
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
    <svg width="16" height="16" viewBox="0 0 24 24">
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

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        d="M22 16.9v3a2 2 0 0 1-2.18 2
        19.8 19.8 0 0 1-8.63-3.07
        19.5 19.5 0 0 1-6-6
        19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3
        a2 2 0 0 1 2 1.72
        12.8 12.8 0 0 0 .7 2.81
        2 2 0 0 1-.45 2.11L8.09 9.91
        a16 16 0 0 0 6 6l1.27-1.27
        a2 2 0 0 1 2.11-.45
        12.8 12.8 0 0 0 2.81.7
        A2 2 0 0 1 22 16.9z"
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
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="grid grid-cols-[84px_24px_1fr] gap-4">
      {/* time */}
      <div className="pt-4 text-right font-mono text-sm text-slate-500">
        {item.time || "--:--"}
      </div>

      {/* axis */}
      <div className="flex justify-center">
        <div className="mt-5 h-3 w-3 rounded-full bg-purple-600" />
      </div>

      {/* card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* drag */}
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="h-9 w-9 rounded-xl border flex items-center justify-center"
          >
            <GripIcon />
          </button>

          {/* time edit */}
          <input
            type="time"
            value={item.time}
            onChange={(e) => updateItem(item.id, "time", e.target.value)}
            className="h-9 rounded-xl border px-3 text-sm"
          />

          {/* title */}
          <input
            value={item.title}
            onChange={(e) => updateItem(item.id, "title", e.target.value)}
            className="flex-1 h-9 rounded-xl border px-3 text-sm"
            placeholder="שם השלב"
          />

          {/* phone – חדש */}
          <input
            value={item.phone || ""}
            onChange={(e) => updateItem(item.id, "phone", e.target.value)}
            placeholder="טלפון"
            className="h-9 w-36 rounded-xl border px-3 text-sm"
          />

          {/* quick call – חדש */}
          {item.phone && (
            <a
              href={`tel:${item.phone}`}
              className="h-9 w-9 rounded-xl border flex items-center justify-center text-emerald-600 hover:bg-emerald-50"
              title="חיוג מהיר"
            >
              <PhoneIcon />
            </a>
          )}

          {/* status */}
          <select
            value={item.status}
            onChange={(e) => updateItem(item.id, "status", e.target.value)}
            className={`h-9 rounded-xl px-3 text-xs font-semibold ${STATUS_META[item.status].pill}`}
          >
            <option value="pending">מתוכנן</option>
            <option value="missing">לא מאושר</option>
            <option value="done">בוצע</option>
          </select>

          {/* delete */}
          <button
            onClick={() => deleteItem(item.id)}
            className="h-9 w-9 rounded-xl border text-rose-600"
          >
            <TrashIcon />
          </button>
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
    {
      id: "1",
      time: "14:00",
      title: "הגעת ספק מרכזי",
      status: "pending",
      source: "supplier",
      phone: "0501234567",
    },
    {
      id: "2",
      time: "16:00",
      title: "קליטת משתתפים / קבלת קהל",
      status: "pending",
      source: "template",
    },
    {
      id: "3",
      time: "18:00",
      title: "שלב מרכזי באירוע",
      status: "missing",
      source: "template",
    },
  ]);

  const [newItem, setNewItem] = useState({
    time: "",
    title: "",
    source: "manual",
    phone: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
        source: newItem.source,
        phone: newItem.phone,
      },
    ]);
    setNewItem({ time: "", title: "", source: "manual", phone: "" });
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setTimeline((items) =>
      arrayMove(
        items,
        items.findIndex((i) => i.id === active.id),
        items.findIndex((i) => i.id === over.id)
      )
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
    </div>
  );
}
