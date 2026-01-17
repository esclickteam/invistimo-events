"use client";

import { useState } from "react";

/* =====================
   STATUS CONFIG
===================== */
const TASK_STATUS = {
  OPEN: "open",
  WAITING: "waiting",
  DONE: "done",
};

const STATUS_LABEL = {
  open: "פתוחה",
  waiting: "בהמתנה",
  done: "בוצעה",
};

const STATUS_STYLE = {
  open: "bg-red-50 text-red-600",
  waiting: "bg-amber-50 text-amber-700",
  done: "bg-green-50 text-green-700",
};

export default function OverviewTab() {
  /* =====================
     DATA
  ===================== */
  const [budget] = useState({
    total: 120000,
    spent: 86500,
  });

  const remaining = budget.total - budget.spent;
  const progress = Math.round(
    (budget.spent / budget.total) * 100
  );

  const [tasks, setTasks] = useState([
    {
      id: "1",
      title: "DJ – אין מקדמה",
      dueDate: "2024-08-12",
      status: TASK_STATUS.OPEN,
    },
    {
      id: "2",
      title: "הסעות לא סגורות",
      dueDate: "2024-08-20",
      status: TASK_STATUS.WAITING,
    },
  ]);

  /* =====================
     ADD TASK STATE
  ===================== */
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  function addTask() {
    if (!newTitle.trim()) return;

    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: newTitle.trim(),
        dueDate: newDate || null,
        status: TASK_STATUS.OPEN,
      },
    ]);

    setNewTitle("");
    setNewDate("");
  }

  function updateTask(id, field, value) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, [field]: value } : t
      )
    );
  }

  return (
    <div
      className="max-w-6xl mx-auto px-4 py-10 space-y-8"
      dir="rtl"
      style={{ background: "#F7F4EF" }}
    >
      {/* HEADER */}
      <div className="bg-white rounded-2xl px-6 py-5 border border-[#E7E3DC] flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">
            הפקת אירוע · 14.09
          </h1>
          <p className="text-sm text-gray-500">
            42 ימים לאירוע
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {tasks.filter(
            (t) => t.status !== TASK_STATUS.DONE
          ).length}{" "}
          משימות פעילות
        </div>
      </div>

      {/* BUDGET */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BudgetCard title="תקציב כולל" value={budget.total} />
        <BudgetCard title="יצא עד כה" value={budget.spent} />
        <BudgetCard
          title="יתרה"
          value={remaining}
          highlight
        />
      </div>

      {/* PROGRESS */}
      <div className="bg-white rounded-xl p-4 border border-[#E7E3DC]">
        <div className="flex justify-between text-sm mb-2 text-gray-600">
          <span>ניצול תקציב</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, #6D6AF4, #8B87FF)",
            }}
          />
        </div>
      </div>

      {/* TASKS */}
      <div className="bg-white rounded-2xl border border-[#E7E3DC] p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          משימות
        </h2>

        {/* TASK LIST */}
        <div className="divide-y">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="py-4 flex flex-col md:flex-row justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <select
                  value={task.status}
                  onChange={(e) =>
                    updateTask(
                      task.id,
                      "status",
                      e.target.value
                    )
                  }
                  className={`text-xs px-2 py-1 rounded ${STATUS_STYLE[task.status]}`}
                >
                  {Object.values(TASK_STATUS).map(
                    (s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    )
                  )}
                </select>

                <span
                  className={`font-medium ${
                    task.status === TASK_STATUS.DONE
                      ? "line-through text-gray-400"
                      : ""
                  }`}
                >
                  {task.title}
                </span>
              </div>

              <input
                type="date"
                value={task.dueDate || ""}
                onChange={(e) =>
                  updateTask(
                    task.id,
                    "dueDate",
                    e.target.value
                  )
                }
                className="text-sm border rounded-lg px-3 py-1.5"
              />
            </div>
          ))}
        </div>

        {/* ADD TASK */}
        <div className="pt-4 border-t flex flex-col md:flex-row gap-3">
          <input
            placeholder="הוסף משימה חדשה…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && addTask()
            }
            className="flex-1 border rounded-lg px-4 py-2 text-sm"
          />

          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />

          <button
            onClick={addTask}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{
              background:
                "linear-gradient(90deg, #6D6AF4, #8B87FF)",
            }}
          >
            הוסף
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================
   COMPONENTS
===================== */
function BudgetCard({
  title,
  value,
  highlight = false,
}) {
  return (
    <div
      className="rounded-2xl p-5 border border-[#E7E3DC]"
      style={{
        background: highlight
          ? "linear-gradient(180deg, #F4F3FF, #FFFFFF)"
          : "#FFFFFF",
        boxShadow:
          "0 6px 18px rgba(0,0,0,0.04)",
      }}
    >
      <p className="text-sm text-gray-500 mb-1">
        {title}
      </p>
      <p className="text-2xl font-semibold">
        ₪{value.toLocaleString()}
      </p>
    </div>
  );
}
