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
      console.log("🎨 EXPORTED CANVAS JSON:", canvasJSON);

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

  const googleApiKey = "AIzaSyACcKM0Zf756koiR1MtC8OtS7xMUdwWjfg";

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-gray-100 relative">
        {/* Sidebar */}
        <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />

        {/* Editor Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Toolbar />

          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <EditorCanvas ref={canvasRef} onSelect={setSelectedObject} />
          </div>

          {/* כפתור שמירה קבוע בתחתית */}
          <div className="absolute bottom-4 right-8 z-50">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-3 rounded-xl text-white font-medium shadow-lg transition-all ${
                saving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              }`}
            >
              {saving ? "שומר..." : "💾 שמור הזמנה"}
            </button>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}
