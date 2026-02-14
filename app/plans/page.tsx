"use client";

import { useState } from "react";
import Link from "next/link";

type PlanType = "rsvp" | "vip" | "vip_seating";

function calculatePrice(records: number, plan: PlanType, eventManagement: boolean) {
  let basePerRecord = 0;
  let addPerRecord = 0;

  // בסיס RSVP
  if (records <= 150) basePerRecord = 1.3;
  else if (records <= 300) basePerRecord = 1.2;
  else if (records <= 500) basePerRecord = 1.1;
  else basePerRecord = 0.95;

  if (plan === "rsvp") {
    return records * basePerRecord + (eventManagement ? 199 : 0);
  }

  // תוספת מוקד
  if (records <= 150) addPerRecord = 1.1;
  else if (records <= 300) addPerRecord = 1.05;
  else if (records <= 500) addPerRecord = 1.0;
  else addPerRecord = 0.95;

  if (plan === "vip") {
    return records * (basePerRecord + addPerRecord) + (eventManagement ? 199 : 0);
  }

  // VIP + הושבה
  if (plan === "vip_seating") {
    return records * (basePerRecord + addPerRecord + 0.3) + (eventManagement ? 199 : 0);
  }

  return 0;
}

export default function PlansPage() {
  const [records, setRecords] = useState<number>(150);
  const [plan, setPlan] = useState<PlanType>("rsvp");
  const [eventManagement, setEventManagement] = useState<boolean>(false);

  const price = calculatePrice(records, plan, eventManagement);

  return (
    <div className="max-w-4xl mx-auto py-20 px-6 space-y-10">

      <h1 className="text-4xl font-bold text-center text-[#5c4632]">
        בחרו חבילת אירוע
      </h1>

      {/* בחירת חבילה */}
      <div className="space-y-3">
        <label className="font-semibold text-[#5c4632]">סוג חבילה:</label>

        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as PlanType)}
          className="w-full border border-[#d8cfc2] rounded-xl p-3"
        >
          <option value="rsvp">RSVP אוטומטי</option>
          <option value="vip">VIP מוקד אנושי</option>
          <option value="vip_seating">VIP + הושבה דיגיטלית</option>
        </select>
      </div>

      {/* בחירת מספר רשומות */}
      <div className="space-y-3">
        <label className="font-semibold text-[#5c4632]">
          מספר רשומות (אורחים):
        </label>

        <select
          value={records}
          onChange={(e) => setRecords(Number(e.target.value))}
          className="w-full border border-[#d8cfc2] rounded-xl p-3"
        >
          {Array.from({ length: 20 }, (_, i) => (i + 1) * 50).map((num) => (
            <option key={num} value={num}>
              {num} רשומות
            </option>
          ))}
        </select>
      </div>

      {/* Upsell ניהול אירוע */}
      <div className="flex items-center justify-between bg-[#f3ebe2] p-4 rounded-xl border border-[#e1d8c9]">
        <div>
          <h3 className="font-semibold text-[#5c4632]">
            הוסף ניהול אירוע עצמאי
          </h3>
          <p className="text-sm text-[#7b6754]">
            ניהול תקציב, ספקים, משימות ותשלומים
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={eventManagement}
            onChange={() => setEventManagement(!eventManagement)}
            className="w-5 h-5 accent-[#5c4632]"
          />
          <span className="font-medium text-[#5c4632]">+199₪</span>
        </label>
      </div>

      {/* תצוגת מחיר */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e1d8c9] text-center">
        <p className="text-lg text-[#7b6754]">מחיר כולל:</p>
        <p className="text-4xl font-bold text-[#5c4632] mt-2">
          ₪{price.toFixed(0)}
        </p>
      </div>

      {/* כפתור המשך */}
      <Link
        href={`/register?plan=${plan}&records=${records}&eventManagement=${eventManagement}`}
        className="block text-center bg-[#5c4632] text-white py-4 rounded-xl text-lg hover:opacity-90 transition"
      >
        המשך להרשמה
      </Link>
    </div>
  );
}
