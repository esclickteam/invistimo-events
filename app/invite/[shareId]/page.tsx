"use client";

import { useState, useEffect } from "react";
import PublicInviteRenderer from "@/app/components/PublicInviteRenderer";

export default function PublicInvitePage({ params }: any) {
  const [shareId, setShareId] = useState<string | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [sent, setSent] = useState(false);

  const [form, setForm] = useState({
    rsvp: "pending",
    guestsCount: 1,
    notes: "",
  });

  /* ============================================================
     FIX: params הוא Promise
  ============================================================ */
  useEffect(() => {
    async function unwrapParams() {
      const resolved = await params;
      setShareId(resolved.shareId);
    }
    unwrapParams();
  }, [params]);

  /* ============================================================
     טוען את האורח לפי guestId מה-URL
  ============================================================ */
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const guestId = searchParams.get("guest");

    if (!guestId) return;

    async function fetchGuest() {
      try {
        const res = await fetch(`/api/invitationGuests/${guestId}`);
        const data = await res.json();

        if (data.success && data.guest) {
          setSelectedGuest(data.guest);
        }
      } catch (err) {
        console.error("❌ Guest fetch error:", err);
      }
    }

    fetchGuest();
  }, []);

  /* ============================================================
     טוען נתוני הזמנה
  ============================================================ */
  useEffect(() => {
    if (!shareId) return;

    async function fetchData() {
      try {
        const res = await fetch(`/api/invite/${shareId}`);
        const data = await res.json();

        if (data.success && data.invitation) {
          setInvite(data.invitation);
        } else {
          setInvite(null);
        }
      } catch (err) {
        console.error("❌ Fetch error:", err);
        setInvite(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [shareId]);

  /* ============================================================
     שליחת RSVP
  ============================================================ */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedGuest?._id) {
      alert("שגיאה: אורח לא מזוהה מהלינק");
      return;
    }

    try {
      const res = await fetch(
        `/api/invitationGuests/${selectedGuest._id}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();
      if (data.success) setSent(true);
    } catch (err) {
      console.error("❌ Error submitting RSVP:", err);
    }
  }

  /* ============================================================
     מצבי טעינה / שגיאה
  ============================================================ */
  if (loading)
    return <div className="p-10 text-center text-xl">טוען הזמנה...</div>;

  if (!invite)
    return (
      <div className="p-10 text-center text-xl text-red-600">
        ❌ ההזמנה לא נמצאה.
      </div>
    );

  /* ============================================================
     רינדור ראשי
  ============================================================ */
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-4 text-center">{invite.title}</h1>

      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 mb-8 flex justify-center">
        {invite?.canvasData ? (
          <PublicInviteRenderer canvasData={invite.canvasData} />
        ) : (
          <div className="text-gray-400">אין נתוני עיצוב להצגה</div>
        )}
      </div>

      {/* ---------------------------------------------------------
         טופס אורחים – עם זיהוי אוטומטי של אורח
      --------------------------------------------------------- */}
      {!sent ? (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white rounded-2xl shadow p-8 flex flex-col gap-6 border border-[#e8e4d9]"
        >
          <h2 className="text-center text-xl font-semibold text-[#6b6046]">
            אישור הגעה
          </h2>

          {/* ⭐ טקסט אישי או טקסט דוגמה ⭐ */}
          <div className="text-center text-lg text-[#6b6046] font-medium leading-relaxed">
            {selectedGuest ? (
              <>
                שלום {selectedGuest.name},<br />
                נשמח לראותך באירוע!<br />
                אנא עדכנ/י את הגעתך:
              </>
            ) : (
              <>
                שלום (שם האורח),<br />
                נשמח לראותך באירוע!<br />
                אנא עדכנ/י את הגעתך:
              </>
            )}
          </div>

          {/* מגיע / לא מגיע */}
          <div>
            <label className="block mb-2 text-[#5a5a5a] font-medium text-sm">
              האם בכוונתך להגיע?
            </label>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setForm({ ...form, rsvp: "yes" })}
                className={`flex-1 py-3 rounded-full font-medium border transition ${
                  form.rsvp === "yes"
                    ? "bg-[#c3b28b] text-white border-[#c3b28b]"
                    : "bg-[#faf9f6] text-[#6b6046] border-[#d1c7b4]"
                }`}
              >
                מגיע
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, rsvp: "no" })}
                className={`flex-1 py-3 rounded-full font-medium border transition ${
                  form.rsvp === "no"
                    ? "bg-[#b88a8a] text-white border-[#b88a8a]"
                    : "bg-[#faf9f6] text-[#6b6046] border-[#d1c7b4]"
                }`}
              >
                לא מגיע
              </button>
            </div>
          </div>

          {/* כמות אורחים — רק אם מגיע */}
          {form.rsvp === "yes" && (
            <div>
              <label className="block mb-2 text-[#5a5a5a] font-medium text-sm">
                כמה אנשים יגיעו?
              </label>

              <input
                type="number"
                min="1"
                value={form.guestsCount}
                onChange={(e) =>
                  setForm({ ...form, guestsCount: Number(e.target.value) })
                }
                className="w-full px-4 py-3 rounded-xl bg-[#faf9f6] border border-[#d1c7b4] text-[#6b6046]"
              />
            </div>
          )}

          {/* הערות */}
          {form.rsvp === "yes" && (
            <div>
              <label className="block mb-2 text-[#5a5a5a] font-medium text-sm">
                בקשות מיוחדות / הערות (לא חובה):
              </label>

              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full h-28 px-4 py-3 rounded-xl bg-[#faf9f6] border border-[#d1c7b4] text-[#6b6046] resize-none"
                placeholder="כשר, טבעוני, רגישויות, מושבים מיוחדים..."
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#c9b48f] to-[#bda780] text-white font-semibold text-lg shadow-lg hover:opacity-90 transition"
          >
            שליחת אישור הגעה
          </button>
        </form>
      ) : (
        <div className="text-center text-green-700 text-xl font-semibold bg-white px-6 py-4 rounded-xl shadow-md border border-[#e8e4d9]">
          ✓ תודה! תשובתך התקבלה.
        </div>
      )}
    </div>
  );
}
