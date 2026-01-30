"use client";

import { useState, useEffect } from "react";

type Props = {
  guestId: string;
  invitationId: string;
  fallback: number; // guestsCount
  onChange?: (guestId: string, arrivedCount: number) => void; // ⭐ חדש
};

export default function LiveArrivalsCell({
  guestId,
  invitationId,
  fallback,
  onChange,
}: Props) {
  const [count, setCount] = useState<number>(fallback);
  const [loading, setLoading] = useState(false);

  /* ===============================
     טעינה ראשונית (מגיעים בפועל)
  =============================== */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/livearrivals/one?guestId=${guestId}&invitation=${invitationId}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (data.success && typeof data.arrivedCount === "number") {
          setCount(data.arrivedCount);
          onChange?.(guestId, data.arrivedCount); // ⭐ סנכרון למעלה
        }
      } catch (err) {
        console.error("LiveArrivalsCell load error:", err);
      }
    }

    load();
  }, [guestId, invitationId, onChange]);

  /* ===============================
     עדכון נוכחות
  =============================== */
  async function update(newCount: number) {
    const safe = Math.max(0, newCount);

    setCount(safe);
    onChange?.(guestId, safe); // ⭐ עדכון מיידי ל־UI

    try {
      setLoading(true);

      await fetch("/api/livearrivals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId,
          invitationId,
          arrivedCount: safe,
        }),
      });
    } catch (err) {
      console.error("LiveArrivalsCell update error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => update(count - 1)}
        className="px-2 border rounded disabled:opacity-50"
      >
        −
      </button>

      <span className="min-w-[24px] text-center font-semibold">
        {count}
      </span>

      <button
        type="button"
        disabled={loading}
        onClick={() => update(count + 1)}
        className="px-2 border rounded disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
