"use client";

import { useState, useEffect } from "react";
import SeatingEditor from "./SeatingEditor";
import UploadBackgroundModal from "./UploadBackgroundModal";
import { useSeatingStore } from "@/store/seatingStore";

export default function SeatingPage() {
  if (typeof window === "undefined") return null;

  const [showUpload, setShowUpload] = useState(false);
  const [invitationId, setInvitationId] = useState(null);

  // ⭐ רקע אופציונלי – אובייקט או null (בלי טיפוסים!)
  const [background, setBackground] = useState(null);

  const init = useSeatingStore((s) => s.init);
  const tables = useSeatingStore((s) => s.tables);
  const guests = useSeatingStore((s) => s.guests);

  /* ===============================
     LOAD INITIAL DATA
  =============================== */
  useEffect(() => {
    async function load() {
      try {
        const invRes = await fetch("/api/invitations/my");
        const invData = await invRes.json();
        if (!invData.success || !invData.invitation) return;

        const id = invData.invitation._id;
        setInvitationId(id);

        const gRes = await fetch(`/api/seating/guests/${id}`);
        const gData = await gRes.json();

        const normalizedGuests = (gData.guests || []).map((g) => ({
          id: g._id,
          name: g.name,
          count: g.guestsCount || 1,
          tableId: g.tableId || null,
        }));

        const tRes = await fetch(`/api/seating/tables/${id}`);
        const tData = await tRes.json();

        init(tData.tables || [], normalizedGuests);

        // ⭐ טעינת רקע אם קיים
        if (tData.background && tData.background.url) {
          setBackground({
            url: tData.background.url,
            opacity: tData.background.opacity ?? 0.28,
          });
        } else {
          setBackground(null);
        }
      } catch (err) {
        console.error("❌ SeatingPage load error:", err);
      }
    }

    load();
  }, [init]);

  /* ===============================
     SELECT BACKGROUND (אופציונלי)
  =============================== */
  const handleBackgroundSelect = (bgUrl) => {
    if (!bgUrl) return;

    setBackground({
      url: bgUrl,
      opacity: 0.28,
    });
  };

  /* ===============================
     SAVE SEATING (+ רקע אם יש)
  =============================== */
  async function saveSeating() {
    if (!invitationId) {
      alert("לא נמצאה הזמנה.");
      return;
    }

    try {
      const res = await fetch(`/api/seating/save/${invitationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tables,
          guests,
          background, // ⭐ null או אובייקט
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("🎉 ההושבה נשמרה בהצלחה!");
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
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
        <h1 className="text-xl font-semibold">הושבה באולם</h1>

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

      {/* MAIN */}
      <div className="flex-1 overflow-hidden">
        <SeatingEditor background={background?.url || null} />
      </div>

      {/* UPLOAD MODAL */}
      {showUpload && (
        <UploadBackgroundModal
          onClose={() => setShowUpload(false)}
          onBackgroundSelect={(bgUrl) => {
            handleBackgroundSelect(bgUrl);
            setShowUpload(false);
          }}
        />
      )}
    </div>
  );
}
