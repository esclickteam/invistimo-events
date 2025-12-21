"use client";

import { useRef, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditorCanvas from "./EditorCanvas";
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";

import MobileBottomNav from "@/app/components/MobileBottomNav";
import MobileBottomSheet from "@/app/components/MobileBottomSheet";
import TextEditorPanel from "@/app/components/TextEditorPanel";

const queryClient = new QueryClient();

/* =========================
   Types (TS Fixes)
========================= */
type EditorObject = {
  id?: string;
  type?: string; // "text" | ...
  fontFamily?: string;
  fontSize?: number;
  fill?: string;
  fontStyle?: string;
  align?: string;
  [key: string]: any;
};

type EditorCanvasRef = {
  getCanvasData?: () => any;
  uploadBackground?: (file: File) => void;
  updateSelected?: (patch: Record<string, any>) => void;
};

export default function CreateInvitePage() {
  const canvasRef = useRef<EditorCanvasRef | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedObject, setSelectedObject] = useState<EditorObject | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ אצלכם הטאבים במובייל הם: text / blessing / wedding / backgrounds / batmitzvah
  const [mobileTab, setMobileTab] = useState<string>("text");
  const [sheetOpen, setSheetOpen] = useState(false);

  const router = useRouter();
  const googleApiKey = "AIzaSyACcKM0Zf756koiR1MtC8OtS7xMUdwWjfg";

  // --- כאשר נבחר טקסט — נפתח עורך טקסט כמו בקאנבה ---
  useEffect(() => {
    if (selectedObject?.type === "text") {
      setMobileTab("text");
      setSheetOpen(true);
    }
  }, [selectedObject]);

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
        router.push(`/dashboard/invitations/${data.invitation._id}/preview`);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert("❌ שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  /* ===========================================================
     UPLOAD BACKGROUND (כפתור העלאה למעלה)
  ============================================================ */
  const handleUploadInvitation = (file: File) => {
    canvasRef.current?.uploadBackground?.(file);
  };

  /* ===========================================================
     MOBILE NAVIGATION
  ============================================================ */
  const closeSheet = () => setSheetOpen(false);

  const onChangeMobileTab = (tabId: string) => {
    if (tabId === mobileTab) {
      setSheetOpen((v) => !v);
      return;
    }
    setMobileTab(tabId);
    setSheetOpen(true);
  };

  const applyToSelected = (patch: Record<string, any>) => {
    setSelectedObject((prev) => (prev ? { ...prev, ...patch } : prev));
    canvasRef.current?.updateSelected?.(patch);
  };

  // ✅ כותרות בעברית בדיוק כמו שביקשת
  const mobileSheetTitle = (() => {
    switch (mobileTab) {
      case "text":
        return "טקסט";
      case "blessing":
        return "ברית/ה";
      case "wedding":
        return "חתונה";
      case "backgrounds":
        return "רקעים";
      case "batmitzvah":
        return "בת/מצווה, חינה ועוד";
      default:
        return "";
    }
  })();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-[100dvh] flex bg-gray-100 overflow-hidden">
        {/* =============== Desktop Sidebar =============== */}
        <div className="hidden md:block w-[280px] shrink-0 border-l bg-white">
          <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />
        </div>

        {/* =============== Mobile Sidebar Drawer (optional) =============== */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-white flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-semibold">כלי עיצוב</span>
              <button onClick={() => setSidebarOpen(false)}>
                <X />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />
            </div>
          </div>
        )}

        {/* =============== Editor Area =============== */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* ===== Top Bar ===== */}
          <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden">
              <Menu />
            </button>

            {/* העלאה נשארת ככפתור פעולה למעלה */}
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

            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-5 py-2 rounded-full text-white text-sm transition ${
                saving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "שומר..." : "💾 שמור"}
            </button>
          </div>

          {/* ===== Toolbar (Desktop Only) ===== */}
          <div className="hidden md:block">
            <Toolbar />
          </div>

          {/* ===== Canvas ===== */}
          <div className="flex-1 min-h-0 overflow-hidden bg-gray-100 relative">
            <div className="absolute inset-0 pb-20 md:pb-0">
              <EditorCanvas ref={canvasRef} onSelect={setSelectedObject} />
            </div>
          </div>

          {/* ===== Mobile Bottom Nav (הכפתורים בעברית מגיעים מהקומפוננטה שלך) ===== */}
          <MobileBottomNav active={mobileTab} onChange={onChangeMobileTab} />

          {/* ===== Bottom Sheet ===== */}
          <MobileBottomSheet
            open={sheetOpen}
            title={mobileSheetTitle}
            onClose={closeSheet}
            height={mobileTab === "text" ? "42vh" : "52vh"}
          >
            {mobileTab === "text" ? (
              <TextEditorPanel
                selected={selectedObject?.type === "text" ? selectedObject : null}
                onApply={applyToSelected}
              />
            ) : mobileTab === "blessing" ? (
              <div className="space-y-3">
                <button className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold">
                  הוסף ברכה/ה
                </button>
                <div className="text-sm text-gray-500">תוכן ברית/ה כאן…</div>
              </div>
            ) : mobileTab === "wedding" ? (
              <div className="space-y-3">
                <button className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold">
                  הוסף אלמנט לחתונה
                </button>
                <div className="text-sm text-gray-500">תוכן חתונה כאן…</div>
              </div>
            ) : mobileTab === "backgrounds" ? (
              <div className="space-y-3">
                <button
                  onClick={() => uploadInputRef.current?.click()}
                  className="w-full py-3 rounded-xl bg-black text-white font-semibold"
                >
                  העלאת תמונה לרקע
                </button>
                <div className="text-sm text-gray-500">רקעים קיימים כאן…</div>
              </div>
            ) : mobileTab === "batmitzvah" ? (
              <div className="space-y-3">
                <button className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold">
                  הוסף אלמנט
                </button>
                <div className="text-sm text-gray-500">
                  תוכן בת/מצווה, חינה ועוד כאן…
                </div>
              </div>
            ) : null}
          </MobileBottomSheet>
        </div>
      </div>
    </QueryClientProvider>
  );
}
