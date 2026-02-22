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
    if (!inviteId || !canvasRef.current?.getCanvasData) return;

    try {
      setSaving(true);

      const canvasData = canvasRef.current.getCanvasData();

      const res = await fetch(`/api/invitations/${inviteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: invite.title,
          canvasData,
          orientation: canvasData.orientation,
        }),
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
    // עדיפות ל-shareId אם קיים
    const previewId = invite.shareId || invite._id;
    window.open(`/invite/${previewId}`, "_blank");
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
                if (file) {
                  canvasRef.current?.uploadBackground?.(file);
                }
                e.currentTarget.value = "";
              }}
            />

            <div className="flex-1" />

            {/* 👁 Preview */}
            <button
              onClick={handlePreview}
              className="px-4 py-2 rounded-full border text-sm"
            >
              👁 תצוגה מקדימה
            </button>

            {/* 💾 Save */}
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

          {/* Canvas */}
          <div className="flex-1 relative bg-gray-100 overflow-hidden">

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
            {selectedObject ? (
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
