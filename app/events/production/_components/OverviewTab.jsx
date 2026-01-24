"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function OverviewTab({ eventId }) {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [budget, setBudget] = useState(null); // ✅ חדש
  const [error, setError] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  /* 🆕 budget edit (נשאר לתאימות) */
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(0);
  const [savingBudget, setSavingBudget] = useState(false);

  /* =====================
     LOAD DATA
  ===================== */
  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setError("NO_EVENT_ID");
      return;
    }

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/events/${eventId}/overview`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data?.error || "LOAD_FAILED");
          return;
        }

        setEvent(data.event);

        



        setTasks(data.tasks || []);
        setBudget(data.budget || null); // ✅ חשוב
        setBudgetDraft(data.event?.budgetTotal || 0); // נשאר
      } catch (e) {
        setError("NETWORK_ERROR");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [eventId]);

  /* =====================
     DERIVED (🔴 פה היה הבאג)
  ===================== */
  const budgetTotal = budget?.total || 0;
  const spent = budget?.spent || 0;
  const remaining = Math.max(budgetTotal - spent, 0);


  const progress = budgetTotal
    ? Math.round((spent / budgetTotal) * 100)
    : 0;

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== TASK_STATUS.DONE).length,
    [tasks]
  );

  /* =====================
     ACTIONS
  ===================== */

  async function addTask() {
    if (!newTitle.trim()) return;

    setError("");

    try {
      const res = await fetch(`/api/events/${eventId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          dueDate: newDate || "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error || "FAILED_TO_ADD_TASK");
        return;
      }

      setTasks((prev) => [...prev, data.task]);
      setNewTitle("");
      setNewDate("");
    } catch (e) {
      setError("NETWORK_ERROR");
    }
  }

  async function updateTask(taskId, field, value) {
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId ? { ...t, [field]: value } : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error("PATCH_FAILED");
      }

      if (data.task) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? data.task : t))
        );
      }
    } catch (e) {
      const res = await fetch(`/api/events/${eventId}/overview`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.success) {
        setTasks(data.tasks || []);
        setBudget(data.budget || null); // ✅ סנכרון חוזר
      }
      setError("FAILED_TO_UPDATE_TASK");
    }
  }

  /* 🆕 SAVE BUDGET – נשאר כמו שהוא */
  async function saveBudget() {
    if (!eventId) return;

    setSavingBudget(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${eventId}/overview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetTotal: Number(budgetDraft) || 0,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error("SAVE_BUDGET_FAILED");
      }

      setEvent(data.event);

setBudget((prev) =>
  prev
    ? {
        ...prev,
        total: Number(data.event.budgetTotal) || 0,
        remaining:
          (Number(data.event.budgetTotal) || 0) - (prev.spent || 0),
      }
    : prev
);

setIsEditingBudget(false);

    } catch (e) {
      setError("שגיאה בשמירת התקציב");
    } finally {
      setSavingBudget(false);
    }
  }

  /* =====================
     UI STATES
  ===================== */
  if (loading) return <div className="p-10">טוען…</div>;

  if (!event) {
    return (
      <div className="p-10 text-red-600">
        {error === "NO_EVENT_ID"
          ? "לא התקבל מזהה אירוע"
          : "שגיאה בטעינת האירוע"}
      </div>
    );
  }

  /* =====================
     RENDER
  ===================== */
  return (
    <div
      className="max-w-6xl mx-auto px-4 py-10 space-y-8"
      dir="rtl"
      style={{ background: "#F7F4EF" }}
    >
      {/* HEADER */}
      <div className="bg-white rounded-2xl px-6 py-5 border border-[#E7E3DC] flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          {event.title} · {event.date}
        </h1>
        <div className="text-sm text-gray-500">
          {activeTasks} משימות פעילות
        </div>
      </div>

      {/* BUDGET */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <EditableBudgetCard
    title="תקציב מתוכנן"
    value={budgetDraft}
    isEditing={isEditingBudget}
    loading={savingBudget}
    onEdit={() => setIsEditingBudget(true)}
    onCancel={() => {
      setBudgetDraft(event.budgetTotal || 0);
      setIsEditingBudget(false);
    }}
    onChange={setBudgetDraft}
    onSave={saveBudget}
  />

  <BudgetCard title="יצא עד כה" value={spent} />
  <BudgetCard title="יתרה" value={remaining} highlight />
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
        <h2 className="text-lg font-semibold">משימות</h2>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="divide-y">
          {tasks.map((task) => (
            <div
              key={task._id}
              className="py-4 flex flex-col md:flex-row justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <select
                  value={task.status}
                  onChange={(e) =>
                    updateTask(task._id, "status", e.target.value)
                  }
                  className={`text-xs px-2 py-1 rounded ${STATUS_STYLE[task.status]}`}
                >
                  {Object.values(TASK_STATUS).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
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
                  updateTask(task._id, "dueDate", e.target.value)
                }
                className="text-sm border rounded-lg px-3 py-1.5"
              />
            </div>
          ))}
        </div>

        {/* ADD TASK */}
        <div className="pt-4 border-t flex gap-3">
          <input
            placeholder="הוסף משימה חדשה…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
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
function BudgetCard({ title, value, highlight = false }) {
  return (
    <div
      className="rounded-2xl p-5 border border-[#E7E3DC]"
      style={{
        background: highlight
          ? "linear-gradient(180deg, #F4F3FF, #FFFFFF)"
          : "#FFFFFF",
        boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
      }}
    >
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-semibold">
        ₪{value.toLocaleString()}
      </p>
    </div>
  );
}


function EditableBudgetCard({
  title,
  value,
  isEditing,
  loading,
  onEdit,
  onCancel,
  onChange,
  onSave,
}) {
  return (
    <div
      className="rounded-2xl p-5 border border-[#E7E3DC]"
      style={{
        background: "#FFFFFF",
        boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
      }}
    >
      <p className="text-sm text-gray-500 mb-2">{title}</p>

      {isEditing ? (
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 border rounded-lg px-3 py-2 text-lg"
          />

          <button
            onClick={onSave}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-white text-sm"
            style={{
              background:
                "linear-gradient(90deg, #6D6AF4, #8B87FF)",
            }}
          >
            שמור
          </button>

          <button
            onClick={onCancel}
            className="px-3 py-2 rounded-lg text-sm border"
          >
            ביטול
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <p className="text-2xl font-semibold">
            ₪{value.toLocaleString()}
          </p>

          <button
            onClick={onEdit}
            className="text-sm text-[#6D6AF4] hover:underline"
          >
            עריכה
          </button>
        </div>
      )}
    </div>
  );
}
