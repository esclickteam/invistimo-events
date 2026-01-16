"use client";

import { useState } from "react";

/* =====================
   סטטוסים
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
  open: "bg-red-100 text-red-700",
  waiting: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
};

export default function OverviewTab() {
  /* =====================
     DATA
  ===================== */
  const budgetTotal = 120000;
  const spent = 86500;
  const remaining = budgetTotal - spent;
  const progress = Math.round((spent / budgetTotal) * 100);

  const meetings = [
    { id: 1, title: "פגישה עם הזוג", date: "היום", time: "18:00" },
    { id: 2, title: "אולם – סגירה", date: "מחר", time: "11:00" },
    { id: 3, title: "צלם", date: "ה׳", time: "16:00" },
  ];

  /* =====================
     TASKS
  ===================== */
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "DJ – אין מקדמה",
      dueDate: "2024-08-12",
      status: TASK_STATUS.OPEN,
      isEditing: false,
    },
    {
      id: 2,
      title: "הסעות לא סגורות",
      dueDate: "2024-08-20",
      status: TASK_STATUS.WAITING,
      isEditing: false,
    },
  ]);

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  function addTask() {
    if (!newTitle.trim()) return;

    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: newTitle,
        dueDate: newDate || null,
        status: TASK_STATUS.OPEN,
        isEditing: false,
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

  function toggleEdit(id) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, isEditing: !t.isEditing } : t
      )
    );
  }

  function removeTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  /* =====================
     RENDER
  ===================== */
  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="bg-gray-900 text-white rounded-xl p-6 flex justify-between">
        <div>
          <h2 className="text-xl font-bold">הפקת אירוע · 14.09</h2>
          <p className="text-sm text-gray-300">
            42 ימים לאירוע · מערכת ניהול
          </p>
        </div>
        <div className="text-sm text-gray-300">
          {tasks.filter((t) => t.status !== TASK_STATUS.DONE).length} משימות פעילות
        </div>
      </div>

      {/* ===== GRID ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ================= TASKS ================= */}
        <div className="xl:col-span-2 bg-white border rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold">ניהול משימות</h3>

          {/* Add Task */}
          <div className="flex flex-col md:flex-row gap-2">
            <input
              placeholder="מה צריך לטפל?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="border px-3 py-2 rounded flex-1"
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="border px-3 py-2 rounded"
            />
            <button
              onClick={addTask}
              className="bg-gray-900 text-white px-4 py-2 rounded"
            >
              הוסף
            </button>
          </div>

          {/* Task Table */}
          <div className="border rounded-lg divide-y">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                {/* LEFT */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Status */}
                  <select
                    value={task.status}
                    onChange={(e) =>
                      updateTask(task.id, "status", e.target.value)
                    }
                    className={`text-xs px-2 py-1 rounded ${STATUS_STYLE[task.status]}`}
                  >
                    {Object.values(TASK_STATUS).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>

                  {/* Title */}
                  {task.isEditing ? (
                    <input
                      value={task.title}
                      onChange={(e) =>
                        updateTask(task.id, "title", e.target.value)
                      }
                      className="border px-2 py-1 rounded flex-1"
                    />
                  ) : (
                    <span
                      className={`font-medium ${
                        task.status === TASK_STATUS.DONE
                          ? "line-through text-gray-400"
                          : ""
                      }`}
                    >
                      {task.title}
                    </span>
                  )}
                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-3 text-sm">
                  <input
                    type="date"
                    value={task.dueDate || ""}
                    onChange={(e) =>
                      updateTask(task.id, "dueDate", e.target.value)
                    }
                    className="border px-2 py-1 rounded"
                  />

                  <button
                    onClick={() => toggleEdit(task.id)}
                    className="text-blue-600 hover:underline"
                  >
                    {task.isEditing ? "שמור" : "ערוך"}
                  </button>

                  <button
                    onClick={() => removeTask(task.id)}
                    className="text-red-600 hover:underline"
                  >
                    מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= RIGHT ================= */}
        <div className="space-y-6">
          {/* Meetings */}
          <div className="bg-white border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">פגישות קרובות</h3>
            <ul className="space-y-3">
              {meetings.map((m) => (
                <li key={m.id} className="flex justify-between">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-sm text-gray-500">
                      {m.date} · {m.time}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Budget */}
          <div className="bg-gray-50 border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2">תקציב</h3>
            <div className="text-3xl font-bold mb-1">
              ₪{remaining.toLocaleString()}
            </div>
            <p className="text-sm text-gray-500 mb-4">נותר לתכנון</p>

            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
              <div
                className="bg-gray-900 h-3"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
