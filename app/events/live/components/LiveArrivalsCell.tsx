"use client";

import { useState, useEffect } from "react";

type Props = {
  guestId: string;
  invitationId: string;
  fallback: number; // guestsCount
};

export default function LiveArrivalsCell({
  guestId,
  invitationId,
  fallback,
}: Props) {
  const [count, setCount] = useState<number>(fallback);

  // טעינה ראשונית
  useEffect(() => {
    async function load() {
      const res = await fetch(
        `/api/livearrivals/one?guestId=${guestId}&invitation=${invitationId}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data.success && typeof data.arrivedCount === "number") {
        setCount(data.arrivedCount);
      }
    }

    load();
  }, [guestId, invitationId]);

  async function update(newCount: number) {
    const safe = Math.max(0, newCount);
    setCount(safe);

    await fetch("/api/livearrivals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestId,
        invitationId,
        arrivedCount: safe,
      }),
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => update(count - 1)}
        className="px-2 border rounded"
      >
        −
      </button>

      <span className="min-w-[24px] text-center font-semibold">
        {count}
      </span>

      <button
        onClick={() => update(count + 1)}
        className="px-2 border rounded"
      >
        +
      </button>
    </div>
  );
}
