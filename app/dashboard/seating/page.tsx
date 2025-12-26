"use client";

import { useState, useEffect, Suspense } from "react";

import SeatingEditor from "./SeatingEditor";
import UploadBackgroundModal from "./UploadBackgroundModal";
import UpgradePlanModal from "./UpgradePlanModal";
import GuestSidebar from "./GuestSidebar";
import MobileGuests from "./MobileGuests";

import { useSeatingStore } from "@/store/seatingStore";
import { useDemoSeatingStore } from "@/store/store/demoSeatingStore";
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
  tableId?: string | null;
};

interface SeatingPageProps {
  isDemo?: boolean;
}

export default function SeatingPage({ isDemo = false }: SeatingPageProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  // ✅ Drawer של רשימת אורחים במובייל
  const [showGuests, setShowGuests] = useState(false);

  /* ===============================
     STORES
  =============================== */
  const store = isDemo ? useDemoSeatingStore : useSeatingStore;
  const init = store((s) => s.init);
  const tables = store((s) => s.tables);
  const guests = store((s) => s.guests);
  const background = store((s) => s.background);
  const setBackground = store((s) => s.setBackground);

  const setZones = useZoneStore((s) => s.setZones);

  /* ===============================
     LOAD INITIAL DATA
  =============================== */
  useEffect(() => {
    if (isDemo) return; // 🚀 במצב דמו אין טעינה מהשרת

    async function load() {
      try {
        const invRes = await fetch("/api/invitations/my");
        const invData = await invRes.json();

        if (!invData?.success || !invData.invitation) return;

        const id: string = invData.invitation._id;
        setInvitationId(id);

        const gRes = await fetch(`/api/seating/guests/${id}`);
        if (gRes.status === 403) {
          setBlocked(true);
          setShowUpgrade(true);
          return;
        }

        const gData = await gRes.json();

        const normalizedGuests = (gData.guests || []).map(
          (g: GuestDTO) => ({
            id: g._id,
            name: g.name,
            count: g.guestsCount || 1,
            tableId: g.tableId || null,
          })
        );

        const tRes = await fetch(`/api/seating/tables/${id}`);
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
  }, [init, setZones, isDemo]);

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
    store.getState().startDragGuest(guest);
  };

  /* ===============================
     SAVE
  =============================== */
  async function saveSeating() {
    if (isDemo) {
      alert("💡 זהו מצב דמו — שמירה אמיתית אינה פעילה.");
      return;
    }

    if (!invitationId) return;

    const zones = useZoneStore.getState().zones;
    const canvasView = store.getState().canvasView;

    const res = await fetch(`/api/seating/save/${invitationId}`, {
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
  if (blocked && !isDemo) {
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
      {/* ================= HEADER ================= */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 gap-3">
          <h1 className="text-lg sm:text-xl font-semibold">
            {isDemo ? "מצב הדגמה – הושבה באולם" : "הושבה באולם"}
          </h1>

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
              💾 {isDemo ? "שמירה (מדומה)" : "שמירת הושבה"}
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto scrollbar-hide">
          <ZonesToolbar />
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="flex flex-1 overflow-hidden relative md:flex-row-reverse">
        {/* קנבס */}
        <div className="flex-1 relative">
          <SeatingEditor background={background?.url || null} isDemo={isDemo} />

        </div>

        {/* סיידבר – דסקטופ */}
        <aside className="hidden md:block w-72 bg-white border-l">
          <Suspense
            fallback={
              <div className="p-4 text-sm text-gray-400">טוען אורחים...</div>
            }
          >
            <GuestSidebar variant="desktop" onDragStart={handleDragStart} />
          </Suspense>
        </aside>

        {/* כפתור פתיחה למובייל */}
        <button
          onClick={() => setShowGuests(true)}
          className="md:hidden absolute top-16 left-4 bg-white border rounded-lg px-3 py-2 shadow z-40"
        >
          👥 רשימת אורחים
        </button>

        {/* Drawer – מובייל */}
        {showGuests && (
          <Suspense fallback={null}>
            <MobileGuests
              onDragStart={handleDragStart}
              onClose={() => setShowGuests(false)}
            />
          </Suspense>
        )}
      </div>

      {/* ================= MODALS ================= */}
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
