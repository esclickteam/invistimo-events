"use client";

import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";

type EventData = {
  _id: string;
  title: string;
  eventType: string;
  date: string;
  time: string;
  location: string;
  hallName: string;
  hallRoom: string;
  estimatedGuests: number;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
  actualArrived: number;
  contactName: string;
  contactPhone: string;
  notes: string;
};

type Stats = {
  totalBudget: number;
  paidAmount: number;
  remainingAmount: number;
  completedTasks: number;
  openTasks: number;
  suppliers: number;
};

type Props = {
  event: EventData;
  stats: Stats;
  updateEvent: (payload: Partial<EventData>) => void;
};

export default function DemoOverviewTab({ event, stats, updateEvent }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EventData>(event);

  const save = () => {
    updateEvent(form);
    setEditing(false);
  };

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="מוזמנים צפויים" value={event.estimatedGuests} />
        <StatCard label="אישרו הגעה" value={event.confirmedGuests} />
        <StatCard label="בהמתנה" value={event.pendingGuests} />
        <StatCard label="ספקים" value={stats.suppliers} />
        <StatCard label="משימות פתוחות" value={stats.openTasks} />
        <StatCard
          label="תקציב שנותר"
          value={`${stats.remainingAmount.toLocaleString()} ₪`}
        />
      </div>

      <div className="rounded-3xl border border-[#e6d7c8] bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-[#2f241c]">פרטי אירוע</h2>
            <p className="text-sm text-[#7b6a58]">
              אפשר לערוך ולשמור בדמו. הנתונים לא נשמרים באמת.
            </p>
          </div>

          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setForm(event);
                setEditing(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8a5a2b] px-4 py-2 text-sm font-bold text-white"
            >
              <Pencil size={16} />
              עריכה
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8a5a2b] px-4 py-2 text-sm font-bold text-white"
              >
                <Save size={16} />
                שמירה בדמו
              </button>

              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8c5b3] bg-white px-4 py-2 text-sm font-bold text-[#6f4b2b]"
              >
                <X size={16} />
                ביטול
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="שם האירוע" value={event.title} />
            <Info label="סוג אירוע" value={event.eventType} />
            <Info label="תאריך" value={event.date} />
            <Info label="שעה" value={event.time} />
            <Info label="מיקום" value={event.location} />
            <Info label="אולם" value={`${event.hallName} · ${event.hallRoom}`} />
            <Info label="איש קשר" value={event.contactName} />
            <Info label="טלפון" value={event.contactPhone} />
            <Info label="הערות" value={event.notes} />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="שם האירוע"
              value={form.title}
              onChange={(value) => setForm((prev) => ({ ...prev, title: value }))}
            />
            <Input
              label="סוג אירוע"
              value={form.eventType}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, eventType: value }))
              }
            />
            <Input
              label="תאריך"
              value={form.date}
              onChange={(value) => setForm((prev) => ({ ...prev, date: value }))}
            />
            <Input
              label="שעה"
              value={form.time}
              onChange={(value) => setForm((prev) => ({ ...prev, time: value }))}
            />
            <Input
              label="מיקום"
              value={form.location}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, location: value }))
              }
            />
            <Input
              label="שם אולם"
              value={form.hallName}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, hallName: value }))
              }
            />
            <Input
              label="מתחם / אולם פנימי"
              value={form.hallRoom}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, hallRoom: value }))
              }
            />
            <Input
              label="איש קשר"
              value={form.contactName}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, contactName: value }))
              }
            />
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-[#e6d7c8] bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-[#7b6a58]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#2f241c]">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-[#fffaf5] p-4">
      <p className="text-xs font-bold text-[#8f8478]">{label}</p>
      <p className="mt-1 font-black text-[#2f241c]">{value}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-[#6f4b2b]">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-[#d8c5b3] px-4 py-2 outline-none focus:border-[#8a5a2b]"
      />
    </label>
  );
}