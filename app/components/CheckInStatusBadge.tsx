"use client";

import {
  checkedInGuestCount,
  confirmedGuestCount,
  computeCheckInStatus,
  checkInStatusLabel,
} from "@/lib/checkIn/status";

export default function CheckInStatusBadge({
  guest,
  className = "",
}: {
  guest: {
    arrivedCount?: unknown;
    actualArrivedCount?: unknown;
    rsvp?: unknown;
    guestsCount?: unknown;
  };
  className?: string;
}) {
  const status = computeCheckInStatus(guest);
  const label = checkInStatusLabel(status, guest);
  const checkedIn = checkedInGuestCount(guest);
  const confirmed = confirmedGuestCount(guest);

  const tone =
    status === "FULLY_ARRIVED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "PARTIALLY_ARRIVED"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-[#E7DED1] bg-[#F7F3EC] text-[#8A7A68]";

  return (
    <span
      title={`נכנסו ${checkedIn} מתוך ${confirmed} מאושרים`}
      className={`
        inline-flex items-center justify-center min-w-[88px]
        rounded-full border px-2.5 py-1 text-[11px] font-black
        ${tone} ${className}
      `}
    >
      {label}
    </span>
  );
}
