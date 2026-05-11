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
  GripVertical,
  Trash2,
  CalendarDays,
  Package,
  Clock3,
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

const defaultSteps = [
  {
    _id: "default-log-1",
    type: "logistics",
    title: "בחירת אולם וסגירה",
    time: "09:00",
    status: "done",
  },
  {
    _id: "default-log-2",
    type: "logistics",
    title: "ספק קייטרינג",
    time: "11:30",
    status: "missing",
  },
  {
    _id: "default-log-3",
    type: "logistics",
    title: "הזמנת ציוד הגברה ותאורה",
    time: "13:00",
    status: "pending",
  },
  {
    _id: "default-log-4",
    type: "logistics",
    title: "עיצוב והדפסה",
    time: "15:00",
    status: "missing",
  },
  {
    _id: "default-event-1",
    type: "event",
    title: "הגעת צוות והכנות מוקדמות",
    time: "09:00",
    status: "pending",
  },
  {
    _id: "default-event-2",
    type: "event",
    title: "הגעת ספקים והקמה",
    time: "14:30",
    status: "pending",
  },
  {
    _id: "default-event-3",
    type: "event",
    title: "קבלת פנים ואירוח",
    time: "18:00",
    status: "pending",
  },
  {
    _id: "default-event-4",
    type: "event",
    title: "טקס מרכזי",
    time: "20:00",
    status: "pending",
  },
  {
    _id: "default-event-5",
    type: "event",
    title: "סיום האירוע",
    time: "23:00",
    status: "pending",
  },
];

