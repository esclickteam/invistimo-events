"use client";

import { useEffect, useState, useCallback } from "react";

/* ⭐ אותם רכיבים כמו אצל הלקוח */
import GuestSidebar from "@/app/dashboard/seating/GuestSidebar";
import MobileGuests from "@/app/dashboard/seating/MobileGuests";
import SeatingEditor from "@/app/dashboard/seating/SeatingEditor";

/* 🧠 Zustand – מקור אמת */
import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";

type Props = {
  invitationId: string;
};

export default function LiveSeatingTab({ invitationId }: Props) {
  const [loading, setLoading] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  const importSnapshot = useSeatingStore((s) => s.importSnapshot);
  const background = useSeatingStore((s) => s.background);
  const startDragGuest = useSeatingStore((s) => s.startDragGuest);
  const setLiveMode = useSeatingStore((s) => s.setLiveMode);

  const setZones = useZoneStore((s) => s.setZones);

  const cacheKey = invitationId ? `live-seating-${invitationId}` : null;

  /* ===============================
     ✅ LIVE MODE
  =============================== */
  useEffect(() => {
    setLiveMode(true);
    return () => setLiveMode(false);
  }, [setLiveMode]);

  /* ===============================
     ✅ LOAD FROM LOCAL STORAGE
  =============================== */
  useEffect(() => {
    if (!cacheKey) return;

    const cached = localStorage.getItem(cacheKey);
    if (!cached) return;

    try {
      const data = JSON.parse(cached);

      importSnapshot({
        tables: data.tables ?? [],
        guests: data.guests ?? [],
        canvasView: data.canvasView ?? null,
        background: data.background ?? null,
      });

      setZones(data.zones ?? []);
      setEventId(data.eventId ?? null);
      setHasImported(true);
    } catch (e) {
      console.warn("⚠️ Failed to load live seating cache", e);
    }
  }, [cacheKey, importSnapshot, setZones]);

  /* ===============================
     📥 IMPORT – פעם אחת בלבד
  =============================== */
  const importData = useCallback(async () => {
    if (!invitationId) {
      setError("אין מזהה הזמנה");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/live-seating/import?invitationId=${invitationId}`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error("Import failed");

      const json = await res.json();

      importSnapshot({
        tables: json.tables ?? [],
        guests: json.guests ?? [],
        canvasView: json.canvasView ?? null,
        background: json.background ?? null,
      });

      setZones(json.zones ?? []);
      setEventId(json.eventId ?? null);
      setHasImported(true);

      if (cacheKey) {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            eventId: json.eventId ?? null,
            tables: json.tables ?? [],
            guests: json.guests ?? [],
            zones: json.zones ?? [],
            canvasView: json.canvasView ?? null,
            background: json.background ?? null,
          })
        );
      }
    } catch (e) {
      console.error("❌ Import error", e);
      setError("לא נמצאה מפת הושבה");
    } finally {
      setLoading(false);
    }
  }, [invitationId, importSnapshot, setZones, cacheKey]);

  /* ===============================
     ✅ AUTO IMPORT – רק אם ריק
  =============================== */
  useEffect(() => {
  if (!invitationId || hasImported) return;
  importData();
}, [invitationId, hasImported, importData]);


  /* ===============================
     💾 SAVE
  =============================== */
  async function saveSeating() {
    if (!eventId) return;

    const tables = useSeatingStore.getState().tables;
    const guests = useSeatingStore.getState().guests;
    const background = useSeatingStore.getState().background;
    const canvasView = useSeatingStore.getState().canvasView;
    const zones = useZoneStore.getState().zones;

    const res = await fetch(`/api/seating/save/${eventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tables,
        guests,
        background,
        zones,
        canvasView,
      }),
    });

    const data = await res.json();
    alert(data.success ? "🎉 הושבה נשמרה" : "❌ שגיאה בשמירה");

    if (cacheKey) {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          eventId,
          tables,
          guests,
          zones,
          canvasView,
          background,
        })
      );
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] border rounded-xl overflow-hidden bg-[#faf8f4]">
      <div className="flex items-center justify-end gap-3 p-3 border-b bg-white">
        {error && <span className="text-sm text-red-600 ml-auto">{error}</span>}

        {hasImported && (
          <button
            onClick={saveSeating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg"
          >
            💾 שמירת הושבה
          </button>
        )}
      
      </div>

      <div className="flex flex-row-reverse flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {!hasImported ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              טרם יובאה מפת הושבה
            </div>
          ) : (
            <SeatingEditor background={background?.url || null} showStats />
          )}
        </div>

        <div className="w-80 border-l bg-white hidden md:block">
          <GuestSidebar onDragStart={startDragGuest} />
        </div>
      </div>

      <MobileGuests onDragStart={startDragGuest} onClose={() => {}} />
    </div>
  );
}
