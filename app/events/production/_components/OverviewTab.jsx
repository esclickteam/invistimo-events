"use client";

import { useState } from "react";

export default function OverviewTab() {
  /* =====================
     DATA (בהמשך מ־DB)
  ===================== */
  const eventDate = "14.09";
  const daysLeft = 42;

  const budgetTotal = 120000;
  const spent = 86500;
  const remaining = budgetTotal - spent;
  const progress = Math.round((spent / budgetTotal) * 100);

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
     TASKS – מרכז שליטה
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

  /* =====================
     RENDER
  ===================== */
  return (
    <div className="space-y-6">
      {/* ================= HEADER ================= */}
      <div className="bg-gray-900 text-white rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">הפקת אירוע · {eventDate}</h2>
          <p className="text-sm text-gray-300">
            {daysLeft} ימים לאירוע · סטטוס: בשליטה
          </p>
        </div>

        <div className="text-sm text-gray-300">
          השבוע: {meetings.length} פגישות · {openTasks.length} משימות פתוחות
        </div>
      </div>

      {/* ================= MAIN GRID ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ================= LEFT – TASKS ================= */}
        <div className="xl:col-span-2 bg-white border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">משימות פתוחות</h3>
            <span className="text-sm text-red-600">
              {openTasks.length} דורשות טיפול
            </span>
          </div>

          {/* Add Task */}
          <div className="flex flex-col md:flex-row gap-2">
            <input
              placeholder="מה צריך לטפל?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="border px-3 py-2 rounded text-sm flex-1"
            />

            <input
              type="date"
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
              className="border px-3 py-2 rounded text-sm"
            />

            <button
              onClick={addTask}
              className="bg-gray-900 text-white px-4 py-2 rounded text-sm"
            >
              הוסף משימה
            </button>
          </div>

          {/* Task Table */}
          {openTasks.length === 0 ? (
            <p className="text-sm text-gray-500">
              אין משימות פתוחות 🎉
            </p>
          ) : (
            <div className="divide-y border rounded-lg">
              {openTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                    />
                    <span className="font-medium">
                      {task.title}
                    </span>
                  </label>

                  <div className="flex items-center gap-4 text-sm">
                    {task.dueDate && (
                      <span className="text-gray-500">
                        ⏰ {task.dueDate}
                      </span>
                    )}

                    <button
                      onClick={() => removeTask(task.id)}
                      className="text-red-500 hover:underline"
                    >
                      מחק
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= RIGHT – STATUS ================= */}
        <div className="space-y-6">
          {/* ===== Meetings ===== */}
          <div className="bg-white border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">
              פגישות קרובות
            </h3>

            <ul className="space-y-3">
              {meetings.map((m) => (
                <li
                  key={m.id}
                  className="flex justify-between items-center border-b pb-2 last:border-b-0"
                >
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-sm text-gray-500">
                      {m.date} · {m.time}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
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

          {/* ===== Budget ===== */}
          <div className="bg-gray-50 border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">
              תקציב אירוע
            </h3>

            <div className="text-3xl font-bold mb-2">
              ₪{remaining.toLocaleString()}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              נשאר לתכנון
            </p>

            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-3">
              <div
                className="bg-gray-900 h-3"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>מנוצל ₪{spent.toLocaleString()}</span>
              <span>תקציב ₪{budgetTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
