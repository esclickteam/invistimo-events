"use client";

import { useState, useEffect } from "react";
import SeatingEditor from "./SeatingEditor";
import UploadBackgroundModal from "./UploadBackgroundModal";

import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";

/* ⭐ קומפוננטות עליונות */
import ZonesToolbar from "@/app/components/zones/ZonesToolbar";

export default function SeatingPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [invitationId, setInvitationId] = useState<string | null>(null);

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

        if (!invData.success || !invData.invitation) return;

        const id = invData.invitation._id;
        setInvitationId(id);

        /* ================= אורחים ================= */
        const gRes = await fetch(`/api/seating/guests/${id}`);
        const gData = await gRes.json();

        const normalizedGuests = (gData.guests || []).map((g: any) => ({
          id: g._id,
          name: g.name,
          count: g.guestsCount || 1,
          tableId: g.tableId || null,
        }));

        /* ================= הושבה + רקע + zones ================= */
        const tRes = await fetch(`/api/seating/tables/${id}`);
        const tData = await tRes.json();

        const currentBackground =
          useSeatingStore.getState().background;

        init(
          tData.tables || [],
          normalizedGuests,
          currentBackground ?? tData.background ?? null
        );

        /* ⭐⭐ טעינת zones ל־store */
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

    try {
      const res = await fetch(`/api/seating/save/${invitationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tables,
          guests,
          background,
          zones, // ⭐⭐ כאן האלמנטים נשמרים באמת
        }),
      });

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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ================= HEADER ================= */}
      <div className="border-b bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <h1 className="text-xl font-semibold">
            הושבה באולם
          </h1>

          <div className="flex gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg"
            >
              העלאת תבנית אולם
            </button>

            <button
              onClick={saveSeating}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg"
            >
              💾 שמירת הושבה
            </button>
          </div>
        </div>

        {/* ⭐ סיידבר אלמנטים */}
        <ZonesToolbar />
      </div>

      {/* ================= MAIN ================= */}
      <div className="flex-1 overflow-hidden">
        <SeatingEditor background={background?.url || null} />
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
