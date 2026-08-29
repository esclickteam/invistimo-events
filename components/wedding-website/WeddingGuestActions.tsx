"use client";

import { useState } from "react";
import TransportationGuestSection from "@/app/components/TransportationGuestSection";
import { emitWeddingInternalEvent } from "@/lib/weddingWebsite/events";

type GuestActions = {
  authenticated: true;
  rsvp: "yes" | "no" | "pending";
  arrivedCount: number;
  guestsCount: number;
  notes: string;
  canRsvp: boolean;
  canMessage: boolean;
};

type MenuOption = { key: string; label: string };

type Props = {
  shareId: string;
  token: string;
  guest: GuestActions;
  allowGuestNote?: boolean;
  menuOptions?: MenuOption[];
  guestMessagesEnabled?: boolean;
  guestMessageTitle?: string;
  guestMessageDescription?: string;
  showGuestMessage?: boolean;
  showRsvp?: boolean;
};

function splitNotes(value: string, menuOptions: MenuOption[]) {
  const labels = menuOptions.map((option) => option.label);
  const selected = labels.filter((label) => value.includes(label));
  const extra = labels
    .reduce((text, label) => text.replace(label, ""), value)
    .replace(/^,\s*|,\s*$/g, "")
    .replace(/\s*,\s*,/g, ",")
    .trim();
  return { selected, extra };
}

