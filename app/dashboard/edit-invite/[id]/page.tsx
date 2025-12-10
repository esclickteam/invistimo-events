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

  /* טוען הזמנה */
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/invitations/${id}`);
      const data = await res.json();

      if (data.success) {
        setInvite(data.invitation);

        setTimeout(() => {
          if (canvasRef.current?.loadCanvasData) {
            canvasRef.current.loadCanvasData(data.invitation.canvasData);
          }
        }, 100);
      }

      setLoading(false);
    }

    load();
  }, [id]);

  /* שמירה */
  const handleSave = async () => {
    const newData = canvasRef.current.getCanvasData();

    const res = await fetch(`/api/invitations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        canvasData: newData,
        title: invite.title,
      }),
    });

    const data = await res.json();
    if (data.success) {
      alert("🎉 ההזמנה עודכנה בהצלחה!");
    }
  };

  if (loading) return <div className="p-10 text-center">טוען...</div>;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* ⭐ חייב לשלוח googleApiKey + ref */}
      <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Toolbar />

        <div className="flex-1 flex items-center justify-center p-4">
          {/* ⭐ חייב לשלוח onSelect + ref */}
          <EditorCanvas
            ref={canvasRef}
            onSelect={(obj: any) => setSelectedObject(obj)}
          />
        </div>

        <div className="p-4 bg-white border-t text-right">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            💾 שמור שינויים
          </button>
        </div>
      </div>
    </div>
  );
}
