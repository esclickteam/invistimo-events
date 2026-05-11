"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Plus,
  GripVertical,
  Trash2,
  Pencil,
  CalendarDays,
  Package,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ListChecks,
} from "lucide-react";

const STATUS_META = {
  pending: {
    label: "מתוכנן",
    className: "bg-blue-50 text-blue-700 border-blue-100",
  },
  missing: {
    label: "בתהליך",
    className: "bg-orange-50 text-orange-700 border-orange-100",
  },
  done: {
    label: "הושלם",
    className: "bg-green-50 text-green-700 border-green-100",
  },
};

const EVENT_ICONS = [
  "👥",
  "🚚",
  "🍽️",
  "⭐",
  "🎉",
];

function SortableTimelineRow({ item, index, onUpdate, onDelete }) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
  } = useSortable({ id: item._id });

  const icon = EVENT_ICONS[index % EVENT_ICONS.length];

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="relative grid grid-cols-[92px_1fr] gap-0"
    >
      <div className="relative flex flex-col items-center">
        <div className="z-10 rounded-2xl bg-purple-50 border border-purple-100 px-3 py-2 text-sm font-black text-purple-700">
          {item.time || "--:--"}
        </div>

        <div className="absolute top-11 bottom-[-24px] w-px bg-purple-100" />

        <div className="z-10 mt-4 h-3 w-3 rounded-full bg-purple-500 shadow-[0_0_0_6px_rgba(124,58,237,0.12)]" />
      </div>

      <div className="mb-4 rounded-[24px] border border-gray-100 bg-white shadow-[0_14px_40px_rgba(30,27,46,0.05)] p-4">
        <div className="flex items-center gap-4">
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="cursor-grab text-gray-400 hover:text-purple-600"
          >
            <GripVertical size={20} />
          </button>

          <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-xl">
            {icon}
          </div>

          <div className="flex-1">
            <input
              value={item.title || ""}
              onChange={(e) =>
                onUpdate(item._id, { title: e.target.value })
              }
              className="w-full bg-transparent outline-none text-lg font-black text-[#1E1B2E]"
              placeholder="שם האירוע"
            />

            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
              <Clock3 size={13} />
              יום האירוע
            </div>
          </div>

          <input
            type="time"
            value={item.time || ""}
            onChange={(e) =>
              onUpdate(item._id, { time: e.target.value })
            }
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
          />

          <button
            onClick={() => onDelete(item._id)}
            className="h-10 w-10 rounded-xl border border-red-100 bg-red-50 text-red-600 flex items-center justify-center"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableLogisticsRow({ item, onUpdate, onDelete }) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
  } = useSortable({ id: item._id });

  const meta = STATUS_META[item.status] || STATUS_META.pending;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="rounded-[22px] border border-gray-100 bg-white shadow-[0_10px_30px_rgba(30,27,46,0.04)] p-4"
    >
      <div className="flex items-center gap-4">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-400 hover:text-purple-600"
        >
          <GripVertical size={20} />
        </button>

        <div className="h-11 w-11 rounded-2xl bg-stone-100 flex items-center justify-center text-[#7A4A35]">
          <Package size={20} />
        </div>

        <input
          value={item.title || ""}
          onChange={(e) =>
            onUpdate(item._id, { title: e.target.value })
          }
          className="flex-1 bg-transparent outline-none font-bold text-[#1E1B2E]"
          placeholder="שם השלב"
        />

        <select
          value={item.status || "pending"}
          onChange={(e) =>
            onUpdate(item._id, { status: e.target.value })
          }
          className={`rounded-full border px-3 py-1.5 text-xs font-bold outline-none ${meta.className}`}
        >
          {Object.keys(STATUS_META).map((status) => (
            <option key={status} value={status}>
              {STATUS_META[status].label}
            </option>
          ))}
        </select>

        <input
          type="time"
          value={item.time || ""}
          onChange={(e) =>
            onUpdate(item._id, { time: e.target.value })
          }
          className="w-[110px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
        />

        <button
          onClick={() => onDelete(item._id)}
          className="h-10 w-10 rounded-xl border border-red-100 bg-red-50 text-red-600 flex items-center justify-center"
        >
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
}

