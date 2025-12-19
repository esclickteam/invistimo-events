"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PublicInviteRenderer from "@/app/components/PublicInviteRenderer";
import EventLocationCard from "@/app/components/EventLocationCard";

const NOTES_OPTIONS = ["כשר", "טבעוני", "אלרגיות", "נגישות", "אחר"];

export default function PublicInvitePage({ params }: any) {
  const router = useRouter();
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

  const [guestsOpen, setGuestsOpen] = useState(false);

  /* ============================================================
     unwrap params
  ============================================================ */
  useEffect(() => {
    async function unwrap() {
      const resolved = await params;
      setShareId(resolved.shareId);
    }
    unwrap();
  }, [params]);

  /* ============================================================
     זיהוי אורח לפי token (?token=)
  ============================================================ */
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");
    if (!token) return;

    async function fetchGuest() {
      try {
        const res = await fetch(`/api/invitationGuests/byToken/${token}`);
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

    if (!selectedGuest?.token) {
      alert("שגיאה בזיהוי האורח");
      return;
    }

    try {
      const res = await fetch(
        `/api/invitationGuests/respondByToken/${selectedGuest.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();
      if (data.success) {
        if (form.rsvp === "yes") {
          router.push("/thank-you");
        } else {
          setSent(true);
        }
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

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div className="min-h-screen w-full overflow-y-auto bg-[#faf9f6]">
      <div className="flex flex-col items-center py-10 pb-32">
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

        {/* כרטיס מיקום / איך מגיעים */}
        <EventLocationCard location={invite.location} />

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

            {form.rsvp === "yes" && (
              <>
                {/* כמות אורחים */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-[#5a5a5a]">
                    כמה אנשים יגיעו?
                  </label>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setGuestsOpen((v) => !v)}
                      className="w-full flex justify-between items-center px-4 py-3 rounded-full border border-[#d1c7b4] bg-white"
                    >
                      <span>{form.guestsCount}</span>
                      <span className="text-gray-400">▾</span>
                    </button>

                    {guestsOpen && (
                      <div className="absolute z-20 mt-2 w-full rounded-2xl border border-[#d1c7b4] bg-white shadow-lg max-h-48 overflow-y-auto">
                        {Array.from({ length: 15 }, (_, i) => i + 1).map(
                          (num) => (
                            <div
                              key={num}
                              onClick={() => {
                                setForm({
                                  ...form,
                                  guestsCount: num,
                                });
                                setGuestsOpen(false);
                              }}
                              className={`px-4 py-3 cursor-pointer hover:bg-[#faf9f6] ${
                                form.guestsCount === num
                                  ? "bg-[#f3eee7] font-semibold"
                                  : ""
                              }`}
                            >
                              {num}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* הערות */}
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
                            setForm({
                              ...form,
                              notes: e.target.checked
                                ? [...form.notes, opt]
                                : form.notes.filter((n) => n !== opt),
                            });
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
    </div>
  );
}
