"use client";

import { useState } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";

type Task = {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  dueDate: string;
  priority: string;
  owner: string;
};

type Props = {
  tasks: Task[];
  addTask: (task: Omit<Task, "_id">) => void;
  updateTask: (taskId: string, payload: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
};

export default function DemoTasksTab({
  tasks,
  addTask,
  updateTask,
  deleteTask,
}: Props) {
  const [title, setTitle] = useState("");

  const handleAdd = () => {
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      description: "משימה שנוספה בדמו להתנסות בלבד.",
      status: "todo",
      dueDate: "2026-09-01",
      priority: "medium",
      owner: "לקוח דמו",
    });

    setTitle("");
  };

  return (
    <section className="rounded-3xl border border-[#e6d7c8] bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black text-[#2f241c]">משימות אירוע</h2>
          <p className="text-sm text-[#7b6a58]">
            הוספה, סימון ומחיקה בדמו בלבד.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="הוספת משימה"
            className="w-full rounded-2xl border border-[#d8c5b3] px-4 py-2 text-sm outline-none focus:border-[#8a5a2b] md:w-64"
          />

          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#8a5a2b] px-4 py-2 text-sm font-bold text-white"
          >
            <Plus size={16} />
            הוסף
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {tasks.map((task) => {
          const done = task.status === "done";

          return (
            <div
              key={task._id}
              className="rounded-3xl border border-[#eadccd] bg-[#fffaf5] p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3
                    className={[
                      "font-black",
                      done ? "text-[#8f8478] line-through" : "text-[#2f241c]",
                    ].join(" ")}
                  >
                    {task.title}
                  </h3>

                  <p className="mt-1 text-sm text-[#7b6a58]">
                    {task.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-white px-3 py-1 text-[#6f4b2b]">
                      יעד: {task.dueDate}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-[#6f4b2b]">
                      אחראי: {task.owner}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateTask(task._id, {
                        status: done ? "todo" : "done",
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c5b3] bg-white px-3 py-2 text-sm font-bold text-[#6f4b2b]"
                  >
                    <CheckCircle2 size={16} />
                    {done ? "בטל ביצוע" : "סמן בוצע"}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTask(task._id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-3 py-2 text-sm font-bold text-red-600"
                  >
                    <Trash2 size={16} />
                    מחיקה
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}