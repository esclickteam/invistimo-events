"use client";
import { useLiveSeating } from "./LiveSeatingProvider";

export default function SeatingMapLive() {
  const { state } = useLiveSeating();

  return (
    <div className="flex-1 p-4">
      <h3 className="font-bold mb-2">מפת הושבה</h3>

      {state.tables.map(t => {
        const guests = state.guests.filter(g => g.tableId === t.id);
        const arrived = guests.reduce((s, g) => s + g.arrived, 0);

        return (
          <div
            key={t.id}
            className={`p-4 mb-4 rounded ${
              arrived > 0 ? "bg-green-200" : "bg-gray-200"
            }`}
          >
            {t.name} – {arrived}/{t.capacity}
          </div>
        );
      })}
    </div>
  );
}
