"use client";

import { X } from "lucide-react";
import GuestSidebar from "./GuestSidebar";
import { useSeatingStore } from "@/store/seatingStore";

export default function MobileGuests({ onDragStart, onClose }) {
  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);

  return (
    <div className="fixed inset-0 z-[10003] md:hidden">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* drawer */}
      <div className="absolute right-0 top-0 h-full w-[85%] bg-white flex flex-col shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-semibold">🧾 רשימת אורחים</span>
          <button
            onClick={onClose}
            aria-label="סגור רשימת אורחים"
            className="p-1"
          >
            <X />
          </button>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto">
          <GuestSidebar
            variant="mobile"
            onDragStart={onDragStart}
            onSeat={(guestId, tableId) =>
              assignGuestBlock({ guestId, tableId })
            }
            onUnseat={(guestId) => removeFromSeat(guestId)}
          />
        </div>
      </div>
    </div>
  );
}
