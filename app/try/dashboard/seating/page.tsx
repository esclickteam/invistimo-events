"use client";

import { useEffect, useRef } from "react";
import SeatingPage from "@/app/dashboard/seating/page";
import { useSeatingStore } from "@/store/seatingStore";

export default function DemoSeatingPage() {
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let baseline = "";
    const signatureOf = () =>
      JSON.stringify(
        (useSeatingStore.getState().tables || []).map((table: { id?: string; seatedGuests?: Array<{ guestId?: string }> }) => [
          table.id,
          (table.seatedGuests || []).map((seat) => `${seat.guestId}`),
        ])
      );

    async function load() {
      const res = await fetch("/api/demo/interactive", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (cancelled || !data?.session) return;
      useSeatingStore.getState().hydrateDemoSession(data.session);
      baseline = signatureOf();
      hydrated.current = true;
    }

    load();
    const onSync = () => {
      if (!hydrated.current) void load();
    };
    window.addEventListener("invistimo:demo-sync", onSync);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useSeatingStore.subscribe(() => {
      if (!hydrated.current) return;
      const signature = signatureOf();
      if (!baseline) {
        baseline = signature;
        return;
      }
      if (signature === baseline) return;
      baseline = signature;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const tables = useSeatingStore.getState().tables || [];
        void fetch("/api/demo/interactive/action", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "syncSeating", tables }),
        }).then(() => {
          window.dispatchEvent(
            new CustomEvent("invistimo:demo-action", { detail: { action: "seat-guest" } })
          );
          window.dispatchEvent(new CustomEvent("invistimo:demo-sync"));
        });
      }, 400);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("invistimo:demo-sync", onSync);
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return <SeatingPage />;
}
