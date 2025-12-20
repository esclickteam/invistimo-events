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

  const boxes = [
    timeLeft.months > 0 && { label: "חודשים", value: timeLeft.months },
    timeLeft.weeks > 0 && { label: "שבועות", value: timeLeft.weeks },
    timeLeft.days > 0 && { label: "ימים", value: timeLeft.days },
    { label: "שעות", value: timeLeft.hours },
    { label: "דקות", value: timeLeft.minutes },
    { label: "שניות", value: timeLeft.seconds },
  ].filter(Boolean) as { label: string; value: number }[];

  return (
    <div dir="rtl" className="w-full flex justify-center">
      <div
        className="
          w-full max-w-[360px] md:max-w-[420px]
          bg-gradient-to-l from-black to-zinc-800
          text-white
          rounded-2xl
          px-4 py-4 md:px-6 md:py-5
          relative
          border-2 border-[#c9b48f]
          shadow-[0_0_0_2px_rgba(201,180,143,0.65),_0_10px_28px_rgba(201,180,143,0.45)]
        "
      >
        {/* כותרת */}
        <div className="text-sm md:text-lg font-semibold mb-3 text-center">
          האירוע{" "}
          <span className="text-[#c9b48f] font-bold">
            {invitation.title || "שלך"}
          </span>{" "}
          יתחיל בעוד:
        </div>

        {/* ⏳ ספירה לאחור */}
        <div
          className="
            grid grid-cols-4
            md:grid-cols-2
            gap-2 md:gap-4
          "
        >
          {boxes.map((b) => (
            <TimeBox key={b.label} value={b.value} label={b.label} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="
        flex flex-col items-center justify-center
        bg-white/10
        backdrop-blur
        border border-white/20
        rounded-xl
        py-2 md:py-4
        text-center
      "
    >
      <span className="text-lg md:text-3xl font-bold tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] md:text-sm opacity-80">{label}</span>
    </div>
  );
}
