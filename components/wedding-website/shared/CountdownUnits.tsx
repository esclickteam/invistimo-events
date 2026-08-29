"use client";

export type CountdownValues = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/**
 * Flipped countdown order: seconds → days.
 * In RTL this puts ימים on the opposite side from the old layout.
 */
export function getFlippedCountdownUnits(time: CountdownValues) {
  return [
    { label: "שניות", value: time.seconds },
    { label: "דקות", value: time.minutes },
    { label: "שעות", value: time.hours },
    { label: "ימים", value: time.days },
  ] as const;
}