function TimelineRow({
  item,
  onUpdate,
  onDelete,
}) {
  const {
    setNodeRef,
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
        items-center
        gap-3
        rounded-[26px]
        border
        border-[#F0ECE7]
        bg-[#FCFBFA]
        px-4
        py-4
        overflow-hidden
      "
    >
      {/* DRAG */}

      <button
        {...attributes}
        {...listeners}
        className="
          text-gray-400
          cursor-grab
          shrink-0
        "
      >
        <GripVertical
          size={18}
        />
      </button>

      {/* ICON */}

      <div
        className="
          h-11
          w-11
          rounded-2xl
          bg-purple-50
          flex
          items-center
          justify-center
          shrink-0
        "
      >
        🎉
      </div>

      {/* TITLE + TIME */}

      <div className="flex-1 min-w-0 overflow-hidden text-right">

        {/* TIME */}

        <div
          className="
            flex
            items-center
            justify-end
            gap-2
            mb-1
          "
        >
          <Clock3
            size={12}
            className="text-gray-400"
          />

          <input
            type="time"
            value={item.time}
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
              text-[11px]
              text-gray-500
              w-[58px]
            "
          />
        </div>

        {/* TITLE */}

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
            bg-transparent
            outline-none
            text-[15px]
            font-bold
            text-[#1E1B2E]
            text-right
            truncate
          "
        />

        {/* SUBTITLE */}

        <div
          className="
            text-[10px]
            text-gray-400
            mt-1
            whitespace-nowrap
          "
        >
          יום האירוע
        </div>
      </div>

      {/* STATUS */}

      <select
        value={item.status}
        onChange={(e) =>
          onUpdate(item._id, {
            status:
              e.target.value,
          })
        }
        className={`
          w-[110px]
          shrink-0
          rounded-full
          border
          px-3
          py-2
          text-xs
          font-bold
          outline-none
          ${
            STATUS_META[
              item.status
            ]?.className
          }
        `}
      >
        {Object.keys(
          STATUS_META
        ).map((key) => (
          <option
            key={key}
            value={key}
          >
            {
              STATUS_META[key]
                .label
            }
          </option>
        ))}
      </select>

      {/* DELETE */}

      <button
        onClick={() =>
          onDelete(item._id)
        }
        className="
          h-10
          w-10
          rounded-2xl
          border
          border-red-100
          bg-red-50
          text-red-500
          flex
          items-center
          justify-center
          shrink-0
        "
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function LogisticsRow({ item, onUpdate, onDelete }) {
  const {
    setNodeRef,
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
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="
        relative
        flex
        items-center
        gap-3
        rounded-[26px]
        border
        border-[#F0ECE7]
        bg-[#FCFBFA]
        px-4
        py-4
        overflow-hidden
      "
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-400 cursor-grab shrink-0"
      >
        <GripVertical size={18} />
      </button>

      <div
        className="
          h-11
          w-11
          rounded-2xl
          bg-[#F5ECE5]
          flex
          items-center
          justify-center
          shrink-0
        "
      >
        <Package size={17} />
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <input
          value={item.title}
          onChange={(e) =>
            onUpdate(item._id, {
              title: e.target.value,
            })
          }
          className="
            w-full
            bg-transparent
            outline-none
            text-[15px]
            font-bold
            text-[#1E1B2E]
            text-right
            truncate
          "
        />
      </div>

      <select
        value={item.status}
        onChange={(e) =>
          onUpdate(item._id, {
            status: e.target.value,
          })
        }
        className={`
          w-[110px]
          shrink-0
          rounded-full
          border
          px-3
          py-2
          text-xs
          font-bold
          outline-none
          ${STATUS_META[item.status]?.className}
        `}
      >
        {Object.keys(STATUS_META).map((key) => (
          <option key={key} value={key}>
            {STATUS_META[key].label}
          </option>
        ))}
      </select>

      <button
        onClick={() => onDelete(item._id)}
        className="
          h-10
          w-10
          rounded-2xl
          border
          border-red-100
          bg-red-50
          text-red-500
          flex
          items-center
          justify-center
          shrink-0
        "
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function LogisticsTab({ eventId }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newLogistic, setNewLogistic] = useState({
    title: "",
    time: "",
    status: "pending",
    type: "logistics",
  });

  const [newEvent, setNewEvent] = useState({
    title: "",
    time: "",
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
          const savedSteps = data.steps || [];

          if (data.success) {
  setSteps(data.steps || []);
}

      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

    load();
  }, [eventId]);

  const logisticsSteps = useMemo(
    () =>
      steps.filter(
        (s) => !s.type || s.type === "logistics"
      ),
    [steps]
  );

  const eventSteps = useMemo(
    () => steps.filter((s) => s.type === "event"),
    [steps]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function addStep(payload) {
    if (!payload.title) return;

    const optimistic = {
      ...payload,
      _id: Math.random().toString(36),
    };

    setSteps((prev) => [...prev, optimistic]);

    try {
      await fetch(`/api/events/${eventId}/logistics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          type: payload.type,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function updateStep(id, patch) {
    setSteps((prev) =>
      prev.map((s) =>
        s._id === id
          ? {
              ...s,
              ...patch,
            }
          : s
      )
    );


    try {
      await fetch(`/api/logistics/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteStep(id) {
    setSteps((prev) => prev.filter((s) => s._id !== id));


    try {
      await fetch(`/api/logistics/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error(err);
    }
  }

  function handleDragEnd(type) {
    return ({ active, over }) => {
      if (!over || active.id === over.id) return;

      const current =
        type === "event" ? eventSteps : logisticsSteps;

      const oldIndex = current.findIndex(
        (i) => i._id === active.id
      );

      const newIndex = current.findIndex(
        (i) => i._id === over.id
      );

      const reordered = arrayMove(
        current,
        oldIndex,
        newIndex
      );

      const others = steps.filter((s) =>
        type === "event"
          ? s.type !== "event"
          : s.type === "event"
      );

      setSteps([...others, ...reordered]);
    };
  }

  if (loading) {
    return (
      <div className="py-40 text-center">
        טוען...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="
        max-w-none
        w-full
        mx-auto
        px-6
        py-10
        overflow-hidden
      "
    >
      <div className="text-center mb-12">
        <div
          className="
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            border-[#E8DDD3]
            bg-white
            px-5
            py-2
            text-sm
            font-bold
            text-[#7A4A35]
            mb-5
          "
        >
          <Sparkles size={16} />
          ניהול האירוע
        </div>

        <h1
          className="
            text-4xl
            xl:text-5xl
            font-black
            text-[#1E1B2E]
            leading-tight
          "
        >
          ✨ ניהול לוגיסטיקה ולוח האירוע ✨
        </h1>

        <p className="text-gray-500 mt-4">
          ארגון כל השלבים החשובים במקום אחד
        </p>
      </div>

      <div
        className="
          grid
          grid-cols-1
          xl:grid-cols-2
          gap-10
          items-start
        "
      >
        <div
          className="
            rounded-[36px]
            border
            border-[#ECE5DE]
            bg-white
            p-5
            xl:p-7
            min-w-0
            overflow-hidden
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
              mb-8
            "
          >
            <div className="min-w-0">
              <h2
                className="
                  text-3xl
                  xl:text-4xl
                  font-black
                  text-[#1E1B2E]
                "
              >
                לוגיסטיקה
              </h2>

              <p className="text-gray-400 mt-2 text-sm">
                משימות, ספקים והכנות לפני האירוע
              </p>
            </div>

            <div
              className="
                h-14
                w-14
                rounded-3xl
                bg-[#F5E7DC]
                flex
                items-center
                justify-center
                shrink-0
              "
            >
              <ListChecks />
            </div>
          </div>

          <div
            className="
              flex
              items-center
              gap-3
              mb-6
              min-w-0
            "
          >
            <button
              onClick={() => {
                addStep(newLogistic);

                setNewLogistic({
                  title: "",
                  time: "",
                  status: "pending",
                  type: "logistics",
                });
              }}
              className="
                rounded-2xl
                bg-gradient-to-r
                from-violet-600
                to-purple-500
                text-white
                font-black
                px-5
                py-4
                text-sm
                shrink-0
              "
            >
              הוסף שלב +
            </button>

            <input
              value={newLogistic.title}
              onChange={(e) =>
                setNewLogistic((p) => ({
                  ...p,
                  title: e.target.value,
                }))
              }
              placeholder="מה נדרש לארגן?"
              className="
                flex-1
                min-w-0
                rounded-2xl
                border
                border-[#E7E2DD]
                px-5
                py-4
                outline-none
                text-sm
              "
            />

            <input
              type="time"
              value={newLogistic.time}
              onChange={(e) =>
                setNewLogistic((p) => ({
                  ...p,
                  time: e.target.value,
                }))
              }
              className="
                w-[115px]
                shrink-0
                rounded-2xl
                border
                border-[#E7E2DD]
                px-4
                py-4
                outline-none
                text-sm
              "
            />
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd("logistics")}
          >
            <SortableContext
              items={logisticsSteps.map((s) => s._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4 min-w-0">
                {logisticsSteps.map((item) => (
                  <LogisticsRow
                    key={item._id}
                    item={item}
                    onUpdate={updateStep}
                    onDelete={deleteStep}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div
          className="
            rounded-[36px]
            border
            border-[#ECE5DE]
            bg-white
            p-5
            xl:p-7
            min-w-0
            overflow-hidden
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
              mb-8
            "
          >
            <div className="min-w-0">
              <h2
                className="
                  text-3xl
                  xl:text-4xl
                  font-black
                  text-[#1E1B2E]
                "
              >
                לוח האירוע
              </h2>

              <p className="text-gray-400 mt-2 text-sm">
                סדר האירועים לפי שעות
              </p>
            </div>

            <div
              className="
                h-14
                w-14
                rounded-3xl
                bg-[#F5E7DC]
                flex
                items-center
                justify-center
                shrink-0
              "
            >
              <CalendarDays />
            </div>
          </div>

          <div
            className="
              flex
              items-center
              gap-3
              mb-6
              min-w-0
            "
          >
            <button
              onClick={() => {
                addStep(newEvent);

                setNewEvent({
                  title: "",
                  time: "",
                  status: "pending",
                  type: "event",
                });
              }}
              className="
                rounded-2xl
                bg-gradient-to-r
                from-violet-600
                to-purple-500
                text-white
                font-black
                px-5
                py-4
                text-sm
                shrink-0
              "
            >
              הוסף אירוע +
            </button>

            <input
              value={newEvent.title}
              onChange={(e) =>
                setNewEvent((p) => ({
                  ...p,
                  title: e.target.value,
                }))
              }
              placeholder="שם האירוע בלו״ז"
              className="
                flex-1
                min-w-0
                rounded-2xl
                border
                border-[#E7E2DD]
                px-5
                py-4
                outline-none
                text-sm
              "
            />

            <input
              type="time"
              value={newEvent.time}
              onChange={(e) =>
                setNewEvent((p) => ({
                  ...p,
                  time: e.target.value,
                }))
              }
              className="
                w-[115px]
                shrink-0
                rounded-2xl
                border
                border-[#E7E2DD]
                px-4
                py-4
                outline-none
                text-sm
              "
            />
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd("event")}
          >
            <SortableContext
              items={eventSteps.map((s) => s._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4 min-w-0">
                {eventSteps.map((item) => (
                  <TimelineRow
                    key={item._id}
                    item={item}
                    onUpdate={updateStep}
                    onDelete={deleteStep}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}