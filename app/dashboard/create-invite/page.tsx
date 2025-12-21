"use client";

import { useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditorCanvas from "./EditorCanvas";
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";
import { useRouter } from "next/navigation";

const queryClient = new QueryClient();

 export default function CreateInvitePage() {
  const canvasRef = useRef<any>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedObject, setSelectedObject] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  /* ===========================================================
      SAVE INVITATION — ייצוא JSON מלא של הקנבס
  ============================================================ */
  const handleSave = async () => {
    try {
      setSaving(true);

      if (!canvasRef.current || !canvasRef.current.getCanvasData) {
        alert("❌ הקנבס לא מוכן לייצוא. ודאי ש-EditorCanvas כולל getCanvasData()");
        return;
      }

      const canvasJSON = canvasRef.current.getCanvasData();

      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: "ההזמנה שלי 🎉",
          canvasData: canvasJSON,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ ההזמנה נשמרה בהצלחה!");
        router.push(`/dashboard/invitations/${data.invitation._id}/preview`);
      } else {
        alert("❌ שגיאה: " + data.error);
      }
    } catch (err) {
      console.error("❌ Error saving invitation:", err);
      alert("❌ שגיאת שרת בשמירה");
    } finally {
      setSaving(false);
    }
  };

  /* ===========================================================
      UPLOAD INVITATION IMAGE → CANVAS
  ============================================================ */
  const handleUploadInvitation = (file: File) => {
    if (!canvasRef.current?.uploadBackground) {
      alert("❌ הקנבס לא מוכן להעלאת רקע");
      return;
    }

    canvasRef.current.uploadBackground(file);
  };

  const googleApiKey = "AIzaSyACcKM0Zf756koiR1MtC8OtS7xMUdwWjfg";

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-gray-100 relative">
        {/* Sidebar */}
        <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />

        {/* Editor Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* ✅ Sticky Top Bar */}
          <div
            className="
              sticky top-0 z-40
              bg-white
              border-b
              px-6 py-3
              flex items-center justify-between
              gap-4
            "
          >
            {/* Upload invitation */}
            <div>
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="
                  px-5 py-2.5
                  rounded-full
                  bg-violet-600
                  text-white
                  font-medium
                  shadow
                  hover:bg-violet-700
                  transition
                "
              >
                ⬆️ העלאת ההזמנה שלי
              </button>

              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadInvitation(file);
                  e.currentTarget.value = "";
                }}
              />
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`
                px-6 py-3
                rounded-full
                text-white
                font-semibold
                shadow
                transition
                flex items-center gap-2
                ${
                  saving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }
              `}
            >
              {saving ? "שומר..." : "💾 שמור הזמנה"}
            </button>
          </div>

          {/* Toolbar */}
          <Toolbar />

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <EditorCanvas ref={canvasRef} onSelect={setSelectedObject} />
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}
