"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import PublicInviteRenderer from "@/app/components/PublicInviteRenderer";
import EventLocationCard from "@/app/components/EventLocationCard";

/* ============================================================
   MENU LABELS (מה שמוגדר בדשבורד)
============================================================ */

const MENU_LABELS: Record<string, string> = {
  vegetarian: "צמחוני",
  vegan: "טבעוני",
  glutenFree: "ללא גלוטן",
  childrenMeal: "מנת ילדים",
  kosher: "כשר",
  kosherGlatt: "כשר גלאט",
  transportation: "הסעות",
};

/* ============================================================
   Gift Section
============================================================ */

type GiftOptions = {
  creditEnabled?: boolean;
  creditUrl?: string;
  payboxEnabled?: boolean;
  payboxUrl?: string;
};

function GiftSection({ giftOptions }: { giftOptions?: GiftOptions }) {
  const creditUrl = (giftOptions?.creditUrl ?? "").trim();
  const payboxUrl = (giftOptions?.payboxUrl ?? "").trim();

  const showCredit = !!giftOptions?.creditEnabled && !!creditUrl;
  const showPaybox = !!giftOptions?.payboxEnabled && !!payboxUrl;

  if (!showCredit && !showPaybox) return null;

  return (
    <div className="mt-2 rounded-2xl border border-[#e8dfcf] bg-[#faf9f6] p-4">
      <div className="text-center font-medium text-[#6b6046] mb-3">
        🎁 רוצים לשמח גם במתנה?
      </div>

      <div className="flex gap-3">
        {showCredit && (
          <a
            href={creditUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center py-3 rounded-full font-medium border bg-white text-[#6b6046] border-[#d1c7b4] hover:bg-[#f5f2ec] transition"
          >
            מתנה באשראי
          </a>
        )}

        {showPaybox && (
          <a
            href={payboxUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center py-3 rounded-full font-medium border bg-white text-[#6b6046] border-[#d1c7b4] hover:bg-[#f5f2ec] transition"
          >
            מתנה ב-PayBox
          </a>
        )}
      </div>

      <div className="text-[11px] text-center text-[#8a816f] mt-3">
        הקישור נפתח בחלון חדש
      </div>
    </div>
  );
}

/* ============================================================
   PUBLIC INVITE PAGE
============================================================ */

export default function PublicInvitePage({ params }: any) {
  const router = useRouter();

  const [shareId, setShareId] = useState<string | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [sent, setSent] = useState(false);

  const [form, setForm] = useState<{
    rsvp: "yes" | "no" | "pending";
    arrivedCount: number;
    notes: string[];
  }>({
    rsvp: "pending",
    arrivedCount: 1,
    notes: [],
  });

  const [guestsOpen, setGuestsOpen] = useState(false);

  /* ============================================================
     UNWRAP PARAMS
  ============================================================ */

  useEffect(() => {
    async function unwrap() {
      const resolved = await params;
      setShareId(resolved.shareId);
    }
    unwrap();
  }, [params]);

  /* ============================================================
     LOAD INVITATION
  ============================================================ */

  useEffect(() => {
    if (!shareId) return;

    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invite/${shareId}`);
        const data = await res.json();

        if (data.success && data.invitation && data.event) {
          setInvite(data.invitation);
          setEvent(data.event);
        } else {
          setInvite(null);
          setEvent(null);
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
     ACTIVE MENU OPTIONS (רק מה שסומן בדשבורד)
  ============================================================ */

  const activeMenuOptions = useMemo(() => {
    const menu = invite?.invitationSettings?.menuOptions;
    if (!menu) return [];

    return Object.entries(menu)
      .filter(([_, value]) => value === true)
      .map(([key]) => ({
        key,
        label: MENU_LABELS[key],
      }))
      .filter((item) => item.label);
  }, [invite]);

  const giftOptions: GiftOptions | undefined = useMemo(() => {
    return invite?.giftOptions;
  }, [invite]);

  /* ============================================================
     SUBMIT RSVP
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
          body: JSON.stringify({
            rsvp: form.rsvp,
            arrivedCount: form.rsvp === "yes" ? form.arrivedCount : 0,
            notes: form.notes,
          }),
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
     RENDER
  ============================================================ */

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-[#faf9f6]">
      <div className="flex flex-col items-center py-10 pb-32">

        {/* עיצוב ההזמנה */}
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
              נשמח לראותך באירוע!
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
                onClick={() =>
                  setForm({ ...form, rsvp: "no", arrivedCount: 0 })
                }
                className={`flex-1 py-3 rounded-full font-medium border ${
                  form.rsvp === "no"
                    ? "bg-[#b88a8a] text-white border-[#b88a8a]"
                    : "bg-[#faf9f6] text-[#6b6046] border-[#d1c7b4]"
                }`}
              >
                לא מגיע
              </button>
            </div>

            {form.rsvp === "yes" && activeMenuOptions.length > 0 && (
              <div>
                <label className="block mb-2 text-sm font-medium text-[#5a5a5a]">
                  הערות:
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {activeMenuOptions.map((opt) => (
                    <label
                      key={opt.key}
                      className="flex items-center gap-2 text-sm text-[#6b6046]"
                    >
                      <input
                        type="checkbox"
                        checked={form.notes.includes(opt.label)}
                        onChange={(e) => {
                          setForm({
                            ...form,
                            notes: e.target.checked
                              ? [...form.notes, opt.label]
                              : form.notes.filter((n) => n !== opt.label),
                          });
                        }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#c9b48f] to-[#bda780] text-white font-semibold text-lg"
            >
              שליחת אישור הגעה
            </button>

            <GiftSection giftOptions={giftOptions} />
          </form>
        ) : (
          <div className="w-full max-w-md bg-white px-6 py-4 rounded-xl shadow text-green-700 font-semibold text-center">
            ✓ תודה! תשובתך התקבלה
          </div>
        )}

        {/* כרטיס מיקום */}
        <div className="w-full flex justify-center">
          <EventLocationCard location={event?.location} />
        </div>
      </div>
    </div>
  );
}
