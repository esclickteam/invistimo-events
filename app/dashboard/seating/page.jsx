"use client";

import { useState, useEffect } from "react";
import SeatingEditor from "./SeatingEditor";
import UploadBackgroundModal from "./UploadBackgroundModal";
import { useSeatingStore } from "@/store/seatingStore";

export default function SeatingPage() {
  const [background, setBackground] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  const init = useSeatingStore((s) => s.init);

  useEffect(() => {
    async function load() {
      try {
        console.log("🔄 Loading invitation...");

        // 1️⃣ טען הזמנה
        const invRes = await fetch("/api/invitations/my");
        const invData = await invRes.json();
        console.log("📥 invitation response:", invData);

        if (!invData.success || !invData.invitation) {
          console.warn("⚠ No invitation found.");
          return;
        }

        const invitationId = invData.invitation._id;

        // 2️⃣ טען אורחים
        console.log("🔄 Loading guests...");
        const gRes = await fetch(`/api/seating/guests/${invitationId}`);
        const gData = await gRes.json();
        console.log("📥 guests loaded:", gData);

        // ⭐⭐⭐ נורמליזציה — חובה כדי שהגרירה תעבוד ⭐⭐⭐
        const normalizedGuests = (gData.guests || []).map((g) => ({
          id: g._id,                    // ← Zustand דורש id, לא _id
          name: g.name,
          count: g.guestsCount || 1,    // ← מספר מושבים
          tableId: g.tableId || null,   // ← שיוך שולחן אם קיים
        }));

        // 3️⃣ טען טבלאות — מוגן מקריסה
        console.log("🔄 Loading seating tables...");
        let tables = [];

        const tRes = await fetch(`/api/seating/tables/${invitationId}`);

        if (tRes.ok) {
          const tData = await tRes.json();
          tables = tData.tables || [];
          console.log("📥 tables loaded:", tables);
        } else {
          console.warn("⚠ No seating tables found, using empty array.");
        }

        // 4️⃣ העברת הנתונים ל-Zustand
        console.log("🔧 INIT Zustand:", { tables, guests: normalizedGuests });
        init(tables, normalizedGuests);

        console.log("✅ Zustand INIT completed");
      } catch (err) {
        console.error("❌ SeatingPage load error:", err);
      }
    }

    load();
  }, [init]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
        <h1 className="text-xl font-semibold">הושבה באולם</h1>

        <button
          onClick={() => setShowUpload(true)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          העלאת תבנית אולם (PDF/תמונה)
        </button>
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
