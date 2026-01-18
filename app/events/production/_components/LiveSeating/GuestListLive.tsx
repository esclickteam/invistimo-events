"use client";

import { useLiveSeating } from "./LiveSeatingProvider";
import { LiveGuest } from "./types";

export default function GuestListLive() {
  const { state, markArrived } = useLiveSeating();

  return (
    <div className="w-80 border-r p-4">
      <h3 className="font-bold mb-2">אורחים</h3>

      {state.guests.map((g: LiveGuest) => (
        <div
          key={g.id}
          className={`p-2 mb-2 rounded ${
            g.arrived > 0
              ? "bg-green-100"
              : "bg-gray-100"
          }`}
        >
          <div>{g.name}</div>
          <input
            type="number"
            min={0}
            max={g.approved}
            value={g.arrived}
            onChange={(e) =>
              markArrived(g.id, Number(e.target.value))
            }
          />
          / {g.approved}
        </div>
      ))}
    </div>
  );
}
