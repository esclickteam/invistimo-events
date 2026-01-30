"use client";

import { useState, useEffect } from "react";

type Props = {
  guestId: string;
  invitationId: string;
  fallback: number; // guestsCount
  onChange?: (guestId: string, arrivedCount: number) => void;
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
     טעינה ראשונית – הגיעו בפועל
     ⭐ רק ביום אירוע
  =============================== */
  useEffect(() => {
    if (!guestId || !invitationId) return;

    async function load() {
      try {
        const res = await fetch(
          `/api/live-arrivals/one?guestId=${guestId}&invitationId=${invitationId}`,
          {
            cache: "no-store",
            credentials: "include", // ⭐ חשוב
          }
        );

        const data = await res.json();

        if (data.success && typeof data.arrivedCount === "number") {
          setCount(data.arrivedCount);
          onChange?.(guestId, data.arrivedCount); // ⭐ סנכרון למעלה
        }
      } catch (err) {
        console.error("❌ LiveArrivalsCell load error:", err);
      }
    }

    load();
  }, [guestId, invitationId, onChange]);

  /* ===============================
     עדכון הגיעו בפועל
  =============================== */
  async function update(newCount: number) {
    const safe = Math.max(0, newCount);

    // 🟢 UI אופטימי
    setCount(safe);
    onChange?.(guestId, safe);

    try {
      setLoading(true);

      const res = await fetch("/api/live-arrivals/arrived", {
        method: "PATCH", // ⭐ תואם ל־API שלך
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          guestId,
          invitationId,
          arrivedCount: safe,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error("Live arrival update failed");
      }
    } catch (err) {
      console.error("❌ LiveArrivalsCell update error:", err);
      // אין rollback – זה לייב
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={loading || count <= 0}
        onClick={() => update(count - 1)}
        className="w-8 h-8 rounded-full border border-gray-300 text-lg
                   hover:bg-gray-50 transition disabled:opacity-30"
        title="הפחת אחד שהגיע"
      >
        −
      </button>

      <span className="min-w-[32px] text-center font-semibold">
        {count}
      </span>

      <button
        type="button"
        disabled={loading}
        onClick={() => update(count + 1)}
        className="w-8 h-8 rounded-full bg-green-600 text-white text-lg
                   hover:bg-green-700 transition disabled:opacity-40"
        title="הוסף אחד שהגיע"
      >
        +
      </button>
    </div>
  );
}
