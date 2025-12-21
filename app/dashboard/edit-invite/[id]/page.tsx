"use client";

import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditorCanvas from "../../create-invite/EditorCanvas";
import Sidebar from "../../create-invite/Sidebar";
import Toolbar from "../../create-invite/Toolbar";

import MobileBottomNav, {
  type MobileNavTab,
} from "@/app/components/MobileBottomNav";
import MobileBottomSheet from "@/app/components/MobileBottomSheet";
import TextEditorPanel from "@/app/components/TextEditorPanel";

const queryClient = new QueryClient();

export default function EditInvitePage({ params }: any) {
  const canvasRef = useRef<any>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [inviteId, setInviteId] = useState<string | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedObject, setSelectedObject] = useState<any | null>(null);

  /* ===== Mobile UI State (זהה ל-Create) ===== */
  const [mobileTab, setMobileTab] = useState<MobileNavTab>("text");
  const [sheetOpen, setSheetOpen] = useState(false);

  const googleApiKey = "AIzaSyACcKM0Zf756koiR1MtC8OtS7xMUdwWjfg";

  /* ============================================================
     ⭐ unwrap params (Next 16)
  ============================================================ */
  useEffect(() => {
    async function unwrap() {
      const resolved = await params;
      setInviteId(resolved.id);
    }
    unwrap();
  }, [params]);

  /* ============================================================
     📥 Load invitation
  ============================================================ */
  useEffect(() => {
    if (!inviteId) return;

    async function load() {
      try {
        const res = await fetch(`/api/invitations/${inviteId}`);
        const data = await res.json();

        if (!data.success || !data.invitation) {
          alert("❌ שגיאה בטעינת ההזמנה");
          return;
        }

        const canvasData = data.invitation.canvasData || { objects: [] };

        canvasData.objects = canvasData.objects.map((o: any) => ({
          ...o,
          image: undefined,
        }));

        setInvite({
          ...data.invitation,
          canvasData,
        });
      } catch (err) {
        console.error(err);
        alert("שגיאה בטעינה");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [inviteId]);

  /* ============================================================
     💾 SAVE (PUT)
  ============================================================ */
  const handleSave = async () => {
    if (!inviteId || !canvasRef.current?.getCanvasData) return;

    try {
      setSaving(true);

      const canvasData = canvasRef.current.getCanvasData();

      const res = await fetch(`/api/invitations/${inviteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: invite.title,
          canvasData,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        alert("❌ שגיאה בשמירה");
        return;
      }

      setInvite(result.invitation);
      alert("✅ ההזמנה עודכנה בהצלחה!");
    } catch (err) {
      console.error(err);
      alert("❌ שגיאת שרת");
    } finally {
      setSaving(false);
    }
  };

  /* ============================================================
     📤 Upload background
  ============================================================ */
  const handleUploadInvitation = (file: File) => {
    canvasRef.current?.uploadBackground?.(file);
  };

  /* ============================================================
     🔥 Mobile – חיבור עריכת טקסט לקנבס
  ============================================================ */
  const applyToSelected = (patch: Record<string, any>) => {
  canvasRef.current?.updateSelected?.(patch);

  setSelectedObject((prev: any | null) =>
    prev ? { ...prev, ...patch } : prev
  );
};

  /* ============================================================
     🗑 Delete
  ============================================================ */
  const handleDeleteSelected = () => {
    canvasRef.current?.deleteSelected?.();
    setSelectedObject(null);
    setSheetOpen(false);
  };

  /* ============================================================
     Mobile behavior – פתיחת Sheet כשנבחר טקסט
  ============================================================ */
  useEffect(() => {
    if (selectedObject?.type === "text") {
      setMobileTab("text");
      setSheetOpen(true);
    }
  }, [selectedObject]);

  const onChangeMobileTab = (tab: MobileNavTab) => {
    if (tab === mobileTab) {
      setSheetOpen((v) => !v);
      return;
    }
    setMobileTab(tab);
    setSheetOpen(true);
  };

  const mobileSheetTitle = mobileTab === "text" ? "טקסט" : "";

  /* ============================================================
     ⏳ Loading
  ============================================================ */
  if (!inviteId || loading || !invite) {
    return <div className="p-10 text-center text-xl">טוען את ההזמנה...</div>;
  }

  /* ============================================================
     🎨 UI
  ============================================================ */
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-[100dvh] flex bg-gray-100 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-[280px] shrink-0 border-l bg-white">
          <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />
        </div>

        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Top Bar */}
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
                  ? "bg-gray-400"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "שומר..." : "💾 שמור"}
            </button>
          </div>

          {/* Desktop Toolbar */}
          <div className="hidden md:block">
            <Toolbar />
          </div>

          {/* Canvas */}
          <div className="flex-1 relative bg-gray-100">
            <div className="absolute inset-0 pb-24 md:pb-0">
              <EditorCanvas
                ref={canvasRef}
                initialData={invite.canvasData}
                onSelect={setSelectedObject}
              />
            </div>
          </div>

          {/* Mobile Add Text */}
          <button
            onClick={() => canvasRef.current?.addText?.()}
            className="md:hidden fixed bottom-28 right-4 z-50 px-5 py-3 rounded-full bg-black text-white shadow-xl"
          >
            ➕ טקסט
          </button>

          {/* Mobile Nav */}
          <MobileBottomNav
            active={mobileTab}
            onChange={onChangeMobileTab}
          />

          {/* Mobile Sheet */}
          <MobileBottomSheet
            open={sheetOpen}
            title={mobileSheetTitle}
            onClose={() => setSheetOpen(false)}
            height="42vh"
          >
            <TextEditorPanel
              selected={
                selectedObject?.type === "text" ? selectedObject : null
              }
              onApply={applyToSelected}
              onDelete={handleDeleteSelected}
            />
          </MobileBottomSheet>
        </div>
      </div>
    </QueryClientProvider>
  );
}
