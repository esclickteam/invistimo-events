"use client";

import { useState, useEffect } from "react";

import SeatingEditor from "./SeatingEditor";
import UploadBackgroundModal from "./UploadBackgroundModal";
import UpgradePlanModal from "./UpgradePlanModal";

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
  tableId?: string | null;
};

export default function SeatingPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  /* ===============================
     STORES
  =============================== */
  const init = useSeatingStore((s) => s.init);
  const tables = useSeatingStore((s) => s.tables);
  const guests = useSeatingStore((s) => s.guests);

  const background = useSeatingStore((s) => s.background);
  const setBackground = useSeatingStore((s) => s.setBackground);

  const setZones = useZoneStore((s) => s.setZones);

  /* ===============================
     LOAD INITIAL DATA
  =============================== */
  useEffect(() => {
    async function load() {
      try {
        /* ================= הזמנה ================= */
        const invRes = await fetch("/api/invitations/my");
        const invData = await invRes.json();

        if (!invData?.success || !invData.invitation) return;

        const id: string = invData.invitation._id;
        setInvitationId(id);

        /* ================= אורחים ================= */
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

        /* ================= הושבה + רקע + zones ================= */
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
  }, [init, setZones]);

  /* ===============================
     SELECT BACKGROUND
  =============================== */
  const handleBackgroundSelect = (bgUrl: string) => {
    if (!bgUrl) return;

    setBackground({
      url: bgUrl,
      opacity: 0.28,
    });
  };

  /* ===============================
     SAVE SEATING (כולל ZONES)
  =============================== */
  async function saveSeating() {
    if (!invitationId) {
      alert("לא נמצאה הזמנה.");
      return;
    }

    const zones = useZoneStore.getState().zones;
    const canvasView = useSeatingStore.getState().canvasView;

    try {
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

      if (data.success) {
        alert("🎉 ההושבה והאלמנטים נשמרו בהצלחה!");
      } else {
        alert("❌ שגיאה בשמירה");
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      alert("⚠ שמירה נכשלה!");
    }
  }

  /* ===============================
     BLOCKED VIEW
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
              כדי להשתמש במערכת ההושבה והאלמנטים החכמים,
              יש לשדרג לחבילת פרימיום.
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

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* ================= HEADER ================= */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 gap-3">
          <h1 className="text-lg sm:text-xl font-semibold">
            הושבה באולם
          </h1>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg w-full sm:w-auto"
            >
              העלאת תבנית אולם
            </button>

            <button
              onClick={saveSeating}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg w-full sm:w-auto"
            >
              💾 שמירת הושבה
            </button>
          </div>
        </div>

        {/* ⭐ Toolbar אלמנטים – רספונסיבי */}
        <div className="w-full overflow-x-auto scrollbar-hide">
          <ZonesToolbar />
        </div>
      </div>

      {/* ================= MAIN CANVAS ================= */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          <SeatingEditor background={background?.url || null} />
        </div>
      </div>

      {/* ================= UPLOAD MODAL ================= */}
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
