"use client";

import { useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditorCanvas from "./EditorCanvas";
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";

const queryClient = new QueryClient();

export default function CreateInvitePage() {
  const canvasRef = useRef<any>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedObject, setSelectedObject] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const router = useRouter();
  const googleApiKey = "AIzaSyACcKM0Zf756koiR1MtC8OtS7xMUdwWjfg";

  /* ===========================================================
     SAVE INVITATION
  ============================================================ */
  const handleSave = async () => {
    try {
      setSaving(true);

      const canvasJSON = canvasRef.current?.getCanvasData?.();
      if (!canvasJSON) {
        alert("❌ הקנבס לא מוכן");
        return;
      }

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
        router.push(
          `/dashboard/invitations/${data.invitation._id}/preview`
        );
      } else {
        alert(data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  /* ===========================================================
     UPLOAD BACKGROUND
  ============================================================ */
  const handleUploadInvitation = (file: File) => {
    canvasRef.current?.uploadBackground?.(file);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex bg-gray-100 overflow-hidden">
        {/* ================= Desktop Sidebar ================= */}
        <div className="hidden md:block w-[280px] shrink-0 border-l bg-white">
          <Sidebar
            canvasRef={canvasRef}
            googleApiKey={googleApiKey}
          />
        </div>

        {/* ================= Mobile Sidebar Drawer ================= */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-white flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-semibold">כלי עיצוב</span>
              <button onClick={() => setSidebarOpen(false)}>
                <X />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <Sidebar
                canvasRef={canvasRef}
                googleApiKey={googleApiKey}
              />
            </div>
          </div>
        )}

        {/* ================= Editor ================= */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ===== Top Bar ===== */}
          <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center gap-3">
            {/* Mobile menu */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden"
            >
              <Menu />
            </button>

            {/* Upload */}
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="px-4 py-2 rounded-full bg-violet-600 text-white text-sm"
            >
              ⬆️ העלאה
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

            <div className="flex-1" />

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-5 py-2 rounded-full text-white text-sm ${
                saving
                  ? "bg-gray-400"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "שומר..." : "💾 שמור"}
            </button>
          </div>

          {/* ===== Toolbar ===== */}
          <Toolbar />

          {/* ===== Canvas ===== */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-2">
            <EditorCanvas
              ref={canvasRef}
              onSelect={setSelectedObject}
            />
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}
