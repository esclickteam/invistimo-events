"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Text, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { notFound } from "next/navigation";

/* ============================================================
   hook מותאם לטעינת תמונה לפי URL (ניתן לקריאה בתוך map)
============================================================ */
function LoadedImage({ src, ...rest }: { src: string; [key: string]: any }) {
  const [img] = useImage(src);
  return <KonvaImage image={img} {...rest} />;
}

/* ============================================================
   InviteRsvpPage — עמוד האישור שהאורח רואה
============================================================ */
export default function InviteRsvpPage({ params }: any) {
  const [invitation, setInvitation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvp, setRsvp] = useState<"yes" | "no" | null>(null);

  const stageRef = useRef<any>(null);

  /* ⭐ Next.js 16 – params הוא Promise */
  useEffect(() => {
    async function fetchInvitation() {
      const resolved = await params;
      const { shareId } = resolved;

      try {
        const res = await fetch(`/api/invite/${shareId}`);
        const data = await res.json();

        if (!data.success) {
          setInvitation(null);
          setLoading(false);
          return;
        }

        setInvitation(data.invitation);
      } catch (err) {
        console.error("❌ Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [params]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-lg">
        טוען הזמנה...
      </div>
    );
  }

  if (!invitation) {
    return notFound();
  }

  const { title, canvasData } = invitation;

  /* ------------------------------------------------------------
     שליחת האישור לשרת
  ------------------------------------------------------------ */
  async function submitRsvp() {
    if (!rsvp) {
      alert("נא לבחור מגיע או לא מגיע 😊");
      return;
    }

    alert(
      rsvp === "yes"
        ? "תודה! ההגעה אושרה 🎉"
        : "תודה! סימנת שאינך מגיע/ה 🙏"
    );

    // כאן יהיה POST לשרת
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">{title}</h1>

      {/* ====== כרטיס ההזמנה ====== */}
      <div
        className="rounded-3xl shadow-2xl overflow-hidden border bg-white"
        style={{ width: "390px", height: "700px" }}
      >
        <Stage ref={stageRef} width={390} height={700}>
          <Layer>
            {canvasData?.objects?.length ? (
              canvasData.objects.map((obj: any, i: number) => {
                if (obj.type === "image") {
                  return (
                    <LoadedImage
                      key={i}
                      src={obj.src}
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
                      text={obj.text || ""}
                      fontFamily={obj.fontFamily || "Arial"}
                      align={obj.align || "center"}
                    />
                  );
                }

                return null;
              })
            ) : (
              <Text
                x={80}
                y={200}
                fontSize={20}
                fill="gray"
                text="אין תוכן להצגה עדיין 🎨"
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* ====== כרטיס אישור הגעה ====== */}
      <div className="mt-8 w-[390px] bg-white shadow-xl rounded-3xl p-6 border text-center">
        <h2 className="text-xl font-bold mb-4 text-gray-800">אישור הגעה</h2>

        <p className="text-gray-700 leading-relaxed mb-4">
          שלום אורח/ת יקר/ה,  
          <br />
          נשמח לראותך באירוע שלנו!
          <br />
          אנא עדכנו האם אתם מגיעים:
        </p>

        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={() => setRsvp("yes")}
            className={`px-6 py-2 rounded-full border transition ${
              rsvp === "yes"
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300"
            }`}
          >
            מגיע/ה
          </button>

          <button
            onClick={() => setRsvp("no")}
            className={`px-6 py-2 rounded-full border transition ${
              rsvp === "no"
                ? "bg-red-500 text-white border-red-500"
                : "border-gray-300"
            }`}
          >
            לא מגיע/ה
          </button>
        </div>

        <button
          onClick={submitRsvp}
          className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition active:scale-95"
        >
          שליחת אישור הגעה
        </button>
      </div>
    </div>
  );
}
