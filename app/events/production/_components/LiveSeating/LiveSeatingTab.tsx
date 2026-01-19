"use client";

import { useEffect, useState } from "react";

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

  const setZones = useZoneStore((s) => s.setZones);

  const cacheKey = invitationId ? `live-seating-${invitationId}` : null;

  useEffect(() => {
    console.log("🟡 [Producer LiveSeatingTab] mounted", invitationId);
  }, [invitationId]);

  /* ===============================
     ✅ LOAD FROM SESSION (so no re-import when switching tabs)
  =============================== */
  useEffect(() => {
    if (!cacheKey) return;

    const cached = sessionStorage.getItem(cacheKey);
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
     IMPORT SNAPSHOT
  =============================== */
  async function importData() {
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

      console.log("✅ Producer snapshot imported", {
        eventId: json.eventId,
        tables: json.tables?.length ?? 0,
        guests: json.guests?.length ?? 0,
        zones: json.zones?.length ?? 0,
      });

      /* 🔑 מקור אמת – seatingStore */
      importSnapshot({
        tables: json.tables ?? [],
        guests: json.guests ?? [],
        canvasView: json.canvasView ?? null,
        background: json.background ?? null,
      });

      /* 🧭 zones */
      setZones(json.zones ?? []);

      /* 🔑 eventId לשמירה */
      setEventId(json.eventId);

      /* ✅ mark imported */
      setHasImported(true);

      /* ✅ cache it so it won't disappear on tab switch */
      if (cacheKey) {
        sessionStorage.setItem(
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
      console.error("❌ Producer import error", e);
      setError("לא נמצאה מפת הושבה");
    } finally {
      setLoading(false);
    }
  }

  /* ===============================
     SAVE (אותו save כמו לקוח)
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

    // ✅ update cache after save (so UI stays consistent)
    if (cacheKey) {
      sessionStorage.setItem(
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
      {/* 🔘 HEADER */}
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

        <button
          onClick={importData}
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-60"
        >
          {loading ? "מייבא..." : "📥 ייבוא הושבה"}
        </button>
      </div>

      {/* 🗺️ CONTENT */}
      <div className="flex flex-row-reverse flex-1 overflow-hidden">
        {/* 🗺️ מפת הושבה */}
        <div className="flex-1 relative">
          {!hasImported ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              טרם יובאה מפת הושבה
            </div>
          ) : (
            <SeatingEditor background={background?.url || null} showStats />
          )}
        </div>

        {/* 👥 אורחים – אותו Sidebar כמו לקוח */}
        <div className="w-80 border-l bg-white hidden md:block">
          <GuestSidebar onDragStart={startDragGuest} />
        </div>
      </div>

      {/* 📱 מובייל – אותו רכיב כמו לקוח */}
      <MobileGuests onDragStart={startDragGuest} onClose={() => {}} />
    </div>
  );
}
