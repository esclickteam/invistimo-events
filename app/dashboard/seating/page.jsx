"use client";

import { useState, useEffect } from "react";
import SeatingEditor from "./SeatingEditor";
import UploadBackgroundModal from "./UploadBackgroundModal";
import { useSeatingStore } from "@/store/seatingStore";

export default function SeatingPage() {
  const [background, setBackground] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  const init = useSeatingStore((s) => s.init);
  const tables = useSeatingStore((s) => s.tables);
  const guests = useSeatingStore((s) => s.guests);

  const [invitationId, setInvitationId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        console.log("🔄 Loading invitation...");

        // 1️⃣ טען הזמנה של המשתמש
        const invRes = await fetch("/api/invitations/my");
        const invData = await invRes.json();
        console.log("📥 invitation response:", invData);

        if (!invData.success || !invData.invitation) {
          console.warn("⚠ No invitation found.");
          return;
        }

        const id = invData.invitation._id;
        setInvitationId(id);

        // 2️⃣ טען אורחים
        console.log("🔄 Loading guests...");
        const gRes = await fetch(`/api/seating/guests/${id}`);
        const gData = await gRes.json();
        console.log("📥 guests loaded:", gData);

        const normalizedGuests = (gData.guests || []).map((g) => ({
          id: g._id,
          name: g.name,
          count: g.guestsCount || 1,
          tableId: g.tableId || null,
        }));

        // 3️⃣ טען טבלאות
        console.log("🔄 Loading seating tables...");
        let tables = [];

        const tRes = await fetch(`/api/seating/tables/${id}`);

        if (tRes.ok) {
          const tData = await tRes.json();
          tables = tData.tables || [];
          console.log("📥 tables loaded:", tables);
        } else {
          console.warn("⚠ No seating tables found, using empty array.");
        }

        // 4️⃣ INIT Zustand
        console.log("🔧 INIT Zustand:", { tables, guests: normalizedGuests });
        init(tables, normalizedGuests);

        console.log("✅ Zustand INIT completed");
      } catch (err) {
        console.error("❌ SeatingPage load error:", err);
      }
    }

    load();
  }, [init]);

  // -------------------------------------------------------------------------
  // ⭐⭐⭐ פונקציית שמירת הושבה ⭐⭐⭐
  // -------------------------------------------------------------------------
  async function saveSeating() {
    if (!invitationId) {
      alert("לא נמצאה הזמנה.");
      return;
    }

    try {
      console.log("💾 Saving seating...");
      console.log("📤 Sending tables:", tables);
      console.log("📤 Sending guests:", guests);

      const res = await fetch(`/api/seating/save/${invitationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables, guests }),
      });

      const data = await res.json();
      console.log("📥 Save response:", data);

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

  // -------------------------------------------------------------------------
  // ⭐ COMPONENT RENDER
  // -------------------------------------------------------------------------
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

          {/* ⭐ כפתור שמירת הושבה ⭐ */}
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
        <SeatingEditor background={background} />
      </div>

      {/* UPLOAD MODAL */}
      {showUpload && (
        <UploadBackgroundModal
          onClose={() => setShowUpload(false)}
          onBackgroundSelect={(url) => {
            setBackground(url);
            setShowUpload(false);
          }}
        />
      )}
    </div>
  );
}
