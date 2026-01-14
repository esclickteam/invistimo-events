"use client";

import { useState, useEffect, Suspense } from "react";

import SeatingEditor from "./SeatingEditor";
import UploadBackgroundModal from "./UploadBackgroundModal";
import UpgradePlanModal from "./UpgradePlanModal";
import GuestSidebar from "./GuestSidebar";
import MobileGuests from "./MobileGuests";
import { useParams } from "next/navigation";

import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";

/* ⭐ קומפוננטות עליונות */
import ZonesToolbar from "@/app/components/zones/ZonesToolbar";

/* ===============================
   TYPES
=============================== */
type GuestDTO = {
  _id: string;
  name: string;
  guestsCount?: number;
  arrivedCount?: number;
  rsvp?: "yes" | "no" | "pending";
};

export default function SeatingPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  /* Drawer אורחים במובייל */
  const [showGuests, setShowGuests] = useState(false);

  /* ===============================
     STORES
  =============================== */
  const init = useSeatingStore((s) => s.init);
  const tables = useSeatingStore((s) => s.tables);
  const guests = useSeatingStore((s) => s.guests);

  const background = useSeatingStore((s) => s.background);
  const setBackground = useSeatingStore((s) => s.setBackground);
  const params = useParams();

const invitationId = Array.isArray(params?.invitationId)
  ? params.invitationId[0]
  : (params?.invitationId as string);

  const setZones = useZoneStore((s) => s.setZones);

  /* ===============================
     LOAD INITIAL DATA
  =============================== */
  useEffect(() => {
  async function load() {
    try {
      if (!invitationId) return;

      /* 🧹 איפוס מוחלט לפני טעינה */
      useSeatingStore.getState().init([], [], null, null);
      useZoneStore.getState().setZones([]);

      const invRes = await fetch(`/api/invitations/${invitationId}`);
      const invData = await invRes.json();

      if (!invData?.success || !invData.invitation?.eventId) {
        console.warn("❌ Invitation not found for seating");
        return;
      }

      const eventIdFromApi: string = invData.invitation.eventId;
      setEventId(eventIdFromApi);

      const gRes = await fetch(`/api/seating/guests/${eventIdFromApi}`);
      if (gRes.status === 403) {
        setBlocked(true);
        setShowUpgrade(true);
        return;
      }

      const gData = await gRes.json();

      const normalizedGuests = (gData.guests || []).map((g: GuestDTO) => {
  const guestsCount =
    g.guestsCount && g.guestsCount > 0 ? g.guestsCount : 1;

  return {
    id: g._id,
    name: g.name,

    // ⭐ חשוב: אחידות עם כל המערכת
    guestsCount,
    count: guestsCount,
  };
});

      const tRes = await fetch(`/api/seating/tables/${eventIdFromApi}`);
      if (tRes.status === 403) {
        setBlocked(true);
        setShowUpgrade(true);
        return;
      }

      const tData = await tRes.json();

      init(
        tData.tables || [],
        normalizedGuests,
        tData.background ?? null,
        tData.canvasView ?? null
      );

      setZones(tData.zones || []);
    } catch (err) {
      console.error("❌ SeatingPage load error:", err);
    }
  }

  load();
}, [invitationId, init, setZones]);



  /* ===============================
     BACKGROUND
  =============================== */
  const handleBackgroundSelect = (bgUrl: string) => {
    if (!bgUrl) return;
    setBackground({ url: bgUrl, opacity: 0.28 });
  };

  /* ===============================
     DRAG HANDLER
  =============================== */
  const handleDragStart = (guest: any) => {
    useSeatingStore.getState().startDragGuest(guest);
  };

  /* ===============================
     SAVE
  =============================== */
  async function saveSeating() {
    if (!eventId) return;

    const zones = useZoneStore.getState().zones;
    const canvasView = useSeatingStore.getState().canvasView;

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

    if (res.status === 403) {
      setBlocked(true);
      setShowUpgrade(true);
      return;
    }

    const data = await res.json();
    alert(data.success ? "🎉 נשמר בהצלחה" : "❌ שגיאה בשמירה");
  }

  /* ===============================
     BLOCKED
  =============================== */
  if (blocked) {
    return (
      <>
        <div className="flex items-center justify-center h-screen bg-[#faf8f4]">
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
            <h2 className="text-2xl font-semibold mb-3">
              הושבה אינה כלולה בחבילה שלך
            </h2>
            <p className="text-gray-600 mb-6">
              כדי להשתמש במערכת ההושבה יש לשדרג לחבילת פרימיום.
            </p>
            <button
              onClick={() => setShowUpgrade(true)}
              className="px-5 py-2 bg-black text-white rounded-lg"
            >
              שדרוג חבילה
            </button>
          </div>
        </div>

        <UpgradePlanModal
          isOpen={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          currentPaid={49}
        />
      </>
    );
  }

  /* ===============================
     RENDER
  =============================== */
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 gap-3">
          <h1 className="text-lg sm:text-xl font-semibold">הושבה באולם</h1>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg"
            >
              העלאת תבנית אולם
            </button>

            <button
              onClick={saveSeating}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg"
            >
              💾 שמירת הושבה
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto scrollbar-hide">
          <ZonesToolbar />
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 overflow-hidden relative md:flex-row-reverse">
        <div className="flex-1 relative">
          <SeatingEditor background={background?.url || null} />
        </div>

        <aside className="hidden md:block w-72 bg-white border-l">
          <Suspense
            fallback={
              <div className="p-4 text-sm text-gray-400">
                טוען אורחים...
              </div>
            }
          >
            <GuestSidebar
              variant="desktop"
              onDragStart={handleDragStart}
            />
          </Suspense>
        </aside>

        <button
          onClick={() => setShowGuests(true)}
          className="md:hidden absolute top-16 left-4 bg-white border rounded-lg px-3 py-2 shadow z-40"
        >
          👥 רשימת אורחים
        </button>

        {showGuests && (
          <Suspense fallback={null}>
            <MobileGuests
              onDragStart={handleDragStart}
              onClose={() => setShowGuests(false)}
            />
          </Suspense>
        )}
      </div>

      {/* MODALS */}
      {showUpload && (
        <UploadBackgroundModal
          onClose={() => setShowUpload(false)}
          onBackgroundSelect={(bgUrl: string) => {
            handleBackgroundSelect(bgUrl);
            setShowUpload(false);
          }}
        />
      )}
    </div>
  );
}
