"use client";

import { useEffect, useState, useCallback } from "react";

/* ⭐ אותם רכיבים כמו אצל הלקוח */
import GuestSidebar from "@/app/dashboard/seating/GuestSidebar";
import MobileGuests from "@/app/dashboard/seating/MobileGuests";
import SeatingEditor from "@/app/dashboard/seating/SeatingEditor";
import { useSearchParams } from "next/navigation";
import type { SeatingTable } from "@/types/seating";
import { useRouter } from "next/navigation";

import type { SeatingGuest } from "@/types/seating";




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
  const searchParams = useSearchParams();
const focusGuestId = searchParams.get("focusGuestId");
const router = useRouter();



const tables = useSeatingStore((s) => s.tables);
const setCanvasView = useSeatingStore((s) => s.setCanvasView);


const guests = useSeatingStore((s) => s.guests);
const syncArrivedSeats = useSeatingStore((s) => s.syncArrivedSeats);


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
}, [setLiveMode]);

useEffect(() => {
  if (!guests || guests.length === 0) return;

  guests.forEach((g: SeatingGuest) => {
    const guestId = String(g.id ?? g._id);
    const arrivedCount = Number(g.arrivedCount ?? 0);

    syncArrivedSeats(guestId, arrivedCount);
  });
}, [guests, syncArrivedSeats]);


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


useEffect(() => {
  if (!focusGuestId || !hasImported) return;

  const table = tables.find((t: SeatingTable) =>
    t.seatedGuests?.some(
      (sg) => String(sg.guestId) === String(focusGuestId)
    )
  );

  if (!table) {
    console.warn("❌ NO TABLE FOR GUEST", focusGuestId);
    return;
  }

  useSeatingStore.setState({ highlightedTable: table.id });

  setCanvasView({
    scale: 1,
    x: -table.x + window.innerWidth / 2,
    y: -table.y + window.innerHeight / 2,
  });

  const timeout = setTimeout(() => {
    useSeatingStore.setState({ highlightedTable: null });
  }, 2500);

  // ⭐ ניקוי URL
  router.replace("/events/production?tab=live-seating");

  return () => clearTimeout(timeout);
}, [focusGuestId, hasImported, tables, setCanvasView, router]);






  /* ===============================
     💾 SAVE
  =============================== */
 async function saveSeating() {
  if (!eventId || loading) return;

  setLoading(true); // ✅ הוספה

  try {
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
  } finally {
    setLoading(false); // ✅ הוספה
  }
}


  return (
  <div className="fixed top-[64px] left-0 right-0 bottom-0 flex flex-col bg-[#faf8f4] z-0">

    {/* TOP BAR */}
    <div className="flex items-center justify-between gap-3 p-3 border-b bg-white shrink-0">

      {error && <span className="text-sm text-red-600 ml-auto">{error}</span>}




    </div>

    {/* MAIN AREA */}
    <div className="flex flex-row-reverse flex-1 min-h-0">
      {/* CANVAS */}
     

      <div className="flex-1 relative overflow-hidden">

  {/* 🔧 ACTION BAR – הוסף שולחן + שמירה */}
  <div className="absolute top-24 left-4 z-20 flex items-center gap-2">


    
 

    {/* 💾 שמירת הושבה */}
    {hasImported && (
      <button
        onClick={saveSeating}
        disabled={!eventId || loading}
        className={`px-4 py-2 rounded-lg font-medium transition
          ${
            !eventId || loading
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }
        `}
      >
        {loading ? "שומר..." : "💾 שמירה"}
      </button>
    )}

  </div>

  {!hasImported ? (
    <div className="flex items-center justify-center h-full text-gray-500">
      טרם יובאה מפת הושבה
    </div>
  ) : (
    <SeatingEditor
      background={background?.url || null}
      readOnly={false}
      showStats
      
    />
  )}
</div>


      {/* SIDEBAR */}
      <div className="w-80 border-l bg-white hidden md:block shrink-0">
        <GuestSidebar onDragStart={startDragGuest} />
      </div>
    </div>

    {/* MOBILE */}
    <MobileGuests onDragStart={startDragGuest} onClose={() => {}} />
  </div>
);


}
