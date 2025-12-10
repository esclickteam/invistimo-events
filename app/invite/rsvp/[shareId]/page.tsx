"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Text, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { notFound } from "next/navigation";

/* ============================================================
   טעינת תמונה עבור Konva
============================================================ */
function LoadedImage({ src, ...rest }: { src: string; [key: string]: any }) {
  const [img] = useImage(src);
  return <KonvaImage image={img} {...rest} />;
}

/* ============================================================
   InviteRsvpPage — עמוד ציבורי מלא זהה לעמוד המקורי
============================================================ */
export default function InviteRsvpPage({ params }: any) {
  const [invitation, setInvitation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [guest, setGuest] = useState<any | null>(null);
  const [sent, setSent] = useState(false);

  const [rsvp, setRsvp] = useState<"yes" | "no" | null>(null);

  const stageRef = useRef<any>(null);

  /* ⭐ Next.js 16 – params הוא Promise */
  const [shareId, setShareId] = useState<string | null>(null);

  useEffect(() => {
    async function unwrap() {
      const resolved = await params;
      setShareId(resolved.shareId);
    }
    unwrap();
  }, [params]);

  /* ============================================================
     קבלת guestId מה־URL
============================================================ */
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const guestId = query.get("guest");

    if (!guestId) return;

    async function loadGuest() {
      const res = await fetch(`/api/invitationGuests/${guestId}`);
      const data = await res.json();
      if (data.success) setGuest(data.guest);
    }

    loadGuest();
  }, []);

  /* ============================================================
     טעינת ההזמנה לפי shareId
============================================================ */
  useEffect(() => {
    if (!shareId) return;

    async function loadInvitation() {
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

    loadInvitation();
  }, [shareId]);

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

  /* ============================================================
     שליחת אישור הגעה לשרת
============================================================ */
  async function submitRsvp() {
    if (!rsvp) {
      alert("נא לבחור מגיע / לא מגיע 😊");
      return;
    }

    if (!guest?._id) {
      alert("שגיאה: האורח לא מזוהה מהקישור");
      return;
    }

    try {
      const res = await fetch(`/api/invitationGuests/${guest._id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsvp,
          guestsCount: 1,
          notes: "",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        alert("הייתה שגיאה בשליחת התגובה");
      }
    } catch (err) {
      console.error(err);
      alert("שגיאת שרת");
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#faf9f6] py-10">

      {/* כותרת */}
      <h1 className="text-3xl font-bold text-[#6b6046] mb-6">{title}</h1>

      {/* ====== כרטיס ההזמנה (Canvas) ====== */}
      <div
        className="rounded-3xl shadow-xl overflow-hidden border bg-white"
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

      {/* ====== כרטיס אישור הגעה מעוצב ====== */}
      <div className="mt-8 w-[390px] bg-white shadow-xl rounded-3xl p-8 border border-[#e8e4d9] text-center">

        {!sent ? (
          <>
            <h2 className="text-xl font-bold text-[#6b6046] mb-4">
              אישור הגעה
            </h2>

            <p className="text-[#6b6046] leading-relaxed mb-6 text-lg">
              {guest ? (
                <>
                  שלום {guest.name},<br />
                  נשמח לראותך באירוע!<br />
                  אנא עדכנ/י את הגעתך:
                </>
              ) : (
                <>
                  שלום אורח יקר,<br />
                  נשמח לראותך באירוע!<br />
                  אנא עדכנ/י את הגעתך:
                </>
              )}
            </p>

            {/* כפתורי מגיע / לא מגיע */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setRsvp("yes")}
                className={`flex-1 py-3 rounded-full font-semibold border transition ${
                  rsvp === "yes"
                    ? "bg-[#c3b28b] text-white border-[#c3b28b]"
                    : "bg-[#faf9f6] text-[#6b6046] border-[#d1c7b4]"
                }`}
              >
                מגיע
              </button>

              <button
                onClick={() => setRsvp("no")}
                className={`flex-1 py-3 rounded-full font-semibold border transition ${
                  rsvp === "no"
                    ? "bg-[#b88a8a] text-white border-[#b88a8a]"
                    : "bg-[#faf9f6] text-[#6b6046] border-[#d1c7b4]"
                }`}
              >
                לא מגיע
              </button>
            </div>

             <button
              onClick={submitRsvp}
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#c9b48f] to-[#bda780] text-white font-bold text-lg shadow-lg hover:opacity-90 transition"
            >
              שליחת אישור הגעה
            </button>
          </>
        ) : (
          <div className="text-green-700 text-xl font-semibold">
             ✓ תודה! תשובתך נקלטה.
          </div>
        )}
      </div>
    </div>
  );
}
