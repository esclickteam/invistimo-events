"use client";

import { useEffect, useState } from "react";

export default function EventCountdown({ invitation }: { invitation: any }) {
  const [timeLeft, setTimeLeft] = useState<any>(null);

  useEffect(() => {
    if (!invitation?.date) return;

    const target = new Date(invitation.date).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [invitation?.date]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-2 text-lg font-semibold">
      <span>{invitation.title || "האירוע"}</span>
      <span className="text-gray-500">קורה בעוד:</span>

      <TimeBox label="ימים" value={timeLeft.days} />
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
