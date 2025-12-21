"use client";

import { useRef, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditorCanvas from "./EditorCanvas";
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";
import { useRouter } from "next/navigation";

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

  const [selectedObject, setSelectedObject] = useState<EditorObject | null>(null);
  const [saving, setSaving] = useState(false);

  // ✅ אצלכם הטאבים במובייל: text / blessing / wedding / backgrounds / batmitzvah
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
     MOBILE NAVIGATION (במקום ההמבורגר)
  ============================================================ */
  const closeSheet = () => setSheetOpen(false);

  const onChangeMobileTab = (tabId: string) => {
    // לחיצה על אותו טאב = סגירה/פתיחה (כמו Canva)
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

        {/* =============== Editor Area =============== */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* ===== Top Bar ===== */}
          <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center gap-3">
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

          {/* ===== Mobile Bottom Nav (במקום ההמבורגר) ===== */}
          <MobileBottomNav active={mobileTab} onChange={onChangeMobileTab} />

          {/* ===== Bottom Sheet: כאן עברה כל הלוגיקה של ההמבורגר ===== */}
          <MobileBottomSheet
            open={sheetOpen}
            title={mobileSheetTitle}
            onClose={closeSheet}
            height={mobileTab === "text" ? "42vh" : "52vh"}
          >
            {/* ✅ טקסט: עורך טקסט ייעודי */}
            {mobileTab === "text" ? (
              <TextEditorPanel
                selected={selectedObject?.type === "text" ? selectedObject : null}
                onApply={applyToSelected}
              />
            ) : (
              // ✅ כל שאר הכפתורים: פותחים את ה-Sidebar עם הטאב המתאים (כמו Canva)
              <div className="h-full">
                <Sidebar
                  canvasRef={canvasRef}
                  googleApiKey={googleApiKey}
                  activeTab={mobileTab}
                />
              </div>
            )}
          </MobileBottomSheet>
        </div>
      </div>
    </QueryClientProvider>
  );
}
