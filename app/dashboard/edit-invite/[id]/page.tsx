"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import EditorCanvas, {
  type EditorCanvasRef,
} from "../../create-invite/EditorCanvas";
import Sidebar from "../../create-invite/Sidebar";
import ZoomControl from "../../create-invite/ZoomControl";

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
type EditorObject = {
  id: string;
  type: string;
  [key: string]: any;
};

/* =========================================================
   Component
========================================================= */
export default function EditInvitePage() {
  /* ================= Params ================= */
  const params = useParams();
  const inviteId = params?.id as string | undefined;

  /* ================= Refs ================= */
  const canvasRef = useRef<EditorCanvasRef | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  /* ================= State ================= */
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedObject, setSelectedObject] =
    useState<EditorObject | null>(null);

  /* ===== NEW: design modes ===== */
  const [designMode, setDesignMode] =
    useState<"canvas" | "image">("canvas");
  const [simpleImageUrl, setSimpleImageUrl] = useState<string>("");

  /* ================= Mobile UI ================= */
  const [mobileTab, setMobileTab] =
    useState<MobileNavTab>("backgrounds");
  const [sheetOpen, setSheetOpen] = useState(false);

  const googleApiKey = "AIzaSyACcKM0Zf756koiR1MtC8OtS7xMUdwWjfg";

  /* =========================================================
     Load invitation (GET)
  ========================================================= */
  useEffect(() => {
    if (!inviteId) {
      setLoading(false);
      return;
    }

    async function loadInvitation() {
      try {
        const res = await fetch(`/api/invitations/${inviteId}`, {
          credentials: "include",
        });

        const data = await res.json();

        if (!data.success || !data.invitation) {
          alert("❌ שגיאה בטעינת ההזמנה");
          return;
        }

        const canvasData = data.invitation.canvasData || { objects: [] };

        canvasData.objects = canvasData.objects.map((obj: any) => ({
          ...obj,
          image: undefined,
        }));

        setInvite({
          ...data.invitation,
          canvasData,
        });

        // 👇 NEW
        setDesignMode(data.invitation.designMode || "canvas");
        setSimpleImageUrl(data.invitation.simpleImageUrl || "");
      } catch {
        alert("❌ שגיאה בטעינת ההזמנה");
      } finally {
        setLoading(false);
      }
    }

    loadInvitation();
  }, [inviteId]);

  /* =========================================================
     Save invitation (PUT)
  ========================================================= */
  const handleSave = async () => {
    if (!inviteId) return;

    try {
      setSaving(true);

      let body: any;

      if (designMode === "image") {
        if (!simpleImageUrl) {
          alert("❌ לא נבחרה תמונה");
          return;
        }

        body = {
          title: invite.title,
          designMode: "image",
          simpleImageUrl,
        };
      } else {
        if (!canvasRef.current?.getCanvasData) return;

        const canvasData = canvasRef.current.getCanvasData();

        body = {
          title: invite.title,
          designMode: "canvas",
          canvasData,
          orientation: canvasData.orientation,
        };
      }

      const res = await fetch(`/api/invitations/${inviteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!result.success) {
        alert("❌ שגיאה בשמירה");
        return;
      }

      setInvite(result.invitation);
      alert("✅ ההזמנה עודכנה בהצלחה!");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     Preview (Public Invite)
  ========================================================= */
  const handlePreview = () => {
    const previewId = invite.shareId || invite._id;
    window.open(`/invite/${previewId}`, "_blank");
  };

  /* =========================================================
     Upload handler
  ========================================================= */
  const handleUpload = async (file: File) => {
    if (designMode === "canvas") {
      canvasRef.current?.uploadBackground?.(file);
      return;
    }

    // 🖼 image-only mode
    // ⬇️ השתמשי כאן במנגנון ההעלאה הקיים שלך
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data?.url) {
      setSimpleImageUrl(data.url);
    } else {
      alert("❌ שגיאה בהעלאת תמונה");
    }
  };

  /* =========================================================
     Loading
  ========================================================= */
  if (loading || !invite) {
    return (
      <div className="p-10 text-center text-xl">
        טוען את ההזמנה...
      </div>
    );
  }

  /* =========================================================
     Render
  ========================================================= */
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-[100dvh] flex bg-gray-100">

        {/* Sidebar */}
        <div className="hidden md:block w-[280px] shrink-0 border-l bg-white">
          <Sidebar
            canvasRef={canvasRef}
            googleApiKey={googleApiKey}
          />
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-h-0 relative pb-[72px] md:pb-0">

          {/* Header */}
          <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center gap-3">

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
                if (file) handleUpload(file);
                e.currentTarget.value = "";
              }}
            />

            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setDesignMode("canvas")}
                className={`px-3 py-2 rounded-full text-sm border ${
                  designMode === "canvas"
                    ? "bg-blue-600 text-white"
                    : "bg-white"
                }`}
              >
                🎨 קנבס
              </button>

              <button
                onClick={() => setDesignMode("image")}
                className={`px-3 py-2 rounded-full text-sm border ${
                  designMode === "image"
                    ? "bg-blue-600 text-white"
                    : "bg-white"
                }`}
              >
                🖼️ תמונה
              </button>
            </div>

            <div className="flex-1" />

            {/* Preview */}
            <button
              onClick={handlePreview}
              className="px-4 py-2 rounded-full border text-sm"
            >
              👁 תצוגה מקדימה
            </button>

            {/* Save */}
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

          {/* Canvas / Image */}
          <div className="flex-1 relative bg-gray-100 overflow-hidden">

            {designMode === "canvas" && (
              <>
                <EditorCanvas
                  key={invite._id}
                  ref={canvasRef}
                  initialData={{
                    ...invite.canvasData,
                    orientation: invite.orientation,
                  }}
                  onSelect={setSelectedObject}
                />

                <div className="absolute top-4 right-4 z-50">
                  <ZoomControl canvasRef={canvasRef} />
                </div>
              </>
            )}

            {designMode === "image" && simpleImageUrl && (
              <div className="flex justify-center items-center h-full">
                <img
                  src={simpleImageUrl}
                  className="max-h-full rounded-2xl border shadow"
                />
              </div>
            )}
          </div>

          {/* Mobile */}
          <MobileBottomNav
            active={mobileTab}
            onChange={(tab) => {
              setMobileTab(tab);
              setSheetOpen(true);
            }}
          />

          <MobileBottomSheet
            open={sheetOpen}
            title=""
            onClose={() => setSheetOpen(false)}
            height="42vh"
          >
            {selectedObject?.type === "text" ? (
              <TextEditorPanel
                selected={selectedObject}
                onApply={(patch) =>
                  canvasRef.current?.updateSelected?.(patch)
                }
                onDelete={() =>
                  canvasRef.current?.deleteSelected?.()
                }
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