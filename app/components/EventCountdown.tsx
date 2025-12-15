"use client";

import { useEffect, useState } from "react";

type TimeLeft = {
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export default function EventCountdown({ invitation }: { invitation: any }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!invitation?.date) return;

    // 🧠 בניית תאריך יעד (date + time אם קיים)
    const targetDateTime = invitation.time
      ? new Date(`${invitation.date}T${invitation.time}`)
      : new Date(invitation.date);

    const target = targetDateTime.getTime();
    if (isNaN(target)) return;

    const interval = setInterval(() => {
      const now = Date.now();
      let diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
        return;
      }

      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      // ✨ חישוב חכם
      const months = Math.floor(days / 30);
      const weeks = Math.floor((days % 30) / 7);
      const remDays = days % 7;

      setTimeLeft({
        months,
        weeks,
        days: remDays,
        hours: hours % 24,
        minutes: minutes % 60,
        seconds: seconds % 60,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [invitation?.date, invitation?.time]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-2 text-lg font-semibold flex-wrap">
      <span>{invitation.title || "האירוע"}</span>
      <span className="text-gray-500">יתחיל בעוד:</span>

      {timeLeft.months > 0 && (
        <TimeBox label="חודשים" value={timeLeft.months} />
      )}
      {timeLeft.weeks > 0 && (
        <TimeBox label="שבועות" value={timeLeft.weeks} />
      )}
      {timeLeft.days > 0 && (
        <TimeBox label="ימים" value={timeLeft.days} />
      )}

      <TimeBox label="שעות" value={timeLeft.hours} />
      <TimeBox label="דקות" value={timeLeft.minutes} />
      <TimeBox label="שניות" value={timeLeft.seconds} />
    </div>
  );
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-black text-white rounded-md px-3 py-2 min-w-[56px]">
      <span className="text-xl">{String(value).padStart(2, "0")}</span>
      <span className="text-xs opacity-80">{label}</span>
    </div>
  );
}
