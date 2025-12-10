"use client";

import { useEffect, useRef, useState } from "react";
import EditorCanvas from "../../create-invite/EditorCanvas";
import Sidebar from "../../create-invite/Sidebar";
import Toolbar from "../../create-invite/Toolbar";

export default function EditInvitePage({ params }: any) {
  const { id } = params;

  const canvasRef = useRef<any>(null);
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedObject, setSelectedObject] = useState<any | null>(null);
  const googleApiKey = "AIzaSyACcKM0Zf756koiR1MtC8OtS7xMUdwWjfg";

  /* ============================================================
     📌 טוען הזמנה לפי ID
  ============================================================ */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/invitations/${id}`);
        const data = await res.json();

        if (!data.success || !data.invitation) {
          alert("❌ שגיאה בטעינת ההזמנה");
          setLoading(false);
          return;
        }

        setInvite(data.invitation);

        // טעינת הקנבס אחרי שה־ref קיים
        setTimeout(() => {
          if (canvasRef.current?.loadCanvasData) {
            canvasRef.current.loadCanvasData(data.invitation.canvasData);
          } else {
            console.warn("⚠️ loadCanvasData לא נמצא ב־canvasRef");
          }
        }, 120);

      } catch (err) {
        console.error("❌ Failed loading invitation:", err);
        alert("שגיאה בטעינה");
      }

      setLoading(false);
    }

    load();
  }, [id]);

  /* ============================================================
     💾 שמירה
  ============================================================ */
  const handleSave = async () => {
    if (!invite) {
      alert("⏳ ההזמנה עדיין נטענת. נסה שוב בעוד רגע");
      return;
    }

    if (!canvasRef.current || !canvasRef.current.getCanvasData) {
      alert("❌ הקנבס לא מוכן לשמירה");
      return;
    }

    try {
      const newData = canvasRef.current.getCanvasData();

      const res = await fetch(`/api/invitations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvasData: newData,
          title: invite.title, // בטוח קיים כי בדקנו invite קודם
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("🎉 ההזמנה עודכנה בהצלחה!");
      } else {
        alert("❌ שגיאה: " + data.error);
      }
    } catch (err) {
      console.error("❌ Error saving invitation:", err);
      alert("שגיאה בשמירה");
    }
  };

  /* ============================================================
     ⏳ מצב טעינה
  ============================================================ */
  if (loading || !invite) {
    return (
      <div className="p-10 text-center text-xl">
        טוען את ההזמנה...
      </div>
    );
  }

  /* ============================================================
     🎨 רינדור העורך
  ============================================================ */
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Toolbar />

        <div className="flex-1 flex items-center justify-center p-4">
          <EditorCanvas
            ref={canvasRef}
            onSelect={(obj: any) => setSelectedObject(obj)}
          />
        </div>

        <div className="p-4 bg-white border-t text-right">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            💾 שמור שינויים
          </button>
        </div>
      </div>
    </div>
  );
}