export default function WeddingGuestActions({
  shareId,
  token,
  guest,
  allowGuestNote = true,
  menuOptions = [],
  guestMessagesEnabled = false,
  guestMessageTitle = "השאירו לנו כמה מילים ❤️",
  guestMessageDescription = "נשמח לקרוא ברכה, איחול או הודעה מכם.",
  showGuestMessage = true,
  showRsvp = true,
}: Props) {
  const initialNotes = splitNotes(guest.notes || "", menuOptions);
  const maxGuests = Math.max(1, Number(guest.guestsCount || 1));

  const [rsvp, setRsvp] = useState<"yes" | "no" | "pending">(guest.rsvp || "pending");
  const [arrivedCount, setArrivedCount] = useState(
    guest.rsvp === "yes" ? Math.max(1, guest.arrivedCount || 1) : 1
  );
  const [selectedNotes, setSelectedNotes] = useState<string[]>(initialNotes.selected);
  const [extraNote, setExtraNote] = useState(initialNotes.extra);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(guest.rsvp === "yes" || guest.rsvp === "no");
  const [error, setError] = useState("");

  const [message, setMessage] = useState("");
  const [messageSaving, setMessageSaving] = useState(false);
  const [messageSaved, setMessageSaved] = useState(false);
  const [messageError, setMessageError] = useState("");

  async function submitRsvp() {
    if (saving || rsvp === "pending") {
      setError("בחרו האם תגיעו לחגוג איתנו");
      return;
    }

    emitWeddingInternalEvent({
      name: "wedding_site_rsvp_started",
      shareId,
    });

    try {
      setSaving(true);
      setError("");

      const notes = [...selectedNotes, extraNote.trim()].filter(Boolean);

      const res = await fetch(`/api/invitationGuests/respondByToken/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsvp,
          status: rsvp,
          arrivedCount: rsvp === "yes" ? Math.min(maxGuests, Math.max(1, arrivedCount)) : 0,
          amount: rsvp === "yes" ? Math.min(maxGuests, Math.max(1, arrivedCount)) : 0,
          notes,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "RSVP_FAILED");
      }

      setSaved(true);
      emitWeddingInternalEvent({
        name: "wedding_site_rsvp_completed",
        shareId,
      });
    } catch {
      setError("לא הצלחנו לשמור את האישור. נסו שוב.");
    } finally {
      setSaving(false);
    }
  }

  async function submitMessage() {
    if (messageSaving) return;
    const text = message.trim();
    if (!text) {
      setMessageError("כתבו הודעה לפני השליחה");
      return;
    }

    try {
      setMessageSaving(true);
      setMessageError("");

      const res = await fetch(`/api/w/${shareId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "MESSAGE_FAILED");
      }

      setMessage("");
      setMessageSaved(true);
    } catch {
      setMessageError("לא הצלחנו לשלוח את ההודעה. נסו שוב.");
    } finally {
      setMessageSaving(false);
    }
  }

  return (
    <div dir="rtl" className="ww-guest-actions space-y-8 px-4 pb-16">
      {showRsvp ? (
        <section id="rsvp" data-live="1" className="mx-auto max-w-lg">
          <div className="rounded-[32px] border border-black/10 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
            <p className="text-center text-xs font-black tracking-[0.2em] text-black/40">
              RSVP
            </p>
            <h2 className="mt-2 text-center text-3xl font-black">אישור הגעה</h2>
            <p className="mt-2 text-center text-sm font-semibold text-black/55">
              האם תגיעו לחגוג איתנו?
            </p>

            {saved ? (
              <div className="mt-6 rounded-3xl bg-emerald-50 px-5 py-6 text-center">
                <p className="text-lg font-black text-emerald-800">תודה, האישור נשמר ❤️</p>
                <p className="mt-2 text-sm font-semibold text-emerald-700">
                  {rsvp === "yes" ? "מחכים לכם!" : "עדכנו שלא תוכלו להגיע."}
                </p>
                <button
                  type="button"
                  onClick={() => setSaved(false)}
                  className="mt-4 text-sm font-black text-emerald-800 underline"
                >
                  רוצים לעדכן?
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRsvp("yes")}
                    className={`min-h-[52px] rounded-2xl px-4 text-sm font-black ${
                      rsvp === "yes"
                        ? "bg-black text-white"
                        : "border border-black/15 bg-white text-black/70"
                    }`}
                  >
                    בשמחה, מגיעים
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRsvp("no");
                      setArrivedCount(0);
                    }}
                    className={`min-h-[52px] rounded-2xl px-4 text-sm font-black ${
                      rsvp === "no"
                        ? "bg-black text-white"
                        : "border border-black/15 bg-white text-black/70"
                    }`}
                  >
                    לצערנו לא נוכל להגיע
                  </button>
                </div>

                {rsvp === "yes" ? (
                  <div className="rounded-3xl bg-black/[0.03] p-4">
                    <p className="text-center text-sm font-black">כמה מגיעים?</p>
                    <div className="mt-3 flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => setArrivedCount((value) => Math.max(1, value - 1))}
                        className="flex h-12 w-12 items-center justify-center rounded-full border border-black/15 text-xl font-black"
                      >
                        −
                      </button>
                      <span className="min-w-[48px] text-center text-2xl font-black">
                        {arrivedCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setArrivedCount((value) => Math.min(maxGuests, value + 1))
                        }
                        className="flex h-12 w-12 items-center justify-center rounded-full border border-black/15 text-xl font-black"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ) : null}

                {rsvp === "yes" && menuOptions.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {menuOptions.map((option) => {
                      const checked = selectedNotes.includes(option.label);
                      return (
                        <label
                          key={option.key}
                          className={`flex min-h-[48px] items-center gap-2 rounded-2xl border px-3 text-sm font-semibold ${
                            checked ? "border-black bg-black/5" : "border-black/10"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setSelectedNotes((prev) =>
                                event.target.checked
                                  ? [...prev, option.label]
                                  : prev.filter((item) => item !== option.label)
                              )
                            }
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                ) : null}

                {allowGuestNote ? (
                  <textarea
                    value={extraNote}
                    onChange={(event) => setExtraNote(event.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="הערות או בקשות מיוחדות..."
                    className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm"
                  />
                ) : null}

                {error ? <p className="text-center text-sm font-bold text-red-600">{error}</p> : null}

                <button
                  type="button"
                  disabled={saving}
                  onClick={submitRsvp}
                  className="min-h-[54px] w-full rounded-2xl bg-black text-base font-black text-white disabled:opacity-60"
                >
                  {saving ? "שומר אישור..." : "שמירת אישור"}
                </button>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section id="transportation-live" className="mx-auto max-w-lg">
        <TransportationGuestSection
          shareId={shareId}
          guestToken={token}
          hideGuestIdentity
        />
      </section>

      {guestMessagesEnabled && showGuestMessage ? (
        <section id="guest-message" data-live="1" className="mx-auto max-w-lg">
          <div className="rounded-[32px] border border-black/10 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
            <h2 className="text-center text-3xl font-black">{guestMessageTitle}</h2>
            <p className="mt-2 text-center text-sm font-semibold text-black/55">
              {guestMessageDescription}
            </p>

            {messageSaved ? (
              <p className="mt-6 rounded-3xl bg-rose-50 px-5 py-6 text-center text-lg font-black text-rose-800">
                ההודעה נשלחה לזוג ❤️
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value.slice(0, 1000))}
                  rows={3}
                  maxLength={1000}
                  placeholder="כתבו כאן..."
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm"
                />
                <p className="text-left text-xs text-black/35">{message.length}/1000</p>
                {messageError ? (
                  <p className="text-center text-sm font-bold text-red-600">{messageError}</p>
                ) : null}
                <button
                  type="button"
                  disabled={messageSaving}
                  onClick={submitMessage}
                  className="min-h-[54px] w-full rounded-2xl bg-black text-base font-black text-white disabled:opacity-60"
                >
                  {messageSaving ? "שולח..." : "שליחת הודעה"}
                </button>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
