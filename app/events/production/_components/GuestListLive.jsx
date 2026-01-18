"use client";

import { useLiveGuests } from "./LiveGuestsProvider";

export default function GuestListLive() {
  const { state, setState } = useLiveGuests();

  async function updateStatus(guestId, arrivalStatus) {
    try {
      const res = await fetch(`/api/guests/${guestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ arrivalStatus }),
      });

      if (!res.ok) {
        throw new Error("Update failed");
      }

      // עדכון UI מקומי
      setState((prev) => {
        const guests = prev.guests.map((g) =>
          g._id === guestId
            ? { ...g, arrivalStatus }
            : g
        );

        return {
          ...prev,
          guests,
        };
      });
    } catch (e) {
      alert("לא ניתן לעדכן סטטוס אורח");
    }
  }

  return (
    <div className="border rounded">
      {state.guests.map((g) => (
        <div
          key={g._id}
          className="flex justify-between p-3 border-b"
        >
          <div>
            <div className="font-semibold">{g.name}</div>
            <div className="text-xs text-gray-500">
              {g.phone}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => updateStatus(g._id, "arrived")}
              className={`px-2 py-1 text-xs rounded ${
                g.arrivalStatus === "arrived"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100"
              }`}
            >
              הגיע
            </button>

            <button
              onClick={() => updateStatus(g._id, "not-arrived")}
              className={`px-2 py-1 text-xs rounded ${
                g.arrivalStatus === "not-arrived"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-100"
              }`}
            >
              לא הגיע
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
