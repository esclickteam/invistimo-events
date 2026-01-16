"use client";

import { useMemo, useState } from "react";

export default function OverviewTab() {
  /* =====================
     DATA (בהמשך מ־DB)
  ===================== */
  const budgetTotal = 120000;
  const spent = 86500;
  const remaining = budgetTotal - spent;

  const meetings = [
    {
      id: 1,
      title: "פגישה עם הזוג",
      date: "היום",
      time: "18:00",
      type: "couple",
    },
    {
      id: 2,
      title: "אולם – סגירה",
      date: "מחר",
      time: "11:00",
      type: "supplier",
    },
    {
      id: 3,
      title: "צלם",
      date: "ה׳",
      time: "16:00",
      type: "supplier",
    },
  ];

  /* =====================
     TASKS – זה הלב
  ===================== */
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "DJ – אין מקדמה",
      dueDate: "2024-08-12",
      completed: false,
    },
    {
      id: 2,
      title: "הסעות לא סגורות",
      dueDate: "2024-08-20",
      completed: false,
    },
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");

  function addTask() {
    if (!newTaskTitle.trim()) return;

    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: newTaskTitle,
        dueDate: newTaskDate || null,
        completed: false,
      },
    ]);

    setNewTaskTitle("");
    setNewTaskDate("");
  }

  function toggleTask(id) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
  }

  function removeTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const openTasks = tasks.filter((t) => !t.completed);

  const progress = Math.round((spent / budgetTotal) * 100);

  /* =====================
     RENDER
  ===================== */
  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="border rounded-2xl p-5 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">חתונה | 14.09</h2>
          <p className="text-sm text-gray-500">
            🟢 האירוע בשליטה · 42 ימים לאירוע
          </p>
        </div>

        <div className="text-sm text-gray-600">
          ⏰ השבוע: {meetings.length} פגישות
        </div>
      </div>

      {/* ===== Middle ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ===== Tasks ===== */}
        <div className="border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold">⚠️ משימות פתוחות</h3>

          {/* Add task */}
          <div className="flex gap-2">
            <input
              placeholder="הוסף משימה"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="border rounded px-2 py-1 flex-1 text-sm"
            />

            <input
              type="date"
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />

            <button
              onClick={addTask}
              className="bg-black text-white px-3 rounded text-sm"
            >
              הוסף
            </button>
          </div>

          {/* Task list */}
          {openTasks.length === 0 ? (
            <p className="text-sm text-gray-500">
              אין משימות פתוחות 🎉
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {openTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between border rounded px-3 py-2"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                    />
                    <span>{task.title}</span>
                  </label>

                  <div className="flex items-center gap-3">
                    {task.dueDate && (
                      <span className="text-xs text-gray-500">
                        ⏰ {task.dueDate}
                      </span>
                    )}

                    <button
                      onClick={() => removeTask(task.id)}
                      className="text-xs text-red-500"
                    >
                      מחק
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ===== Meetings ===== */}
        <div className="border rounded-2xl p-5">
          <h3 className="font-semibold mb-3">📅 פגישות קרובות</h3>

          <ul className="space-y-3 text-sm">
            {meetings.map((m) => (
              <li
                key={m.id}
                className="flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-gray-500">
                    {m.date} · {m.time}
                  </p>
                </div>

                <span
                  className={`text-xs px-2 py-1 rounded ${
                    m.type === "couple"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {m.type === "couple" ? "זוג" : "ספק"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ===== Budget ===== */}
      <div className="border rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold">💰 תקציב</h3>

        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-black h-3"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span>מנוצל: ₪{spent.toLocaleString()}</span>
          <span className="font-semibold text-green-600">
            נשאר: ₪{remaining.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
