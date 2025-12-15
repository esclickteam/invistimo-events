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
    if (!invitation?.eventDate) return;

    const target = new Date(invitation.eventDate).getTime();
    if (isNaN(target)) return;

    const interval = setInterval(() => {
      const now = Date.now();
      let diff = target - now;

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
