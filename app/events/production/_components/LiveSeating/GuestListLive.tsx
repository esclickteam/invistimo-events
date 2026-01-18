"use client";
import { useLiveSeating } from "./LiveSeatingProvider";
import type { Guest } from "./types";

export default function GuestListLive() {
  const { state, markArrival, cancelReservation } = useLiveSeating();

  return (
    <div style={{ width: 340, borderLeft: "1px solid #ddd", padding: 16 }}>
      <h3>אורחים – לייב</h3>

      {state.guests.map((g: Guest) => (
        <div
          key={g.id}
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 8,
            background:
              g.arrived > 0
                ? "#e6f7ee"
                : g.approved > 0
                ? "#f0f0f0"
                : "#fff",
          }}
        >
          <strong>{g.name}</strong>

          {g.approved > 0 && (
            <div style={{ marginTop: 6 }}>
              הגיעו:
              <input
                type="number"
                min={0}
                max={g.approved}
                value={g.arrived}
                onChange={e => markArrival(g.id, +e.target.value)}
                style={{ width: 60, margin: "0 6px" }}
              />
              / {g.approved}
            </div>
          )}

          {g.approved > 0 && g.arrived === 0 && (
            <button
              onClick={() => cancelReservation(g.id)}
              style={{
                marginTop: 6,
                background: "transparent",
                border: "none",
                color: "#c00",
                cursor: "pointer",
              }}
            >
              ❌ בטל שמירה
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
