"use client";

import { useLiveGuests } from "./LiveGuestsProvider";

export default function GuestStatsLive() {
  const { state } = useLiveGuests();

  if (!state) return null;

  const { total, arrived, notArrived, cancelled } = state.stats;

  return (
    <div className="flex gap-4 p-4 bg-gray-50 rounded border">
      <Stat label="סה״כ" value={total} />
      <Stat label="הגיעו" value={arrived} />
      <Stat label="לא הגיעו" value={notArrived} />
      <Stat label="ביטלו" value={cancelled} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
