"use client";

import { useEffect, useState } from "react";

/* ============================================================
   Types
============================================================ */
type TimeLeft = {
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/* ============================================================
   Component
============================================================ */
export default function EventCountdown({ invitation }: { invitation: any }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!invitation?.eventDate) return;

    const target = new Date(invitation.eventDate).getTime();
    if (isNaN(target)) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalHours = Math.floor(totalMinutes / 60);
      const totalDays = Math.floor(totalHours / 24);

      const months = Math.floor(totalDays / 30);
      const weeks = Math.floor((totalDays % 30) / 7);
      const days = totalDays % 7;

      setTimeLeft({
        months,
        weeks,
        days,
        hours: totalHours % 24,
        minutes: totalMinutes % 60,
        seconds: totalSeconds % 60,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [invitation?.eventDate]);

  if (!timeLeft) return null;

  const units = [
    timeLeft.months > 0 && { label: "חודשים", value: timeLeft.months },
    timeLeft.weeks > 0 && { label: "שבועות", value: timeLeft.weeks },
    timeLeft.days > 0 && { label: "ימים", value: timeLeft.days },
    { label: "שעות", value: timeLeft.hours },
    { label: "דקות", value: timeLeft.minutes },
    { label: "שניות", value: timeLeft.seconds },
  ].filter(Boolean) as { label: string; value: number }[];

  return (
    <div dir="rtl" className="flex flex-col items-center gap-3">
      {/* כותרת קטנה */}
      <div className="text-sm text-[#4a413a] font-medium">
        האירוע{" "}
        <span className="font-bold text-[#c9b48f]">
          {invitation?.title || "שלך"}
        </span>{" "}
        יתחיל בעוד
      </div>

      {/* SLOT COUNTDOWN */}
      <div className="flex items-end gap-2">
        {units.map((u) => (
          <SlotUnit key={u.label} value={u.value} label={u.label} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Slot Unit
============================================================ */
function SlotUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="
          min-w-[44px]
          px-2 py-2
          rounded-lg
          bg-gradient-to-b from-zinc-900 to-black
          text-white
          text-xl
          font-bold
          tabular-nums
          shadow-inner
        "
      >
        {String(value).padStart(2, "0")}
      </div>

      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  );
}
