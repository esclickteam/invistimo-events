"use client";

import { useState } from "react";
import { Clock, Plus, Trash2 } from "lucide-react";

type ScheduleItem = {
  _id: string;
  time: string;
  title: string;
  description: string;
  responsible: string;
};

type Props = {
  schedule: ScheduleItem[];
  addScheduleItem: (item: Omit<ScheduleItem, "_id">) => void;
  updateScheduleItem: (
    itemId: string,
    payload: Partial<ScheduleItem>
  ) => void;
  deleteScheduleItem: (itemId: string) => void;
};

export default function DemoScheduleTab({
  schedule,
  addScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
}: Props) {
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");

  const handleAdd = () => {
    if (!time.trim() || !title.trim()) return;

    addScheduleItem({
      time: time.trim(),
      title: title.trim(),
      description: "פעילות שנוספה לדמו בלבד.",
      responsible: "מנהל אירוע",
    });

    setTime("");
    setTitle("");
  };

  return (
    <section className="rounded-3xl border border-[#e6d7c8] bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black text-[#2f241c]">לו״ז אירוע</h2>
          <p className="text-sm text-[#7b6a58]">
            ניהול זמני האירוע להתנסות בדמו.
          </p>
        </div>

        <div className="grid gap-2 md:flex">
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="שעה, לדוגמה 20:30"
            className="rounded-2xl border border-[#d8c5b3] px-4 py-2 text-sm outline-none focus:border-[#8a5a2b]"
          />

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="שם פעילות"
            className="rounded-2xl border border-[#d8c5b3] px-4 py-2 text-sm outline-none focus:border-[#8a5a2b]"
          />

          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8a5a2b] px-4 py-2 text-sm font-bold text-white"
          >
            <Plus size={16} />
            הוסף
          </button>
        </div>
      </div>

      <div className="relative space-y-3">
        {schedule.map((item) => (
          <div
            key={item._id}
            className="rounded-3xl border border-[#eadccd] bg-[#fffaf5] p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#8a5a2b]">
                  <Clock size={20} />
                </div>

                <div>
                  <p className="text-sm font-black text-[#8a5a2b]">
                    {item.time}
                  </p>
                  <h3 className="text-lg font-black text-[#2f241c]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#7b6a58]">{item.description}</p>
                  <p className="mt-1 text-xs font-bold text-[#6f4b2b]">
                    אחראי: {item.responsible}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateScheduleItem(item._id, {
                      responsible:
                        item.responsible === "מנהל אירוע"
                          ? "אולם"
                          : "מנהל אירוע",
                    })
                  }
                  className="rounded-2xl border border-[#d8c5b3] bg-white px-3 py-2 text-sm font-bold text-[#6f4b2b]"
                >
                  שנה אחראי
                </button>

                <button
                  type="button"
                  onClick={() => deleteScheduleItem(item._id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-3 py-2 text-sm font-bold text-red-600"
                >
                  <Trash2 size={16} />
                  מחיקה
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}