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
  open: "bg-red-50 text-red-700",
  waiting: "bg-yellow-50 text-yellow-700",
  done: "bg-green-50 text-green-700",
};

export default function OverviewTab() {
  /* =====================
     DATA (mock – ready for API)
  ===================== */
  const [budget, setBudget] = useState({
    total: 120000,
    spent: 86500,
  });

  const remaining = Math.max(budget.total - budget.spent, 0);
  const progress =
    budget.total > 0
      ? Math.min(
          Math.round((budget.spent / budget.total) * 100),
          100
        )
      : 0;

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

  function updateTask(id, field, value) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, [field]: value } : t
      )
    );
  }

  /* =====================
     UI
  ===================== */
  return (
    <div
      className="max-w-6xl mx-auto px-4 py-8 space-y-8"
      dir="rtl"
    >
      {/* HEADER */}
      <div className="bg-gradient-to-l from-gray-900 to-gray-800 text-white rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            הפקת אירוע · 14.09
          </h1>
          <p className="text-sm text-gray-300">
            42 ימים לאירוע
          </p>
        </div>
        <div className="text-sm text-gray-300 self-end">
          {
            tasks.filter(
              (t) => t.status !== TASK_STATUS.DONE
            ).length
          }{" "}
          משימות פעילות
        </div>
      </div>

      {/* BUDGET CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BudgetCard
          title="תקציב כולל"
          value={budget.total}
        />
        <BudgetCard
          title="יצא עד כה"
          value={budget.spent}
        />
        <BudgetCard
          title="יתרה"
          value={remaining}
          highlight
        />
      </div>

      {/* BUDGET PROGRESS */}
      <div className="bg-white rounded-xl p-5 border space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            ניצול תקציב
          </span>
          <span className="font-medium">
            {progress}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* TASKS */}
      <div className="bg-white rounded-2xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          משימות
        </h2>

        <div className="divide-y">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-4"
            >
              {/* LEFT */}
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
                      <option
                        key={s}
                        value={s}
                      >
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

              {/* RIGHT */}
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
                className="text-sm border rounded px-3 py-1"
              />
            </div>
          ))}
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
      className={`rounded-2xl p-5 border transition ${
        highlight
          ? "bg-gray-900 text-white"
          : "bg-white"
      }`}
    >
      <p className="text-sm opacity-70 mb-1">
        {title}
      </p>
      <p className="text-2xl font-bold">
        ₪{value.toLocaleString()}
      </p>
    </div>
  );
}
