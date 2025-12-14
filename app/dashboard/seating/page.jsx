"use client";

import { useState, useEffect } from "react";
import SeatingEditor from "./SeatingEditor";
import UploadBackgroundModal from "./UploadBackgroundModal";
import { useSeatingStore } from "@/store/seatingStore";

export default function SeatingPage() {
  if (typeof window === "undefined") return null;

  const [showUpload, setShowUpload] = useState(false);
  const [invitationId, setInvitationId] = useState(null);

  const init = useSeatingStore((s) => s.init);
  const tables = useSeatingStore((s) => s.tables);
  const guests = useSeatingStore((s) => s.guests);
  const setTables = useSeatingStore((s) => s.setTables);

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

        let loadedTables = [];
        const tRes = await fetch(`/api/seating/tables/${id}`);
        if (tRes.ok) {
          const tData = await tRes.json();
          loadedTables = tData.tables || [];
        }

        init(loadedTables, normalizedGuests);
      } catch (err) {
        console.error("❌ SeatingPage load error:", err);
      }
    }

    load();
  }, [init]);

  /* =========================================================
     ⭐ הוספת / החלפת תבנית אולם ⭐
  ========================================================= */
  const handleBackgroundSelect = ({ image, url }) => {
    const currentTables = useSeatingStore.getState().tables || [];

    // הסרת תבנית אולם קודמת
    const withoutHallTemplate = currentTables.filter(
      (t) => !t.isHallTemplate
    );

    const hallTemplate = {
      id: `hall-bg-${Date.now()}`,
      type: "image",
      image, // להצגה מיידית
      url,   // ⭐ לשמירה
      isHallTemplate: true,
    };

    setTables([hallTemplate, ...withoutHallTemplate]);
  };

  /* =========================================================
     💾 שמירת הושבה
  ========================================================= */
  async function saveSeating() {
    if (!invitationId) {
      alert("לא נמצאה הזמנה.");
      return;
    }

    try {
      const res = await fetch(`/api/seating/save/${invitationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables, guests }),
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
        <SeatingEditor />
      </div>

      {/* UPLOAD MODAL */}
      {showUpload && (
        <UploadBackgroundModal
          onClose={() => setShowUpload(false)}
          onBackgroundSelect={(data) => {
            handleBackgroundSelect(data);
            setShowUpload(false);
          }}
        />
      )}
    </div>
  );
}
