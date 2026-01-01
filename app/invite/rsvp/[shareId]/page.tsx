"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Text, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { notFound } from "next/navigation";

/* ============================================================
   טעינת תמונה ל־Konva
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
   RSVP Page
============================================================ */
export default function InviteRsvpPage({ params }: any) {
  const [invitation, setInvitation] = useState<any | null>(null);
  const [guest, setGuest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);

  const [rsvp, setRsvp] = useState<"yes" | "no" | null>(null);
  const [guestsCount, setGuestsCount] = useState<number>(1);
  const [guestsOpen, setGuestsOpen] = useState(false);

  const [notes, setNotes] = useState<string[]>([]);
  const [otherNote, setOtherNote] = useState("");

  const stageRef = useRef<any>(null);
  const CANVAS_WIDTH = 390;
  const CANVAS_HEIGHT = 700;

  const NOTES_OPTIONS = ["כשר", "טבעוני", "אלרגיות", "נגישות", "אחר"];
  const [shareId, setShareId] = useState<string | null>(null);

  /* unwrap params */
  useEffect(() => {
    async function unwrap() {
      const resolved = await params;
      setShareId(resolved.shareId);
    }
    unwrap();
  }, [params]);

  /* load guest by token */
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

  /* load invitation */
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        טוען הזמנה...
      </div>
    );

  if (!invitation) return notFound();

  const { canvasData } = invitation;

  /* ============================================================
     שליחת RSVP
  ============================================================ */
  /* ============================================================
   שליחת RSVP
============================================================ */
async function submitRsvp() {
  if (!rsvp) {
    alert("נא לבחור מגיע / לא מגיע");
    return;
  }

  if (!guest?.token || !shareId) {
    alert("שגיאה בזיהוי האורח");
    return;
  }

  const finalNotes =
    notes.includes("אחר") && otherNote
      ? [...notes.filter((n) => n !== "אחר"), `אחר: ${otherNote}`]
      : notes;

  try {
    const res = await fetch(`/api/invite/${shareId}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: guest.token,
        rsvp,
        guestsCount: rsvp === "yes" ? guestsCount : 0,
        arrivedCount: rsvp === "yes" ? guestsCount : 0,
        notes: finalNotes.join(", "),
      }),
    });

    const data = await res.json();

    if (data.success) {
      setSent(true);
    } else {
      alert("שגיאה בשליחה: " + (data.error || ""));
    }
  } catch (err) {
    console.error("❌ RSVP error:", err);
    alert("שגיאת שרת");
  }
}


  /* ============================================================
     Render
  ============================================================ */
  return (
    <div className="min-h-screen flex flex-col items-center py-10 overflow-y-auto bg-white">
      {/* Canvas */}
      <div
        className="rounded-3xl overflow-hidden shadow-xl bg-white"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <Stage width={CANVAS_WIDTH} height={CANVAS_HEIGHT} ref={stageRef}>
          <Layer>
            {(canvasData?.objects || []).map((obj: any, i: number) => {
              if (obj.type === "image") {
                return (
                  <LoadedImage
                    key={i}
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

              if (obj.type === "text") {
                return (
                  <Text
                    key={i}
                    x={obj.x}
                    y={obj.y}
                    text={obj.text}
                    fontSize={obj.fontSize || 32}
                    fill={obj.fill || "#000"}
                    fontFamily={obj.fontFamily || "Arial"}
                    align={obj.align || "center"}
                    width={obj.width}
                  />
                );
              }

              return null;
            })}
          </Layer>
        </Stage>
      </div>

      {/* RSVP */}
      <div className="mt-8 w-[390px] bg-white rounded-3xl shadow-xl p-8 mb-16 border border-[#eee]">
        {!sent ? (
          <>
            <h2 className="text-xl font-bold text-center mb-4">אישור הגעה</h2>

            <p className="text-center mb-6">
              שלום {guest?.name || "אורח"}, נשמח לראותך באירוע
            </p>

            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setRsvp("yes")}
                className={`flex-1 py-3 rounded-full font-semibold border ${
                  rsvp === "yes"
                    ? "bg-[#c3b28b] text-white"
                    : "bg-[#faf9f6]"
                }`}
              >
                מגיע
              </button>

              <button
                onClick={() => setRsvp("no")}
                className={`flex-1 py-3 rounded-full font-semibold border ${
                  rsvp === "no"
                    ? "bg-[#b88a8a] text-white"
                    : "bg-[#faf9f6]"
                }`}
              >
                לא מגיע
              </button>
            </div>

            {rsvp === "yes" && (
              <>
                <label className="block mb-2">כמה אנשים יגיעו?</label>

                {/* 🔽 DROPDOWN מקצועי */}
                <div className="relative mb-4">
                  <button
                    type="button"
                    onClick={() => setGuestsOpen((v) => !v)}
                    className="w-full flex justify-between items-center px-4 py-3 rounded-full border border-[#d1c7b4]"
                  >
                    <span>{guestsCount}</span>
                    <span>▾</span>
                  </button>

                  {guestsOpen && (
                    <div className="absolute z-20 mt-2 w-full rounded-2xl border border-[#d1c7b4] bg-white shadow-lg max-h-48 overflow-y-auto">
                      {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                        <div
                          key={n}
                          onClick={() => {
                            setGuestsCount(n);
                            setGuestsOpen(false);
                          }}
                          className={`px-4 py-3 cursor-pointer hover:bg-[#faf9f6] ${
                            guestsCount === n
                              ? "bg-[#f3eee7] font-semibold"
                              : ""
                          }`}
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="block mb-2">הערות (לא חובה):</label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {NOTES_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={notes.includes(opt)}
                        onChange={() =>
                          setNotes((prev) =>
                            prev.includes(opt)
                              ? prev.filter((n) => n !== opt)
                              : [...prev, opt]
                          )
                        }
                      />
                      {opt}
                    </label>
                  ))}
                </div>

                {notes.includes("אחר") && (
                  <input
                    placeholder="פרט/י כאן..."
                    value={otherNote}
                    onChange={(e) => setOtherNote(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3 mb-4"
                  />
                )}
              </>
            )}

            <button
              onClick={submitRsvp}
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#c9b48f] to-[#bda780] text-white font-bold"
            >
              שליחת אישור הגעה
            </button>
          </>
        ) : (
          <div className="text-center text-green-700 font-semibold text-lg">
            ✓ תודה! תשובתך נקלטה.
          </div>
        )}
      </div>
    </div>
  );
}
