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

/* =====================
   UI META
===================== */
const STATUS_META = {
  pending: { label: "מתוכנן" },
  missing: { label: "לא מאושר" },
  done: { label: "בוצע" },
};

/* =====================
   Sortable Row
===================== */
function SortableRow({ item, onUpdate, onDelete }) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
  } = useSortable({ id: item._id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="grid grid-cols-[80px_1fr] gap-4 items-start"
    >
      <div className="text-sm text-slate-500 pt-4">
        {item.time || "--:--"}
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-2">
        <div className="flex gap-2 items-center">
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="cursor-grab px-2"
          >
            ⠿
          </button>

          <input
            type="time"
            value={item.time || ""}
            onChange={(e) =>
              onUpdate(item._id, { time: e.target.value })
            }
            className="border rounded px-2"
          />

          <input
            value={item.title}
            onChange={(e) =>
              onUpdate(item._id, { title: e.target.value })
            }
            className="flex-1 border rounded px-2"
          />

          <select
            value={item.status}
            onChange={(e) =>
              onUpdate(item._id, { status: e.target.value })
            }
            className="border rounded px-2"
          >
            {Object.keys(STATUS_META).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>

          <button
            onClick={() => onDelete(item._id)}
            className="text-red-500"
          >
            🗑
          </button>
        </div>

        {item.phone && (
          <div className="text-xs text-slate-500">
            📞 <a href={`tel:${item.phone}`}>{item.phone}</a>
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================
   Main
===================== */
export default function LogisticsTab({ eventId }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ time: "", title: "" });

  /* ---------- Load ---------- */
  useEffect(() => {
    if (!eventId) return;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}/logistics`, {
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("❌ logistics GET failed:", res.status);
          return;
        }

        const data = await res.json();
        if (data.success) setSteps(data.steps);
      } catch (err) {
        console.error("❌ logistics load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [eventId]);

  /* ---------- Sensors ---------- */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const ids = useMemo(() => steps.map((s) => s._id), [steps]);

  /* ---------- API Actions ---------- */
  async function addStep() {
    if (!newItem.title) return;

    const res = await fetch(`/api/events/${eventId}/logistics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });

    const data = await res.json();
    if (data.success) {
      setSteps((p) => [...p, data.step]);
      setNewItem({ time: "", title: "" });
    }
  }

  async function updateStep(id, patch) {
    setSteps((p) =>
      p.map((s) => (s._id === id ? { ...s, ...patch } : s))
    );

    try {
      const res = await fetch(`/api/logistics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        console.error("❌ updateStep failed:", res.status);
      }
    } catch (err) {
      console.error("❌ updateStep error:", err);
    }
  }

  async function deleteStep(id) {
    // optimistic delete
    setSteps((p) => p.filter((s) => s._id !== id));

    try {
      const res = await fetch(`/api/logistics/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("❌ deleteStep failed:", res.status);
      }
    } catch (err) {
      console.error("❌ deleteStep error:", err);
    }
  }

  async function syncSuppliers() {
    try {
      const res = await fetch(
        `/api/events/${eventId}/logistics/sync-suppliers`,
        { method: "POST" }
      );

      if (!res.ok) {
        console.error("❌ sync suppliers failed:", res.status);
        return;
      }

      const data = await res.json();
      if (data.success) setSteps(data.steps);
    } catch (err) {
      console.error("❌ sync suppliers error:", err);
    }
  }

  /* ---------- Drag ---------- */
  async function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;

    setSteps((items) => {
      const oldIndex = items.findIndex((i) => i._id === active.id);
      const newIndex = items.findIndex((i) => i._id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);

      reordered.forEach((s, i) => {
        fetch(`/api/logistics/${s._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: i }),
        });
      });

      return reordered;
    });
  }

  if (loading) return <div className="p-10">טוען לוז…</div>;

  /* ---------- Render ---------- */
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between">
        <h2 className="text-xl font-semibold">לו״ז לוגיסטי</h2>
        <button
          onClick={syncSuppliers}
          className="border rounded px-3 py-1"
        >
          סנכרון מספקים
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {steps.map((item) => (
              <SortableRow
                key={item._id}
                item={item}
                onUpdate={updateStep}
                onDelete={deleteStep}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="border rounded p-4 space-y-2">
        <h4 className="font-medium">הוספת שלב</h4>

        <input
          type="time"
          value={newItem.time}
          onChange={(e) =>
            setNewItem((p) => ({ ...p, time: e.target.value }))
          }
          className="border rounded px-2"
        />

        <input
          value={newItem.title}
          onChange={(e) =>
            setNewItem((p) => ({ ...p, title: e.target.value }))
          }
          className="border rounded px-2 w-full"
          placeholder="שם השלב"
        />

        <button
          onClick={addStep}
          className="bg-purple-600 text-white rounded px-3 py-1"
        >
          הוסף
        </button>
      </div>
    </div>
  );
}
