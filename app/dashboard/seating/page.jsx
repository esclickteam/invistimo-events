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
      // 1️⃣ טוען את ההזמנה של המשתמש
      const res = await fetch("/api/invitations/my");
      const data = await res.json();
      if (!data.success || !data.invitation) return;

      const invitationId = data.invitation._id;

      // 2️⃣ טוען אורחים של אותה הזמנה
      const gRes = await fetch(`/api/seating/guests/${invitationId}`);
      const gData = await gRes.json();

      // 3️⃣ טוען שולחנות הושבה (אם קיימים)
      const tRes = await fetch(`/api/seating/tables/${invitationId}`);
      const tData = await tRes.json();

      // 4️⃣ מכניס ל־Zustand
      init(tData.tables || [], gData.guests || []);
    }

    load();
  }, [init]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
        <h1 className="text-xl font-semibold">הושבה באולם</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            העלאת תבנית אולם (PDF/תמונה)
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <SeatingEditor background={background} />
      </div>

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
