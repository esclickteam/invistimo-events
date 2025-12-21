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
  const [showGuests, setShowGuests] = useState(false); // 👈 מובייל
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
        const invRes = await fetch("/api/invitations/my");
        const invData = await invRes.json();
        if (!invData?.success || !invData.invitation) return;

        const id = invData.invitation._id;
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
  }, [init, setZones]);

  /* ===============================
     SAVE
  =============================== */
  async function saveSeating() {
    if (!invitationId) return;

    const zones = useZoneStore.getState().zones;
    const canvasView = useSeatingStore.getState().canvasView;

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
    alert(data.success ? "🎉 נשמר בהצלחה" : "❌ שגיאה");
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
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* ================= HEADER ================= */}
      <div className="sticky top-0 z-30 bg-white border-b">
        <div className="flex flex-col sm:flex-row justify-between px-4 py-3 gap-3">
          <h1 className="text-lg font-semibold">הושבה באולם</h1>

          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg"
            >
              העלאת תבנית
            </button>
            <button
              onClick={saveSeating}
              className="px-3 py-2 bg-green-600 text-white rounded-lg"
            >
              שמירה
            </button>
          </div>
        </div>

        <ZonesToolbar />
      </div>

      {/* ================= MAIN ================= */}
      <div className="flex flex-1 overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden sm:flex w-[280px] bg-white border-l flex-col">
          <div className="flex-1 overflow-y-auto">
            {/* 👈 כאן רשימת האורחים הקיימת שלך */}
          </div>
        </aside>

        {/* CANVAS */}
        <main className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 seating-canvas-wrapper">
            <SeatingEditor background={background?.url || null} />
          </div>
        </main>
      </div>

      {/* ================= MOBILE GUESTS DRAWER ================= */}
      <button
        onClick={() => setShowGuests(true)}
        className="sm:hidden fixed bottom-4 right-4 z-40 bg-black text-white px-4 py-3 rounded-full shadow-lg"
      >
        אורחים
      </button>

      {showGuests && (
        <div className="fixed inset-0 z-50 bg-black/40">
          <div className="absolute bottom-0 left-0 right-0 h-[70%] bg-white rounded-t-3xl flex flex-col">
            <div className="p-4 border-b font-semibold">רשימת אורחים</div>
            <div className="flex-1 overflow-y-auto">
              {/* 👈 אותה רשימת אורחים */}
            </div>
            <button
              onClick={() => setShowGuests(false)}
              className="p-4 text-blue-600"
            >
              סגור
            </button>
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}
      {showUpload && (
        <UploadBackgroundModal
          onClose={() => setShowUpload(false)}
          onBackgroundSelect={(bgUrl: string) => {
            setBackground({ url: bgUrl, opacity: 0.28 });
            setShowUpload(false);
          }}
        />
      )}
    </div>
  );
}
