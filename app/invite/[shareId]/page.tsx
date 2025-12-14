"use client";

import { useState, useEffect } from "react";
import PublicInviteRenderer from "@/app/components/PublicInviteRenderer";

const NOTES_OPTIONS = [
  "כשר",
  "טבעוני",
  "אלרגיות",
  "נגישות",
  "אחר",
];

export default function PublicInvitePage({ params }: any) {
  const [shareId, setShareId] = useState<string | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [sent, setSent] = useState(false);

  const [form, setForm] = useState<{
    rsvp: "yes" | "no" | "pending";
    guestsCount: number;
    notes: string[];
  }>({
    rsvp: "pending",
    guestsCount: 1,
    notes: [],
  });

  /* ============================================================
     unwrap params (Next 14)
  ============================================================ */
  useEffect(() => {
    async function unwrap() {
      const resolved = await params;
      setShareId(resolved.shareId);
    }
    unwrap();
  }, [params]);

  /* ============================================================
     זיהוי אורח מה-URL (?guest=)
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
          setForm((prev) => ({
            ...prev,
            guestsCount: data.guest.guestsCount || 1,
          }));
        }
      } catch (err) {
        console.error("❌ Guest fetch error:", err);
      }
    }

    fetchGuest();
  }, []);

  /* ============================================================
     טעינת ההזמנה
  ============================================================ */
  useEffect(() => {
    if (!shareId) return;

    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invite/${shareId}`);
        const data = await res.json();

        if (data.success && data.invitation) {
          setInvite(data.invitation);
        } else {
          setInvite(null);
        }
      } catch (err) {
        console.error("❌ Invite fetch error:", err);
        setInvite(null);
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
  }, [shareId]);

  /* ============================================================
     שליחת RSVP
  ============================================================ */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedGuest?._id) {
      alert("שגיאה בזיהוי האורח");
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
      if (data.success) {
        setSent(true);
      }
    } catch (err) {
      console.error("❌ RSVP error:", err);
    }
  }

  if (loading) {
    return <div className="p-10 text-center">טוען הזמנה…</div>;
  }

  if (!invite) {
    return (
      <div className="p-10 text-center text-red-600">
        ❌ ההזמנה לא נמצאה
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center py-10 pb-32 overflow-y-auto">

      {/* הזמנה מעוצבת */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 mb-8">
        {invite.canvasData ? (
          <PublicInviteRenderer canvasData={invite.canvasData} />
        ) : (
          <div className="text-gray-400 text-center">
            אין נתוני עיצוב להצגה
          </div>
        )}
      </div>

      {/* טופס אישור הגעה */}
      {!sent ? (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white rounded-2xl shadow p-8 flex flex-col gap-6"
        >
          <div className="text-center text-lg font-medium text-[#6b6046]">
            {selectedGuest ? (
              <>
                שלום {selectedGuest.name},<br />
                נשמח לראותך באירוע!
              </>
            ) : (
              <>נשמח לראותך באירוע!</>
            )}
          </div>

          {/* מגיע / לא מגיע */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setForm({ ...form, rsvp: "yes" })}
              className={`flex-1 py-3 rounded-full font-medium border ${
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
              className={`flex-1 py-3 rounded-full font-medium border ${
                form.rsvp === "no"
                  ? "bg-[#b88a8a] text-white border-[#b88a8a]"
                  : "bg-[#faf9f6] text-[#6b6046] border-[#d1c7b4]"
              }`}
            >
              לא מגיע
            </button>
          </div>

          {/* המשך – רק אם מגיע */}
          {form.rsvp === "yes" && (
            <>
              {/* כמות מגיעים */}
              <div>
                <label className="block mb-2 text-sm font-medium text-[#5a5a5a]">
                  כמה אנשים יגיעו?
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.guestsCount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      guestsCount: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-[#d1c7b4]"
                />
              </div>

              {/* הערות – צ׳קבוקסים */}
              <div>
                <label className="block mb-2 text-sm font-medium text-[#5a5a5a]">
                  הערות:
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {NOTES_OPTIONS.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-2 text-sm text-[#6b6046]"
                    >
                      <input
                        type="checkbox"
                        checked={form.notes.includes(opt)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({
                              ...form,
                              notes: [...form.notes, opt],
                            });
                          } else {
                            setForm({
                              ...form,
                              notes: form.notes.filter((n) => n !== opt),
                            });
                          }
                        }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#c9b48f] to-[#bda780] text-white font-semibold text-lg"
          >
            שליחת אישור הגעה
          </button>
        </form>
      ) : (
        <div className="bg-white px-6 py-4 rounded-xl shadow text-green-700 font-semibold">
          ✓ תודה! תשובתך התקבלה
        </div>
      )}
    </div>
  );
}
