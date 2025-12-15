"use client";

import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditorCanvas from "../../create-invite/EditorCanvas";
import Sidebar from "../../create-invite/Sidebar";
import Toolbar from "../../create-invite/Toolbar";

const queryClient = new QueryClient();

export default function EditInvitePage({ params }: any) {
  const canvasRef = useRef<any>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [inviteId, setInviteId] = useState<string | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedObject, setSelectedObject] = useState<any | null>(null);

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

        // ⚠️ מנקה image – ייטען מחדש בקנבס
        canvasData.objects = canvasData.objects.map((o: any) => ({
          ...o,
          image: undefined,
        }));

        setInvite({
          ...data.invitation,
          canvasData,
        });
      } catch (err) {
        console.error("❌ Error loading invitation:", err);
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
      console.error("❌ Save error:", err);
      alert("❌ שגיאת שרת");
    } finally {
      setSaving(false);
    }
  };

  /* ============================================================
     📤 Upload invitation image → canvas background
  ============================================================ */
  const handleUploadInvitation = (file: File) => {
    if (!canvasRef.current?.uploadBackground) {
      alert("❌ הקנבס לא מוכן להעלאת רקע");
      return;
    }
    canvasRef.current.uploadBackground(file);
  };

  /* ============================================================
     ⏳ Loading
  ============================================================ */
  if (!inviteId || loading || !invite) {
    return <div className="p-10 text-center text-xl">טוען את ההזמנה...</div>;
  }

  /* ============================================================
     🎨 UI (זהה ל־Create Invite)
  ============================================================ */
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-gray-100 relative">
        {/* Sidebar */}
        <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ✅ Sticky Top Bar */}
          <div
            className="
              sticky top-0 z-40
              bg-white border-b
              px-6 py-3
              flex items-center justify-between gap-4
            "
          >
            {/* Upload */}
            <div>
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="
                  px-5 py-2.5
                  rounded-full
                  bg-violet-600
                  text-white
                  font-medium
                  shadow
                  hover:bg-violet-700
                  transition
                "
              >
                ⬆️ העלאת ההזמנה שלי
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
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`
                px-6 py-3 rounded-full
                text-white font-semibold shadow
                flex items-center gap-2 transition
                ${
                  saving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }
              `}
            >
              {saving ? "שומר..." : "💾 שמור שינויים"}
            </button>
          </div>

          {/* Toolbar */}
          <Toolbar />

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <EditorCanvas
              ref={canvasRef}
              initialData={invite.canvasData}
              onSelect={setSelectedObject}
            />
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}
