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

  console.log("🧩 EditInvitePage mounted");
  console.log("🆔 inviteId from useParams:", inviteId);

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
    console.log("🔁 useEffect(loadInvitation) triggered");

    if (!inviteId) {
      console.error("❌ inviteId is missing");
      setLoading(false);
      return;
    }

    async function loadInvitation() {
      try {
        console.log(
          "➡️ Fetching invitation:",
          `/api/invitations/${inviteId}`
        );

        const res = await fetch(`/api/invitations/${inviteId}`, {
          credentials: "include",
        });

        console.log("⬅️ Response status:", res.status);

        const data = await res.json();
        console.log("📦 Response JSON:", data);

        if (!data.success || !data.invitation) {
          console.error("❌ Invalid invitation response", data);
          alert("❌ שגיאה בטעינת ההזמנה");
          return;
        }

        const canvasData = data.invitation.canvasData || { objects: [] };

        console.log(
          "🖼 Canvas objects count:",
          canvasData.objects?.length ?? 0
        );

        canvasData.objects = canvasData.objects.map(
          (obj: any, i: number) => {
            console.log("✏️ Canvas object", i, obj.type);
            return {
              ...obj,
              image: undefined,
            };
          }
        );

        setInvite({
          ...data.invitation,
          canvasData,
        });

        console.log("✅ Invitation loaded into state");
      } catch (err) {
        console.error("🔥 Error while loading invitation:", err);
        alert("❌ שגיאה בטעינת ההזמנה");
      } finally {
        console.log("⏹ Finished loading invitation");
        setLoading(false);
      }
    }

    loadInvitation();
  }, [inviteId]);

  /* =========================================================
     Save invitation (PUT)
  ========================================================= */
  const handleSave = async () => {
    if (!inviteId || !canvasRef.current?.getCanvasData) {
      console.warn(
        "⚠️ Save aborted – missing inviteId or canvasRef"
      );
      return;
    }

    try {
      setSaving(true);
      console.log("💾 Saving invitation", inviteId);

      const canvasData = canvasRef.current.getCanvasData();
      console.log("📤 Canvas data to save:", canvasData);

      const res = await fetch(`/api/invitations/${inviteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: invite.title,
          canvasData,
        }),
      });

      const result = await res.json();
      console.log("⬅️ Save response:", result);

      if (!result.success) {
        alert("❌ שגיאה בשמירה");
        return;
      }

      setInvite(result.invitation);
      alert("✅ ההזמנה עודכנה בהצלחה!");
    } catch (err) {
      console.error("🔥 Error while saving invitation:", err);
      alert("❌ שגיאת שרת");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     Loading state
  ========================================================= */
  if (loading || !invite) {
    console.log(
      "⏳ Still loading… loading:",
      loading,
      "invite:",
      invite
    );
    return (
      <div className="p-10 text-center text-xl">
        טוען את ההזמנה...
      </div>
    );
  }

  console.log("🎨 Rendering editor with invite:", invite._id);

  /* =========================================================
     Render
  ========================================================= */
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-[100dvh] flex bg-gray-100 overflow-hidden">
        <div className="hidden md:block w-[280px] shrink-0 border-l bg-white">
          <Sidebar
            canvasRef={canvasRef}
            googleApiKey={googleApiKey}
          />
        </div>

        <div className="flex-1 flex flex-col min-h-0 relative">
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

          <div className="flex-1 relative bg-gray-100">
            <EditorCanvas
              key={invite._id}
              ref={canvasRef}
              initialData={invite.canvasData}
              onSelect={setSelectedObject}
            />

            <div className="absolute top-4 right-4 z-50">
              <ZoomControl canvasRef={canvasRef} />
            </div>
          </div>

          <MobileBottomNav
            active={mobileTab}
            onChange={setMobileTab}
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
