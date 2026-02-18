"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import PublicInviteRenderer from "@/app/components/PublicInviteRenderer";
import EventLocationCard from "@/app/components/EventLocationCard";

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

export default function PublicInvitePage({ params }: any) {
  const router = useRouter();
  const [shareId, setShareId] = useState<string | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [sent, setSent] = useState(false);

  const [form, setForm] = useState({
    rsvp: "pending" as "yes" | "no" | "pending",
    arrivedCount: 1,
    notes: [] as string[],
  });

  const [guestsOpen, setGuestsOpen] = useState(false);

  /* =========================
     Load invite
  ========================= */
  useEffect(() => {
    async function unwrap() {
      const resolved = await params;
      setShareId(resolved.shareId);
    }
    unwrap();
  }, [params]);

  useEffect(() => {
    if (!shareId) return;

    async function fetchInvite() {
      const res = await fetch(`/api/invite/${shareId}`);
      const data = await res.json();

      if (data.success) {
        setInvite(data.invitation);
        setEvent(data.event);
      }

      setLoading(false);
    }

    fetchInvite();
  }, [shareId]);

  /* =========================
     Active dynamic options
  ========================= */
  const activeMenuOptions = useMemo(() => {
    if (!invite?.invitationSettings?.menuOptions) return [];


    const labels: Record<string, string> = {
      vegetarian: "צמחוני",
      vegan: "טבעוני",
      glutenFree: "ללא גלוטן",
      childrenMeal: "מנת ילדים",
      kosher: "כשר",
    };

    return Object.entries(invite.invitationSettings.menuOptions)

      .filter(([_, enabled]) => enabled)
      .map(([key]) => labels[key]);
  }, [invite]);


  const customOptions =
  invite?.invitationSettings?.customOptions ?? [];


  const allowGuestNote =
  invite?.invitationSettings?.allowGuestNote ?? false;


  /* =========================
     Submit
  ========================= */
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
          arrivedCount:
            form.rsvp === "yes" ? form.arrivedCount : 0,
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
    <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center py-10 pb-32">

      {/* Invite Design */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 mb-8">
        {invite.canvasData ? (
          <PublicInviteRenderer canvasData={invite.canvasData} />
        ) : (
          <div className="text-gray-400 text-center">
            אין נתוני עיצוב להצגה
          </div>
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

          {/* Yes / No */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, rsvp: "yes" })
              }
              className={`flex-1 py-3 rounded-full border ${
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
                setForm({
                  ...form,
                  rsvp: "no",
                  arrivedCount: 0,
                })
              }
              className={`flex-1 py-3 rounded-full border ${
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
              {/* Arrived Count */}
              <input
                type="number"
                min={1}
                max={15}
                value={form.arrivedCount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    arrivedCount: Number(e.target.value),
                  })
                }
                className="border rounded-full px-4 py-3"
              />

              {/* Dynamic Options */}
              {(activeMenuOptions.length > 0 ||
                customOptions.length > 0 ||
                allowGuestNote) && (
                <div>
                  <label className="block mb-2 font-medium">
                    העדפות מיוחדות:
                  </label>

                  <div className="grid grid-cols-2 gap-3">

                    {activeMenuOptions.map((opt: string) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          checked={form.notes.includes(opt)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              notes: e.target.checked
                                ? [...form.notes, opt]
                                : form.notes.filter(
                                    (n) => n !== opt
                                  ),
                            })
                          }
                        />
                        {opt}
                      </label>
                    ))}

                    {customOptions
                      .filter((c: any) => c.type === "checkbox")
                      .map((opt: any) => (
                        <label
                          key={opt.key}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={form.notes.includes(
                              opt.label
                            )}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                notes: e.target.checked
                                  ? [
                                      ...form.notes,
                                      opt.label,
                                    ]
                                  : form.notes.filter(
                                      (n) =>
                                        n !== opt.label
                                    ),
                              })
                            }
                          />
                          {opt.label}
                        </label>
                      ))}
                  </div>

                  {customOptions
                    .filter((c: any) => c.type === "text")
                    .map((opt: any) => (
                      <input
                        key={opt.key}
                        placeholder={opt.label}
                        className="w-full border rounded-full px-4 py-3 mt-3"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            notes: [
                              ...form.notes.filter(
                                (n) =>
                                  !n.startsWith(
                                    opt.label + ":"
                                  )
                              ),
                              `${opt.label}: ${e.target.value}`,
                            ],
                          })
                        }
                      />
                    ))}

                  {allowGuestNote && (
                    <textarea
                      placeholder="הערה חופשית"
                      className="w-full border rounded-2xl px-4 py-3 mt-3"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          notes: [
                            ...form.notes.filter(
                              (n) =>
                                !n.startsWith("הערה:")
                            ),
                            `הערה: ${e.target.value}`,
                          ],
                        })
                      }
                    />
                  )}
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#c9b48f] to-[#bda780] text-white font-semibold text-lg"
          >
            שליחת אישור הגעה
          </button>

          <GiftSection giftOptions={invite?.giftOptions} />
        </form>
      ) : (
        <div className="w-full max-w-md bg-white px-6 py-4 rounded-xl shadow text-green-700 font-semibold text-center">
          ✓ תודה! תשובתך התקבלה
        </div>
      )}

      <EventLocationCard location={event?.location} />
    </div>
  );
}