export default function LogisticsTab({ eventId }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newLogistic, setNewLogistic] = useState({
    time: "",
    title: "",
    status: "pending",
    type: "logistics",
  });

  const [newEvent, setNewEvent] = useState({
    time: "",
    title: "",
    status: "pending",
    type: "event",
  });

  useEffect(() => {
    if (!eventId) return;

    async function load() {
      setLoading(true);

      try {
        const res = await fetch(`/api/events/${eventId}/logistics`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (data.success) {
          setSteps(data.steps || []);
        }
      } catch (err) {
        console.error("LOGISTICS LOAD ERROR:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [eventId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const logisticsSteps = useMemo(
    () => steps.filter((s) => s.type !== "event"),
    [steps]
  );

  const eventSteps = useMemo(
    () => steps.filter((s) => s.type === "event"),
    [steps]
  );

  const logisticsIds = useMemo(
    () => logisticsSteps.map((s) => s._id),
    [logisticsSteps]
  );

  const eventIds = useMemo(
    () => eventSteps.map((s) => s._id),
    [eventSteps]
  );

  async function addStep(payload, reset) {
    if (!payload.title?.trim()) return;

    const res = await fetch(`/api/events/${eventId}/logistics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success) {
      setSteps((prev) => [...prev, data.step]);
      reset();
    }
  }

  async function updateStep(id, patch) {
    setSteps((prev) =>
      prev.map((s) => (s._id === id ? { ...s, ...patch } : s))
    );

    try {
      await fetch(`/api/logistics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch (err) {
      console.error("UPDATE LOGISTICS ERROR:", err);
    }
  }

  async function deleteStep(id) {
    if (!confirm("למחוק את השלב?")) return;

    setSteps((prev) => prev.filter((s) => s._id !== id));

    try {
      await fetch(`/api/logistics/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("DELETE LOGISTICS ERROR:", err);
    }
  }

  function handleDragEnd(type) {
    return async ({ active, over }) => {
      if (!over || active.id === over.id) return;

      setSteps((items) => {
        const group = items.filter((s) =>
          type === "event" ? s.type === "event" : s.type !== "event"
        );

        const other = items.filter((s) =>
          type === "event" ? s.type !== "event" : s.type === "event"
        );

        const oldIndex = group.findIndex((i) => i._id === active.id);
        const newIndex = group.findIndex((i) => i._id === over.id);

        const reorderedGroup = arrayMove(group, oldIndex, newIndex);

        reorderedGroup.forEach((s, index) => {
          fetch(`/api/logistics/${s._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: index }),
          });
        });

        return type === "event"
          ? [...other, ...reorderedGroup]
          : [...reorderedGroup, ...other];
      });
    };
  }

  if (loading) {
    return (
      <div className="py-40 text-center text-gray-400">
        טוען לוגיסטיקה...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="max-w-7xl mx-auto px-6 py-10 space-y-10"
    >
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-4 py-2 text-sm font-bold text-[#7A4A35]">
          <Sparkles size={16} />
          ניהול האירוע
        </div>

        <h1 className="text-4xl font-black text-[#1E1B2E]">
          ✨ ניהול לוגיסטיקה ולוח האירוע ✨
        </h1>

        <p className="text-gray-500">
          ארגון כל השלבים החשובים במקום אחד
        </p>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* RIGHT - EVENT TIMELINE */}
        <section className="rounded-[34px] border border-stone-200 bg-white/85 backdrop-blur-xl p-7 shadow-[0_22px_70px_rgba(30,27,46,0.08)]">
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-[#F5E7DC] text-[#7A4A35] flex items-center justify-center">
                <CalendarDays size={24} />
              </div>

              <div>
                <h2 className="text-2xl font-black text-[#1E1B2E]">
                  לוח האירוע
                </h2>
                <p className="text-sm text-gray-500">
                  סדר האירועים לפי שעות
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-3 mb-7">
            <input
              type="time"
              value={newEvent.time}
              onChange={(e) =>
                setNewEvent((p) => ({ ...p, time: e.target.value }))
              }
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none"
            />

            <input
              value={newEvent.title}
              onChange={(e) =>
                setNewEvent((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="שם האירוע בלו״ז"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none"
            />

            <button
              onClick={() =>
                addStep(newEvent, () =>
                  setNewEvent({
                    time: "",
                    title: "",
                    status: "pending",
                    type: "event",
                  })
                )
              }
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-500 text-white px-5 py-3 font-bold shadow-[0_12px_30px_rgba(124,58,237,0.25)]"
            >
              <span className="flex items-center gap-2">
                <Plus size={17} />
                הוסף אירוע
              </span>
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd("event")}
          >
            <SortableContext
              items={eventIds}
              strategy={verticalListSortingStrategy}
            >
              <div>
                {eventSteps.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
                    עדיין אין אירועים בלו״ז
                  </div>
                ) : (
                  eventSteps.map((item, index) => (
                    <SortableTimelineRow
                      key={item._id}
                      item={item}
                      index={index}
                      onUpdate={updateStep}
                      onDelete={deleteStep}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        {/* LEFT - LOGISTICS */}
        <section className="rounded-[34px] border border-stone-200 bg-white/85 backdrop-blur-xl p-7 shadow-[0_22px_70px_rgba(30,27,46,0.08)]">
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-[#F5E7DC] text-[#7A4A35] flex items-center justify-center">
                <ListChecks size={24} />
              </div>

              <div>
                <h2 className="text-2xl font-black text-[#1E1B2E]">
                  לוגיסטיקה
                </h2>
                <p className="text-sm text-gray-500">
                  משימות, ספקים והכנות לפני האירוע
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-3 mb-7">
            <input
              type="time"
              value={newLogistic.time}
              onChange={(e) =>
                setNewLogistic((p) => ({ ...p, time: e.target.value }))
              }
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none"
            />

            <input
              value={newLogistic.title}
              onChange={(e) =>
                setNewLogistic((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="מה נדרש לארגן?"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none"
            />

            <button
              onClick={() =>
                addStep(newLogistic, () =>
                  setNewLogistic({
                    time: "",
                    title: "",
                    status: "pending",
                    type: "logistics",
                  })
                )
              }
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-500 text-white px-5 py-3 font-bold shadow-[0_12px_30px_rgba(124,58,237,0.25)]"
            >
              <span className="flex items-center gap-2">
                <Plus size={17} />
                הוסף שלב
              </span>
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd("logistics")}
          >
            <SortableContext
              items={logisticsIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {logisticsSteps.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
                    עדיין אין שלבים לוגיסטיים
                  </div>
                ) : (
                  logisticsSteps.map((item) => (
                    <SortableLogisticsRow
                      key={item._id}
                      item={item}
                      onUpdate={updateStep}
                      onDelete={deleteStep}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      </div>

      <div className="mx-auto max-w-xl rounded-3xl border border-stone-200 bg-[#FFF8F1] px-6 py-4 text-center text-sm text-[#7A4A35] shadow-sm">
        💡 טיפ: אפשר לגרור שלבים כדי לסדר את הסדר, לערוך שעה/שם ולמחוק מה שלא רלוונטי.
      </div>
    </div>
  );
}