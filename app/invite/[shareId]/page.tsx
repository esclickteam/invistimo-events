"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import PublicInviteRenderer from "@/app/components/PublicInviteRenderer";
import EventLocationCard from "@/app/components/EventLocationCard";

/* ============================================================
   MENU LABELS
============================================================ */

const MENU_LABELS: Record<string, string> = {
  vegetarian: "צמחוני",
  vegan: "טבעוני",
  glutenFree: "ללא גלוטן",
  childrenMeal: "מנת ילדים",
  kosher: "כשר",
  kosherGlatt: "כשר גלאט",
  kosherMahfoud: "כשר מחפוד",
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
            className="flex-1 text-center py-3 rounded-full font-medium border bg-white text-[#6b6046] border-[#d1c7b4]"
          >
            מתנה באשראי
          </a>
        )}

        {showPaybox && (
          <a
            href={payboxUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center py-3 rounded-full font-medium border bg-white text-[#6b6046] border-[#d1c7b4]"
          >
            מתנה ב-PayBox
          </a>
        )}
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
  const [token, setToken] = useState<string | null>(null);

  const [invite, setInvite] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);

  const [form, setForm] = useState({
    rsvp: "pending" as "yes" | "no" | "pending",
    arrivedCount: 1,
    notes: [] as string[],
  });

  /* ============================================================
     UNWRAP PARAMS + TOKEN
  ============================================================ */

  useEffect(() => {
    (async () => {
      const resolved = await params;
      setShareId(resolved.shareId);

      const sp = new URLSearchParams(window.location.search);
      const t = sp.get("token");
      if (t) setToken(t);
    })();
  }, [params]);

  /* ============================================================
     LOAD INVITATION + GUEST
  ============================================================ */

  useEffect(() => {
    if (!shareId) return;

    async function fetchInvite() {
      try {
        const res = await fetch(
          `/api/invite/${shareId}${token ? `?token=${token}` : ""}`
        );
        const data = await res.json();

        if (data.success) {
          setInvite(data.invitation);
          setEvent(data.event);

          if (data.guest) {
            setSelectedGuest(data.guest);

            // אם כבר יש RSVP – נטעין אותו
            if (data.guest.rsvp) {
              setForm((f) => ({
                ...f,
                rsvp: data.guest.rsvp,
                arrivedCount:
                  typeof data.guest.arrivedCount === "number"
                    ? data.guest.arrivedCount
                    : 1,
                notes: Array.isArray(data.guest.notes)
                  ? data.guest.notes
                  : [],
              }));
            }
          }
        } else {
          setInvite(null);
        }
      } catch {
        setInvite(null);
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
  }, [shareId, token]);

  /* ============================================================
     ACTIVE MENU OPTIONS
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
      .filter((x) => x.label);
  }, [invite]);

  const giftOptions = useMemo(() => invite?.giftOptions, [invite]);

  /* ============================================================
     SUBMIT RSVP
  ============================================================ */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedGuest?.token) {
      alert("שגיאה בזיהוי האורח");
      return;
    }

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
      form.rsvp === "yes" ? router.push("/thank-you") : setSent(true);
    }
  }

  /* ============================================================
     RENDER
  ============================================================ */

  if (loading) return <div className="p-10 text-center">טוען הזמנה…</div>;
  if (!invite)
    return <div className="p-10 text-center text-red-600">❌ ההזמנה לא נמצאה</div>;

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <div className="flex flex-col items-center py-10 pb-32">

        <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 mb-8">
  {invite.inviteImageUrl ? (
    <img
      src={invite.inviteImageUrl}
      alt="הזמנה"
      className="w-full rounded-xl object-contain"
    />
  ) : (
    invite.canvasData && (
     <PublicInviteRenderer
  canvasData={invite.canvasData}
  designMode={invite.designMode}
  inviteImageUrl={invite.inviteImageUrl}
/>
    )
  )}
</div>

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
                onClick={() =>
                  setForm({ ...form, rsvp: "yes", arrivedCount: 1 })
                }
                className={`flex-1 py-3 rounded-full border ${
                  form.rsvp === "yes"
                    ? "bg-[#c3b28b] text-white border-[#c3b28b]"
                    : "border-[#d1c7b4] text-[#6b6046]"
                }`}
              >
                מגיע
              </button>

              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, rsvp: "no", arrivedCount: 0 })
                }
                className={`flex-1 py-3 rounded-full border ${
                  form.rsvp === "no"
                    ? "bg-[#b88a8a] text-white border-[#b88a8a]"
                    : "border-[#d1c7b4] text-[#6b6046]"
                }`}
              >
                לא מגיע
              </button>
            </div>

            {/* כמה מגיעים */}
            {form.rsvp === "yes" && (
              <div className="flex flex-col items-center gap-2">
                <div className="text-sm font-medium text-[#6b6046]">
                  כמה מגיעים?
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        arrivedCount: Math.max(1, p.arrivedCount - 1),
                      }))
                    }
                    className="w-10 h-10 rounded-full border border-[#d1c7b4]"
                  >
                    −
                  </button>

                  <div className="min-w-[40px] text-center font-semibold">
                    {form.arrivedCount}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        arrivedCount: p.arrivedCount + 1,
                      }))
                    }
                    className="w-10 h-10 rounded-full border border-[#d1c7b4]"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* הערות */}
            {form.rsvp === "yes" && activeMenuOptions.length > 0 && (
              <div>
                <label className="block mb-2 text-sm font-medium">
                  הערות:
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {activeMenuOptions.map((opt) => (
                    <label key={opt.key} className="flex gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.notes.includes(opt.label)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            notes: e.target.checked
                              ? [...form.notes, opt.label]
                              : form.notes.filter((n) => n !== opt.label),
                          })
                        }
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
          <div className="bg-white px-6 py-4 rounded-xl shadow text-green-700 font-semibold">
            ✓ תודה! תשובתך התקבלה
          </div>
        )}

        <EventLocationCard location={event?.location} />
      </div>
    </div>
  );
}
