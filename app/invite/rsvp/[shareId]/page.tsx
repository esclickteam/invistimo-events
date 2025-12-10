"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Text, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { notFound } from "next/navigation";

/* ============================================================
   רכיב להצגת Canvas אמיתי מהנתונים השמורים
============================================================ */
export default function InviteRsvpPage({ params }: any) {
  const [invitation, setInvitation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const stageRef = useRef<any>(null);

  /* ⭐ Next.js 16 — חובה לפתור את params כ־Promise */
  useEffect(() => {
    async function fetchInvitation() {
      const resolved = await params;
      const { shareId } = resolved;
      console.log("🎟️ Fetching invitation by shareId:", shareId);

      try {
        const res = await fetch(`/api/invite/${shareId}`);
        const data = await res.json();

        if (!data.success) {
          console.error("❌ Invitation not found:", data.error);
          setInvitation(null);
          setLoading(false);
          return;
        }

        setInvitation(data.invitation);
      } catch (err) {
        console.error("❌ Fetch error:", err);
        setInvitation(null);
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [params]);

  /* ------------------------------------------------------------
     ⏳ בזמן טעינה
  ------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-lg">
        טוען הזמנה...
      </div>
    );
  }

  if (!invitation) {
    notFound();
  }

  /* ------------------------------------------------------------
     🎨 מציג את ההזמנה מה-canvasData (JSON)
  ------------------------------------------------------------ */
  const { title, canvasData } = invitation;

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-pink-50 to-blue-50 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">{title}</h1>

      <div
        className="rounded-3xl shadow-2xl overflow-hidden border bg-white"
        style={{
          width: "390px",
          height: "700px",
        }}
      >
        <Stage ref={stageRef} width={390} height={700} className="bg-white">
          <Layer>
            {/* ⭐️ כאן נטען את האובייקטים שנשמרו */}
            {canvasData?.objects?.map((obj: any, i: number) => {
              if (obj.type === "image") {
                const [image] = useImage(obj.src);
                return (
                  <KonvaImage
                    key={i}
                    image={image}
                    x={obj.x}
                    y={obj.y}
                    width={obj.width}
                    height={obj.height}
                  />
                );
              }

              if (obj.type === "text") {
                return (
                  <Text
                    key={i}
                    x={obj.x}
                    y={obj.y}
                    fontSize={obj.fontSize || 24}
                    fill={obj.color || "black"}
                    text={obj.text}
                    fontFamily={obj.fontFamily || "Arial"}
                    align={obj.align || "center"}
                  />
                );
              }

              return null;
            })}
          </Layer>
        </Stage>
      </div>

      {/* כפתור אישור הגעה */}
      <button
        className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-95"
        onClick={() => alert("תודה! ההגעה אושרה 🎉")}
      >
        אשר/י הגעה ✨
      </button>
    </div>
  );
}
