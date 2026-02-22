"use client";

import { useRef, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ZoomControl from "./ZoomControl";

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
  getPreviewImage: () => string;
  uploadBackground: (file: File) => void;
  deleteSelected?: () => void;
  addText?: () => void;
  updateSelected?: (patch: Record<string, any>) => void;
};

/* =========================================================
   Component
========================================================= */
export default function CreateInvitePage() {
  const canvasRef = useRef<EditorCanvasRef | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const readyImageInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedObject, setSelectedObject] =
    useState<EditorObject | null>(null);

  const [saving, setSaving] = useState(false);

  /* ===== NEW: design mode ===== */
  const [designMode, setDesignMode] = useState<"canvas" | "image">("canvas");
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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
     שמירה (Canvas)
  ========================================================= */
  const handleSave = async () => {
    try {
      setSaving(true);

      const canvasJSON = canvasRef.current?.getCanvasData();
      const previewBase64 = canvasRef.current?.getPreviewImage();

      if (!canvasJSON || !previewBase64) {
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
          designMode: "canvas",
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.error);
        return;
      }

      const id = data.invitation._id;
      setInvitationId(id);

      await fetch("/api/invitations/upload-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invitationId: id,
          base64Image: previewBase64,
        }),
      });

      router.push(`/dashboard/invitations/${id}/preview`);
    } catch (err) {
      console.error(err);
      alert("❌ שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     העלאת רקע לקנבס (קיים)
  ========================================================= */
  const handleUploadInvitation = (file: File) => {
    canvasRef.current?.uploadBackground(file);
  };

  /* =========================================================
     NEW: העלאת הזמנה מוכנה כתמונה
  ========================================================= */
  const handleUploadReadyImage = async (file: File) => {
    if (!invitationId) {
      alert("❗ שמרי קודם את ההזמנה");
      return;
    }

    try {
      setUploadingImage(true);

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/invitations/upload-image", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.url) {
        alert("❌ שגיאה בהעלאת תמונה");
        return;
      }

      await fetch(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designMode: "image",
          inviteImageUrl: uploadData.url,
        }),
      });

      setDesignMode("image");
      alert("✅ ההזמנה נשמרה כתמונה");
    } catch (err) {
      console.error(err);
      alert("❌ שגיאה");
    } finally {
      setUploadingImage(false);
    }
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
     Render
  ========================================================= */
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-[100dvh] flex bg-gray-100 overflow-hidden">
        <div className="hidden md:block w-[280px] shrink-0 border-l bg-white">
          <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />
        </div>

        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* ===== Top Bar ===== */}
          <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setDesignMode("canvas")}
              className={`px-3 py-1 rounded-full text-sm ${
                designMode === "canvas" ? "bg-black text-white" : "bg-gray-200"
              }`}
            >
              קנבס
            </button>

            <button
              onClick={() => readyImageInputRef.current?.click()}
              className={`px-3 py-1 rounded-full text-sm ${
                designMode === "image" ? "bg-black text-white" : "bg-gray-200"
              }`}
            >
              תמונה מוכנה
            </button>

            <input
              ref={readyImageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadReadyImage(file);
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

          {/* ===== Canvas ===== */}
          {designMode === "canvas" && (
            <div className="flex-1 relative bg-gray-100">
              <div className="absolute inset-0 pb-24 md:pb-0">
                <EditorCanvas ref={canvasRef} onSelect={setSelectedObject} />
              </div>
              <div className="absolute top-4 right-4 z-50">
                <ZoomControl canvasRef={canvasRef} />
              </div>
            </div>
          )}

          {/* ===== Mobile UI ===== */}
          <MobileBottomNav active={mobileTab} onChange={onChangeMobileTab} />

          <MobileBottomSheet
            open={sheetOpen}
            title="עריכה"
            onClose={closeSheet}
            height="52vh"
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