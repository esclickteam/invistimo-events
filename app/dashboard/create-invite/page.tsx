"use client";

import { useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditorCanvas from "./EditorCanvas";
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";
import { useEditorStore } from "./editorStore";
import { useRouter } from "next/navigation";

const queryClient = new QueryClient();

export default function CreateInvitePage() {
  const canvasRef = useRef<any>(null);
  const [selectedObject, setSelectedObject] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const objects = useEditorStore((s) => s.objects);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "ההזמנה שלי 🎉",
          canvasData: objects,
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
      console.error(err);
      alert("❌ שגיאת שרת בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const googleApiKey = "AIzaSyACcKM0Zf756koiR1MtC8OtS7xMUdwWjfg";

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Toolbar />
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <EditorCanvas ref={canvasRef} onSelect={setSelectedObject} />
          </div>

          {/* כפתור שמירה - מופרד לגמרי מהקנבס */}
          <div className="p-4 bg-white border-t text-right">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-2 rounded-lg text-white font-medium transition ${
                saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
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
