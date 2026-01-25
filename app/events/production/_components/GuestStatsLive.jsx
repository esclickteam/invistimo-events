"use client";

import { useLiveGuests } from "./LiveGuestsProvider";

export default function GuestStatsLive() {
  const { state } = useLiveGuests();

  if (!state) return null;

  const totalApproved = state.guests.reduce(
    (sum, g) => sum + g.approved,
    0
  );

  const totalArrived = state.guests.reduce(
    (sum, g) => sum + g.arrived,
    0
  );

  return (
    <div className="flex gap-4 p-4 bg-gray-50 rounded border">
      <Stat label="אישרו הגעה" value={totalApproved} />
      <Stat label="הגיעו בפועל" value={totalArrived} />
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
