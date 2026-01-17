"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MeetingPage({ params }) {
  const router = useRouter();
  const meetingId = params.id;

  const [summary, setSummary] = useState("");
  const [decisions, setDecisions] = useState("");
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  function addTask() {
    if (!newTask.trim()) return;
    setTasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: newTask, done: false },
    ]);
    setNewTask("");
  }

  function toggleTask(id) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  return (
    <div className="max-w-4xl space-y-6" dir="rtl">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500"
      >
        ← חזרה
      </button>

      <h1 className="text-2xl font-bold">
        פגישה #{meetingId}
      </h1>

      {/* סיכום */}
      <section className="border rounded-xl p-4 space-y-3 bg-white">
        <h3 className="font-semibold">📝 סיכום הפגישה</h3>
        <textarea
          className="border rounded p-3 w-full"
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="מה דובר, מה חשוב, תחושות"
        />
      </section>

      {/* החלטות */}
      <section className="border rounded-xl p-4 space-y-3 bg-white">
        <h3 className="font-semibold">✅ החלטות</h3>
        <textarea
          className="border rounded p-3 w-full"
          rows={3}
          value={decisions}
          onChange={(e) => setDecisions(e.target.value)}
          placeholder="החלטות שהתקבלו"
        />
      </section>

      {/* משימות */}
      <section className="border rounded-xl p-4 space-y-3 bg-white">
        <h3 className="font-semibold">🛠️ משימות שנוצרו</h3>

        <div className="flex gap-2">
          <input
            className="border rounded p-2 flex-1"
            placeholder="משימה חדשה"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <button
            onClick={addTask}
            className="bg-black text-white px-4 rounded"
          >
            הוסף
          </button>
        </div>

        <ul className="space-y-2">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex justify-between items-center border rounded p-2"
            >
              <label className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggleTask(t.id)}
                />
                {t.title}
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
