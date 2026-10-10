"use client";

import {
  SEATING_SCHEDULE_FIELDS,
  type SeatingScheduleFieldKey,
  type SeatingScheduleTimes,
} from "@/lib/seatingSchedule";

type Props = {
  value: SeatingScheduleTimes;
  onChange: (value: SeatingScheduleTimes) => void;
};

export default function SeatingScheduleFields({ value, onChange }: Props) {
  function update(key: SeatingScheduleFieldKey, nextValue: string) {
    onChange({ ...value, [key]: nextValue });
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-3">
      <p className="text-xs font-black text-[#3f3327]">לוחות זמנים להושבה באולם</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#7b6a58]">
        יש למלא רק שעות שסוכמו בפועל. שעה שלא הוזנה לא תוצג בהצעת המחיר.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {SEATING_SCHEDULE_FIELDS.map((field) => (
          <label key={field.key} className="text-xs font-black text-[#3f3327]">
            {field.label}
            <input
              type="time"
              step={60}
              required
              value={value[field.key]}
              onChange={(event) => update(field.key, event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 text-sm font-bold outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
