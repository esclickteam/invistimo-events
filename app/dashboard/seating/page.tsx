"use client";

import { useState, useEffect, Suspense } from "react";

import SeatingEditor from "./SeatingEditor";
import UploadBackgroundModal from "./UploadBackgroundModal";
import UpgradePlanModal from "./UpgradePlanModal";
import GuestSidebar from "./GuestSidebar";
import MobileGuests from "./MobileGuests";

import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";
import ExportSeatingPdf from "./ExportSeatingPdf";


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

type TableLite = { x: number; y: number };


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

    const canvasView = useSeatingStore((s) => s.canvasView);
  const setCanvasView = useSeatingStore((s) => s.setCanvasView);


  const setZones = useZoneStore((s) => s.setZones);

  /* ===============================
     LOAD INITIAL DATA
  =============================== */
  useEffect(() => {
    async function load() {
      try {
        /* 🧹 איפוס מוחלט לפני טעינה */
        useSeatingStore.getState().init([], [], null, null);
        useZoneStore.getState().setZones([]);

        /* 1️⃣ מביאים הזמנה רק כדי לקבל eventId */
        const invRes = await fetch("/api/invitations/my");
        const invData = await invRes.json();

        if (!invData?.success || !invData.invitation?.eventId) return;

        const eventIdFromApi: string = invData.invitation.eventId;
        setEventId(eventIdFromApi);

        /* 2️⃣ אורחים – לפי eventId */
        const gRes = await fetch(`/api/seating/guests/${eventIdFromApi}`);
        if (gRes.status === 403) {
          setBlocked(true);
          setShowUpgrade(true);
          return;
        }

        const gData = await gRes.json();

        const normalizedGuests = (gData.guests || []).map((g: GuestDTO) => ({
  id: g._id,
  name: g.name,
  rsvp: g.rsvp,              // ✅ זה היה חסר
  guestsCount: g.guestsCount,
  arrivedCount: g.arrivedCount,
  count:
    g.rsvp === "yes"
      ? g.arrivedCount || g.guestsCount || 1
      : g.guestsCount || 1,
}));

        /* 3️⃣ שולחנות + אזורים + קנבס */
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
  }, [init, setZones]);

  const tablesLite = tables as unknown as TableLite[];


    /* ===============================
     AUTO FIT (ONE TIME) – only if no saved canvasView
  =============================== */
  useEffect(() => {
  if (!tablesLite?.length) return;

  const isDefault =
    !canvasView ||
    (canvasView.scale === 1 && canvasView.x === 0 && canvasView.y === 0);

  if (!isDefault) return;

  const minX = Math.min(...tablesLite.map((t) => t.x));
  const maxX = Math.max(...tablesLite.map((t) => t.x));
  const minY = Math.min(...tablesLite.map((t) => t.y));
  const maxY = Math.max(...tablesLite.map((t) => t.y));


    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);

    // padding נעים מסביב
    const PAD = 400;

    // הערכה סבירה למסך (ה־Stage שלך כמעט תמיד סביב זה)
    const VIEW_W = 1200;
    const VIEW_H = 700;

    const scale = Math.max(
      0.4,
      Math.min(3, Math.min(VIEW_W / (contentW + PAD), VIEW_H / (contentH + PAD)))
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const x = VIEW_W / 2 - centerX * scale;
    const y = VIEW_H / 2 - centerY * scale;

    console.log("🟣 AutoFit canvasView:", { x, y, scale });

    setCanvasView({ x, y, scale });
  }, [tablesLite, canvasView, setCanvasView]);



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
    const cv = useSeatingStore.getState().canvasView;


    const res = await fetch(`/api/seating/save/${eventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tables,
        guests,
        background,
        zones,
        canvasView: cv,
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
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden pb-20">

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

      <ExportSeatingPdf eventId={eventId} />

    </div>
  </div>

  {/* ⬅️ זה ה־div שחייב להיסגר */}
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


{/* ===============================
    STICKY SAVE BAR
=============================== */}
<div
  className="
    fixed bottom-0 inset-x-0 z-40
    bg-white
    border-t border-gray-200
    shadow-[0_-4px_12px_rgba(0,0,0,0.06)]
  "
>
  <div className="max-w-7xl px-4 py-3 flex justify-end">



    <button
      onClick={saveSeating}
      className="
        px-6 py-2 rounded-full
        bg-green-600 text-white
        font-semibold
        hover:bg-green-700
        transition
      "
    >
      💾 שמירת הושבה
    </button>
  </div>
</div>




    </div>
  );
}
