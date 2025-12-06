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

  // 🎨 כל האובייקטים מהעורך (הקנבס)
  const objects = useEditorStore((s) => s.objects);

  // 🔹 שמירה של ההזמנה
  async function handleSaveInvitation() {
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
        console.log("Invitation ID:", data.invitation._id);

        // מעבירים לתצוגת מקדימה
        router.push(`/dashboard/invitations/${data.invitation._id}/preview`);
      } else {
        alert("שגיאה בשמירה: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("שגיאת שרת");
    } finally {
      setSaving(false);
    }
  }

  // 🔑 מפתח Google Fonts
  const googleApiKey = "AIzaSyACcKM0Zf756koiR1MtC8OtS7xMUdwWjfg";

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <Toolbar />
          <div className="flex-1 flex items-center justify-center p-4">
            <EditorCanvas ref={canvasRef} onSelect={setSelectedObject} />
          </div>

          {/* 💾 כפתור שמירה */}
          <div className="p-4 border-t bg-white flex justify-end">
            <button
              onClick={handleSaveInvitation}
              disabled={saving}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                saving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
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
