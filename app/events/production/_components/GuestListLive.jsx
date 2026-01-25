"use client";

import { useLiveGuests } from "./LiveGuestsProvider";
import { useSeatingStore } from "@/store/seatingStore";

export default function GuestListLive() {
  const { state, updateGuestStatus } = useLiveGuests();

  // ✅ סנכרון ללייב Sidebar דרך Zustand (לא נוגע ב-rsvp)
  const updateGuestArrived = useSeatingStore((s) => s.updateGuestArrived);

  if (!state) return null;

  const { guests } = state;

  if (!guests.length) {
    return <div className="p-4 text-gray-500">אין אורחים להצגה</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto border rounded">
      {guests.map((guest) => (
        <div
          key={guest._id}
          className="flex items-center justify-between px-4 py-3 border-b last:border-b-0"
        >
          <div>
            <div className="font-semibold">{guest.name}</div>
            {guest.phone && (
              <div className="text-xs text-gray-500">{guest.phone}</div>
            )}
          </div>

          <div className="flex gap-2">
            <StatusButton
              active={guest.status === "arrived"}
              onClick={() => {
                // ✅ ממשיך לעדכן את ה-provider (כמו שהיה)
                updateGuestStatus(guest._id, "arrived");
                // ✅ מעדכן את ה-seatingStore כדי שה-sidebar יתעדכן בלייב
                updateGuestArrived(guest._id, 1);
              }}
            >
              הגיע
            </StatusButton>

            <StatusButton
              active={guest.status === "not-arrived"}
              onClick={() => {
                updateGuestStatus(guest._id, "not-arrived");
                updateGuestArrived(guest._id, 0);
              }}
            >
              לא הגיע
            </StatusButton>

            <StatusButton
              active={guest.status === "cancelled"}
              onClick={() => {
                updateGuestStatus(guest._id, "cancelled");
                updateGuestArrived(guest._id, 0);
              }}
            >
              ביטל
            </StatusButton>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded border ${
        active
          ? "bg-black text-white border-black"
          : "bg-white text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
