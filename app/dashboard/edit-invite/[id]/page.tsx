"use client";

import { useEffect, useRef, useState } from "react";
import EditorCanvas from "../../create-invite/EditorCanvas";
import Sidebar from "../../create-invite/Sidebar";
import Toolbar from "../../create-invite/Toolbar";

export default function EditInvitePage({ params }: any) {
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef<any>(null);
  const [selectedObject, setSelectedObject] = useState<any | null>(null);

  const googleApiKey =
    "AIzaSyACcKM0Zf756koiR1MtC8OtS7xMUdwWjfg";

  /* ============================================================
     ⭐ params ב־Next 16 הוא Promise — חובה לפתור אותו
  ============================================================ */
  useEffect(() => {
    async function unwrap() {
      const resolved = await params;
      setInviteId(resolved.id);
      console.log("📌 Invite ID:", resolved.id);
    }
    unwrap();
  }, [params]);

  /* ============================================================
     📌 טען את ההזמנה מהשרת
  ============================================================ */
  useEffect(() => {
    if (!inviteId) return;

    async function load() {
      try {
        const res = await fetch(`/api/invitations/${inviteId}`);
        const data = await res.json();

        if (!data.success || !data.invitation) {
          setLoading(false);
          alert("❌ שגיאה בטעינת ההזמנה");
          return;
        }

        setInvite(data.invitation);
      } catch (err) {
        console.error("❌ Error loading invitation:", err);
        alert("שגיאה בטעינה");
      }

      setLoading(false);
    }

    load();
  }, [inviteId]);

  /* ============================================================
     💾 שמירה
  ============================================================ */
  const handleSave = async () => {
    if (!inviteId || !invite) {
      alert("⏳ ההזמנה עדיין נטענת");
      return;
    }

    if (!canvasRef.current?.getCanvasData) {
      alert("❌ הקנבס לא מוכן לשמירה");
      return;
    }

    const canvasData = canvasRef.current.getCanvasData();

    try {
      setSaving(true);

      const res = await fetch(`/api/invitations/${inviteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvasData,
          title: invite.title,
        }),
      });

      const result = await res.json();

      if (result.success) {
        alert("🎉 ההזמנה נשמרה בהצלחה!");
      } else {
        alert("❌ שגיאה: " + result.error);
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      alert("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  /* ============================================================
     ⏳ טעינה
  ============================================================ */
  if (!inviteId || loading || !invite) {
    return (
      <div className="p-10 text-center text-xl">
        טוען את ההזמנה...
      </div>
    );
  }

  /* ============================================================
     🎨 עורך הזמנה
  ============================================================ */
  return (
    <div className="flex h-screen bg-gray-100 relative">
      <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Toolbar />

        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <EditorCanvas
            ref={canvasRef}
            initialData={invite.canvasData || { objects: [] }}
            onSelect={(obj: any) => setSelectedObject(obj)}
          />
        </div>

        {/* 💾 כפתור שמירה קבוע וגלוי תמיד */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`fixed bottom-6 right-8 z-50 px-6 py-3 rounded-xl text-white font-medium shadow-lg transition-all ${
            saving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 active:scale-95"
          }`}
        >
          {saving ? "שומר..." : "💾 שמור שינויים"}
        </button>
      </div>
    </div>
  );
}
