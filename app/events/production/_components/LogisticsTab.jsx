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
  Clock3,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Sparkles,
} from "lucide-react";

/* =========================
   STATUS
========================= */

const STATUS_META = {
  pending: {
    label: "מתוכנן",
    color:
      "bg-blue-50 text-blue-700 border-blue-100",
  },

  missing: {
    label: "לא מאושר",
    color:
      "bg-orange-50 text-orange-700 border-orange-100",
  },

  done: {
    label:
      "בוצע",
    color:
      "bg-green-50 text-green-700 border-green-100",
  },
};

/* =========================
   SORTABLE ROW
========================= */

function SortableRow({
  item,
  onUpdate,
  onDelete,
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
  } = useSortable({
    id: item._id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform:
          CSS.Transform.toString(
            transform
          ),
        transition,
      }}
      className="
        relative
        flex
        gap-5
      "
    >
      {/* TIMELINE */}
      <div className="flex flex-col items-center">

        <div
          className="
            h-14
            w-14
            rounded-2xl
            bg-white
            border
            border-purple-100
            shadow-sm
            flex
            items-center
            justify-center
            text-[#1E1B2E]
            font-black
            text-sm
          "
        >
          {item.time || "--:--"}
        </div>

        <div className="w-px flex-1 bg-purple-100 mt-2" />
      </div>

      {/* CARD */}
      <div
        className="
          flex-1
          rounded-[28px]
          border
          border-white/60
          bg-white/90
          backdrop-blur-xl
          p-5
          shadow-[0_15px_50px_rgba(124,58,237,0.06)]
        "
      >
        {/* TOP */}
        <div className="flex items-start justify-between gap-4">

          <div className="flex items-start gap-3 flex-1">

            <button
              ref={
                setActivatorNodeRef
              }
              {...attributes}
              {...listeners}
              className="
                mt-1
                cursor-grab
                text-gray-400
              "
            >
              <GripVertical
                size={20}
              />
            </button>

            <div className="flex-1">

              <div className="flex flex-wrap items-center gap-3">

                <div
                  className={`
                    rounded-full
                    border
                    px-3
                    py-1
                    text-xs
                    font-bold
                    ${
                      STATUS_META[
                        item.status
                      ]?.color
                    }
                  `}
                >
                  {
                    STATUS_META[
                      item.status
                    ]?.label
                  }
                </div>

                <div className="text-xs text-gray-400">
                  שלב בלו״ז
                </div>
              </div>

              <input
                value={item.title}
                onChange={(e) =>
                  onUpdate(
                    item._id,
                    {
                      title:
                        e.target
                          .value,
                    }
                  )
                }
                className="
                  w-full
                  mt-4
                  text-2xl
                  font-black
                  text-[#1E1B2E]
                  bg-transparent
                  outline-none
                "
              />

              {item.phone && (
                <div className="mt-4 text-sm text-gray-500">
                  📞{" "}
                  <a
                    href={`tel:${item.phone}`}
                  >
                    {item.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-2">

            <select
              value={item.status}
              onChange={(e) =>
                onUpdate(
                  item._id,
                  {
                    status:
                      e.target
                        .value,
                  }
                )
              }
              className="
                rounded-xl
                border
                border-gray-200
                bg-white
                px-3
                py-2
                text-sm
                outline-none
              "
            >
              {Object.keys(
                STATUS_META
              ).map((s) => (
                <option
                  key={s}
                  value={s}
                >
                  {
                    STATUS_META[
                      s
                    ].label
                  }
                </option>
              ))}
            </select>

            <button
              onClick={() =>
                onDelete(
                  item._id
                )
              }
              className="
                h-11
                w-11
                rounded-2xl
                bg-red-50
                border
                border-red-100
                text-red-600
                flex
                items-center
                justify-center
              "
            >
              <Trash2
                size={18}
              />
            </button>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <p className="text-xs text-gray-400 mb-2">
              שעה
            </p>

            <div
              className="
                flex
                items-center
                gap-2
                rounded-2xl
                border
                border-gray-200
                px-4
                py-3
              "
            >
              <Clock3
                size={16}
                className="text-gray-400"
              />

              <input
                type="time"
                value={
                  item.time ||
                  ""
                }
                onChange={(e) =>
                  onUpdate(
                    item._id,
                    {
                      time:
                        e.target
                          .value,
                    }
                  )
                }
                className="
                  bg-transparent
                  outline-none
                  w-full
                "
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2">
              עריכת שלב
            </p>

            <div
              className="
                flex
                items-center
                gap-2
                rounded-2xl
                border
                border-gray-200
                px-4
                py-3
              "
            >
              <Pencil
                size={16}
                className="text-gray-400"
              />

              <span className="text-sm text-gray-500">
                ניתן לערוך
                את השלב
                בזמן אמת
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   MAIN
========================= */

export default function LogisticsTab({
  eventId,
}) {
  const [steps, setSteps] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [newItem, setNewItem] =
    useState({
      time: "",
      title: "",
    });

  /* =========================
     LOAD
  ========================= */

  useEffect(() => {
    if (!eventId) return;

    async function load() {
      setLoading(true);

      try {
        const res = await fetch(
          `/api/events/${eventId}/logistics`,
          {
            cache:
              "no-store",
          }
        );

        const data =
          await res.json();

        if (data.success) {
          setSteps(
            data.steps
          );
        }
      } catch (err) {
        console.error(
          err
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [eventId]);

  /* =========================
     DND
  ========================= */

  const sensors = useSensors(
    useSensor(
      PointerSensor,
      {
        activationConstraint:
          {
            distance: 8,
          },
      }
    ),

    useSensor(
      KeyboardSensor,
      {
        coordinateGetter:
          sortableKeyboardCoordinates,
      }
    )
  );

  const ids = useMemo(
    () =>
      steps.map(
        (s) => s._id
      ),
    [steps]
  );

  /* =========================
     ADD
  ========================= */

  async function addStep() {
    if (!newItem.title)
      return;

    const res = await fetch(
      `/api/events/${eventId}/logistics`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          newItem
        ),
      }
    );

    const data =
      await res.json();

    if (data.success) {
      setSteps((p) => [
        ...p,
        data.step,
      ]);

      setNewItem({
        time: "",
        title: "",
      });
    }
  }

  /* =========================
     UPDATE
  ========================= */

  async function updateStep(
    id,
    patch
  ) {
    setSteps((p) =>
      p.map((s) =>
        s._id === id
          ? {
              ...s,
              ...patch,
            }
          : s
      )
    );

    await fetch(
      `/api/logistics/${id}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          patch
        ),
      }
    );
  }

  /* =========================
     DELETE
  ========================= */

  async function deleteStep(
    id
  ) {
    setSteps((p) =>
      p.filter(
        (s) =>
          s._id !== id
      )
    );

    await fetch(
      `/api/logistics/${id}`,
      {
        method: "DELETE",
      }
    );
  }

  /* =========================
     DRAG
  ========================= */

  async function handleDragEnd({
    active,
    over,
  }) {
    if (
      !over ||
      active.id === over.id
    )
      return;

    setSteps((items) => {
      const oldIndex =
        items.findIndex(
          (i) =>
            i._id ===
            active.id
        );

      const newIndex =
        items.findIndex(
          (i) =>
            i._id ===
            over.id
        );

      const reordered =
        arrayMove(
          items,
          oldIndex,
          newIndex
        );

      reordered.forEach(
        (s, i) => {
          fetch(
            `/api/logistics/${s._id}`,
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  order:
                    i,
                }
              ),
            }
          );
        }
      );

      return reordered;
    });
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="py-40 text-center text-gray-400">
        טוען לוגיסטיקה...
      </div>
    );
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div
      dir="rtl"
      className="
        max-w-6xl
        mx-auto
        p-6
        space-y-8
      "
    >
      {/* HERO */}
      <section
        className="
          rounded-[36px]
          border
          border-white/60
          bg-white/80
          backdrop-blur-xl
          p-8
          shadow-[0_20px_60px_rgba(124,58,237,0.08)]
        "
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          <div>
            <div className="flex items-center gap-3 mb-3">

              <div
                className="
                  h-14
                  w-14
                  rounded-2xl
                  bg-gradient-to-br
                  from-violet-500
                  to-purple-400
                  flex
                  items-center
                  justify-center
                  text-white
                "
              >
                <Sparkles
                  size={24}
                />
              </div>

              <div>
                <p className="text-sm text-purple-600 font-semibold">
                  Event Logistics
                </p>

                <h1 className="text-3xl font-black text-[#1E1B2E]">
                  ניהול לו״ז
                  ולוגיסטיקה
                </h1>
              </div>
            </div>

            <p className="text-gray-500 leading-7">
              ניהול השלבים
              והמשימות של
              האירוע במקום
              אחד בצורה
              מסודרת ומקצועית.
            </p>
          </div>
        </div>
      </section>

      {/* ADD */}
      <section
        className="
          rounded-[32px]
          border
          border-white/60
          bg-white/80
          backdrop-blur-xl
          p-6
          shadow-[0_15px_50px_rgba(124,58,237,0.05)]
        "
      >
        <div className="flex items-center justify-between mb-5">

          <div>
            <h2 className="text-2xl font-black text-[#1E1B2E]">
              הוספת שלב
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              יצירת שלבים
              חדשים בלו״ז
            </p>
          </div>

          <div
            className="
              h-14
              w-14
              rounded-2xl
              bg-purple-50
              text-violet-600
              flex
              items-center
              justify-center
            "
          >
            <Plus
              size={24}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[160px_1fr_140px] gap-4">

          <input
            type="time"
            value={
              newItem.time
            }
            onChange={(e) =>
              setNewItem(
                (p) => ({
                  ...p,
                  time:
                    e.target
                      .value,
                })
              )
            }
            className="
              rounded-2xl
              border
              border-gray-200
              px-4
              py-4
              outline-none
            "
          />

          <input
            value={
              newItem.title
            }
            onChange={(e) =>
              setNewItem(
                (p) => ({
                  ...p,
                  title:
                    e.target
                      .value,
                })
              )
            }
            placeholder="שם השלב"
            className="
              rounded-2xl
              border
              border-gray-200
              px-4
              py-4
              outline-none
            "
          />

          <button
            onClick={
              addStep
            }
            className="
              rounded-2xl
              bg-gradient-to-r
              from-violet-600
              to-purple-500
              text-white
              font-bold
              shadow-[0_12px_30px_rgba(124,58,237,0.25)]
            "
          >
            הוסף שלב
          </button>
        </div>
      </section>

      {/* TIMELINE */}
      <DndContext
        sensors={sensors}
        collisionDetection={
          closestCenter
        }
        onDragEnd={
          handleDragEnd
        }
      >
        <SortableContext
          items={ids}
          strategy={
            verticalListSortingStrategy
          }
        >
          <div className="space-y-6">

            {steps.map(
              (item) => (
                <SortableRow
                  key={
                    item._id
                  }
                  item={item}
                  onUpdate={
                    updateStep
                  }
                  onDelete={
                    deleteStep
                  }
                />
              )
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* FOOTER */}
      <div
        className="
          rounded-3xl
          border
          border-purple-100
          bg-gradient-to-r
          from-violet-50
          to-purple-50
          p-5
          text-center
        "
      >
        <div className="flex items-center justify-center gap-2 text-[#1E1B2E] font-bold">

          <CheckCircle2
            size={18}
          />

          כל השלבים
          נשמרים בזמן
          אמת ומתעדכנים
          אוטומטית
        </div>
      </div>
    </div>
  );
}