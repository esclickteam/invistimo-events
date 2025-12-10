"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Text, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { notFound } from "next/navigation";

/* ============================================================
   טעינת תמונה עבור Konva — כולל cache
============================================================ */
function LoadedImage({
  src,
  isBackground,
  canvasW,
  canvasH,
  ...rest
}: {
  src: string;
  isBackground?: boolean;
  canvasW: number;
  canvasH: number;
  [key: string]: any;
}) {
  const [img] = useImage(src, "anonymous");

  if (!img) return null;

  // רקע → cover מלא כמו בעורך
  if (isBackground) {
    const iw = img.width;
    const ih = img.height;
    const aspect = iw / ih;

    let width = canvasW;
    let height = canvasW / aspect;

    if (height < canvasH) {
      height = canvasH;
      width = canvasH * aspect;
    }

    const x = (canvasW - width) / 2;
    const y = (canvasH - height) / 2;

    return (
      <KonvaImage
        image={img}
        x={x}
        y={y}
        width={width}
        height={height}
        listening={false}
      />
    );
  }

  return <KonvaImage image={img} {...rest} />;
}

/* ============================================================
   InviteRsvpPage — גרסה מלאה ומתוקנת
============================================================ */
export default function InviteRsvpPage({ params }: any) {
  const [invitation, setInvitation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [guest, setGuest] = useState<any | null>(null);
  const [sent, setSent] = useState(false);
  const [rsvp, setRsvp] = useState<"yes" | "no" | null>(null);

  const stageRef = useRef<any>(null);
  const CANVAS_WIDTH = 390;
  const CANVAS_HEIGHT = 700;

  const [shareId, setShareId] = useState<string | null>(null);

  /* ⭐ Next.js 16 – params הוא Promise */
  useEffect(() => {
    async function unwrap() {
      const resolved = await params;
      setShareId(resolved.shareId);
    }
    unwrap();
  }, [params]);

  /* ============================================================
     קבלת token
  ============================================================ */
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const token = query.get("token");

    if (!token) return;

    async function loadGuest() {
      const res = await fetch(`/api/invitationGuests/byToken/${token}`);
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

    async function load() {
      try {
        const res = await fetch(`/api/invite/${shareId}`);
        const data = await res.json();

        if (!data.success) {
          setInvitation(null);
          setLoading(false);
          return;
        }

        // ⭐ להבטיח ש-image לא יישמר (כי זה DOM)
        const fixedObjects =
          data.invitation.canvasData?.objects?.map((o: any) => ({
            ...o,
            image: undefined,
          })) || [];

        setInvitation({
          ...data.invitation,
          canvasData: { objects: fixedObjects },
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [shareId]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-lg">
        טוען הזמנה...
      </div>
    );

  if (!invitation) return notFound();

  const { title, canvasData } = invitation;

  /* ============================================================
     שליחת אישור הגעה
  ============================================================ */
  async function submitRsvp() {
    if (!rsvp) {
      alert("נא לבחור מגיע / לא מגיע 😊");
      return;
    }

    if (!guest?.token) {
      alert("שגיאה: אורח לא מזוהה");
      return;
    }

    try {
      const res = await fetch(
        `/api/invitationGuests/respondByToken/${guest.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rsvp,
            guestsCount: 1,
            notes: "",
          }),
        }
      );

      const data = await res.json();
      if (data.success) setSent(true);
      else alert("שגיאה בשליחת התגובה");
    } catch (err) {
      console.error(err);
      alert("שגיאת שרת");
    }
  }

  /* ============================================================
     Render page
  ============================================================ */
  return (
    <div className="flex flex-col items-center min-h-screen bg-[#faf9f6] py-10">
      <h1 className="text-3xl font-bold text-[#6b6046] mb-6">{title}</h1>

      {/* ===== קנבס ההזמנה ===== */}
      <div
        className="rounded-3xl shadow-xl overflow-hidden border bg-white"
        style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}
      >
        <Stage width={CANVAS_WIDTH} height={CANVAS_HEIGHT} ref={stageRef}>
          <Layer>
            {(canvasData?.objects || []).map((obj: any, index: number) => {
              /* ---------- רקע / תמונה ---------- */
              if (obj.type === "image") {
                return (
                  <LoadedImage
                    key={index}
                    src={obj.url}
                    x={obj.x}
                    y={obj.y}
                    width={obj.width}
                    height={obj.height}
                    isBackground={obj.isBackground}
                    canvasW={CANVAS_WIDTH}
                    canvasH={CANVAS_HEIGHT}
                  />
                );
              }

              /* ---------- טקסט ---------- */
              if (obj.type === "text") {
                return (
                  <Text
                    key={index}
                    x={obj.x}
                    y={obj.y}
                    text={obj.text}
                    fontSize={obj.fontSize || 32}
                    fill={obj.fill || "#000"}
                    fontFamily={obj.fontFamily || "Arial"}
                    align={obj.align || "center"}
                    fontStyle={
                      `${obj.fontWeight === "bold" ? "bold" : ""} ${
                        obj.italic ? "italic" : ""
                      }` || ""
                    }
                    textDecoration={obj.underline ? "underline" : ""}
                    width={obj.width}
                  />
                );
              }

              return null;
            })}
          </Layer>
        </Stage>
      </div>

      {/* ===== כרטיס RSVP ===== */}
      <div className="mt-8 w-[390px] bg-white shadow-xl rounded-3xl p-8 border border-[#e8e4d9] text-center">
        {!sent ? (
          <>
            <h2 className="text-xl font-bold text-[#6b6046] mb-4">אישור הגעה</h2>

            <p className="text-[#6b6046] leading-relaxed mb-6 text-lg">
              שלום {guest?.name || "אורח"}, נשמח לראותך באירוע! אנא עדכנו:
            </p>

            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setRsvp("yes")}
                className={`flex-1 py-3 rounded-full font-semibold border transition ${
                  rsvp === "yes"
                    ? "bg-[#c3b28b] text-white"
                    : "bg-[#faf9f6] text-[#6b6046] border-[#d1c7b4]"
                }`}
              >
                מגיע
              </button>

              <button
                onClick={() => setRsvp("no")}
                className={`flex-1 py-3 rounded-full font-semibold border transition ${
                  rsvp === "no"
                    ? "bg-[#b88a8a] text-white"
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
