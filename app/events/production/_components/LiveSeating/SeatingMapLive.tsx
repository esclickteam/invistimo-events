"use client";
import { useLiveSeating } from "./LiveSeatingProvider";
import type { Guest, Table } from "./types";

export default function SeatingMapLive() {
  const { state } = useLiveSeating();

  return (
    <div style={{ flex: 1, padding: 24 }}>
      <h3>מפת הושבה – לייב</h3>

      {state.tables.map((t: Table) => {
        const guests = state.guests.filter(
          (g: Guest) => g.tableId === t.id && g.approved > 0
        );

        const arrived = guests.reduce(
          (sum: number, g: Guest) => sum + g.arrived,
          0
        );

        const reserved = guests.reduce(
          (sum: number, g: Guest) => sum + (g.approved - g.arrived),
          0
        );

        return (
          <div
            key={t.id}
            style={{
              border: "1px solid #aaa",
              padding: 12,
              marginBottom: 12,
              borderRadius: 10,
              background:
                arrived > 0
                  ? "#e6f7ee"
                  : reserved > 0
                  ? "#f0f0f0"
                  : "#fff",
            }}
          >
            <strong>
              {t.name} — {arrived + reserved}/{t.capacity}
            </strong>

            <div style={{ fontSize: 13, marginTop: 6 }}>
              {guests.map((g: Guest) => (
                <div key={g.id}>
                  {g.name} – {g.arrived}/{g.approved}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
