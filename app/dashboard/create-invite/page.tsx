"use client";

import { useRef, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import EditorCanvas from "./EditorCanvas";
import Sidebar from "./Sidebar";

import MobileBottomNav, {
  type MobileNavTab,
} from "@/app/components/MobileBottomNav";
import MobileBottomSheet from "@/app/components/MobileBottomSheet";
import TextEditorPanel from "@/app/components/TextEditorPanel";

/* =========================================================
   React Query
========================================================= */
const queryClient = new QueryClient();

/* =========================================================
   Types
========================================================= */
export type EditorObject = {
  id: string;
  type: "text" | string;
  text?: string;
  x?: number;
  y?: number;
  fontFamily?: string;
  fontSize?: number;
  fill?: string;
  align?: string;
  [key: string]: any;
};

type EditorCanvasRef = {
  getCanvasData: () => {
    objects: EditorObject[];
  };

  updateSelected?: (patch: Record<string, any>) => void;

  uploadBackground: (file: File) => void;
  deleteSelected?: () => void;

  addText?: () => void;
};

/* =========================================================
   Component
========================================================= */
export default function CreateInvitePage() {
  const canvasRef = useRef<EditorCanvasRef | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedObject, setSelectedObject] =
    useState<EditorObject | null>(null);

  const [saving, setSaving] = useState(false);

  /* ===== Mobile UI State ===== */
  const [mobileTab, setMobileTab] =
    useState<MobileNavTab>("backgrounds");
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);

  const router = useRouter();
  const googleApiKey = "AIzaSyACcKM0Zf756koiR1MtC8OtS7xMUdwWjfg";

  /* =========================================================
     פתיחת Sheet אוטומטית כשנבחר טקסט
  ========================================================= */
  useEffect(() => {
    if (selectedObject?.type === "text") {
      setSheetOpen(true);
    }
  }, [selectedObject]);

  /* =========================================================
     הוספת טקסט
  ========================================================= */
  const handleAddText = () => {
    canvasRef.current?.addText?.();
  };

  /* =========================================================
     שמירה
  ========================================================= */
  const handleSave = async () => {
    try {
      setSaving(true);

      const canvasJSON = canvasRef.current?.getCanvasData();
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
    } catch (err) {
      console.error(err);
      alert("❌ שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     העלאת רקע
  ========================================================= */
  const handleUploadInvitation = (file: File) => {
    canvasRef.current?.uploadBackground(file);
  };

  /* =========================================================
     Mobile Nav
  ========================================================= */
  const closeSheet = () => setSheetOpen(false);

  const onChangeMobileTab = (tabId: MobileNavTab) => {
    if (tabId === mobileTab) {
      setSheetOpen((v) => !v);
      return;
    }
    setMobileTab(tabId);
    setSheetOpen(true);
  };

  /* =========================================================
     עדכון אובייקט נבחר
  ========================================================= */
  const applyToSelected = (patch: Record<string, any>) => {
    canvasRef.current?.updateSelected?.(patch);
    setSelectedObject((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  /* =========================================================
     מחיקה
  ========================================================= */
  const handleDeleteSelected = () => {
    if (!canvasRef.current || !selectedObject) return;

    canvasRef.current.deleteSelected?.();
    setSelectedObject(null);
    setSheetOpen(false);
  };

  /* =========================================================
     כותרת Sheet (❌ בלי "text")
  ========================================================= */
  const mobileSheetTitle = (() => {
    if (selectedObject?.type === "text") return "טקסט";

    switch (mobileTab) {
      case "backgrounds":
        return "רקעים";
      case "blessing":
        return "ברית / ברכה";
      case "wedding":
        return "חתונה";
      case "batmitzvah":
        return "בת / מצווה";
      default:
        return "";
    }
  })();

  /* =========================================================
     Render
  ========================================================= */
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-[100dvh] flex bg-gray-100 overflow-hidden">
        {/* ===== Desktop Sidebar ===== */}
        <div className="hidden md:block w-[280px] shrink-0 border-l bg-white">
          <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />
        </div>

        {/* ===== Editor Area ===== */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* ===== Top Bar ===== */}
          <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center gap-3">
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
              className={`px-5 py-2 rounded-full text-white text-sm ${
                saving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "שומר..." : "💾 שמור"}
            </button>
          </div>

          {/* ===== Desktop Toolbar ===== */}
          

          {/* ===== Canvas ===== */}
          <div className="flex-1 relative bg-gray-100">
            <div className="absolute inset-0 pb-24 md:pb-0">
              <EditorCanvas ref={canvasRef} onSelect={setSelectedObject} />
            </div>
          </div>

          {/* ===== Floating Add Text Button (Mobile) ===== */}
          <button
            onClick={handleAddText}
            className="
              md:hidden
              fixed bottom-28 right-4
              z-50
              px-5 py-3
              rounded-full
              bg-black text-white
              text-sm
              shadow-xl
              active:scale-95
            "
          >
            ➕ טקסט
          </button>

          {/* ===== Mobile Bottom Nav ===== */}
          <MobileBottomNav
            active={mobileTab}
            onChange={onChangeMobileTab}
          />

          {/* ===== Mobile Bottom Sheet ===== */}
          <MobileBottomSheet
            open={sheetOpen}
            title={mobileSheetTitle}
            onClose={closeSheet}
            height={selectedObject?.type === "text" ? "42vh" : "52vh"}
          >
            {selectedObject?.type === "text" ? (
              <TextEditorPanel
                selected={selectedObject}
                onApply={applyToSelected}
                onDelete={handleDeleteSelected}
              />
            ) : (
              <Sidebar
                canvasRef={canvasRef}
                googleApiKey={googleApiKey}
                activeTab={mobileTab}
              />
            )}
          </MobileBottomSheet>
        </div>
      </div>
    </QueryClientProvider>
  );
}
