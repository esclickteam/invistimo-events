"use client";

import { useEffect, useMemo, useState } from "react";

const ANSWER_OPTIONS = [
  { value: "answered", label: "ענה" },
  { value: "no_answer", label: "לא ענה" },
];

const RESULT_OPTIONS = [
  { value: "yes", label: "מגיע" },
  { value: "no", label: "לא מגיע" },
  { value: "will_reply", label: "ישיב בהודעה" },
  { value: "needs_correction", label: "ממתין לתיקון" },
];

const ROUND_LABELS = {
  1: "סבב ראשון",
  2: "סבב שני",
  3: "סבב שלישי",
};

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getGuestAmount(guest) {
  const amount = Number(
    guest?.amount ??
      guest?.guestsCount ??
      guest?.confirmedCount ??
      guest?.expectedGuests ??
      1
  );

  return Number.isFinite(amount) && amount > 0 ? amount : 1;
}

function normalizeRound(existing, roundNumber, guest) {
  const oldNotes = Array.isArray(existing?.notes)
    ? existing.notes
    : existing?.notes
      ? [
          {
            text: String(existing.notes),
            createdAt: existing.calledAt || existing.updatedAt || new Date().toISOString(),
            createdBy: "מערכת",
          },
        ]
      : [];

  return {
    roundNumber,
    answerStatus: existing?.answerStatus || existing?.status || null,
    resultStatus: existing?.resultStatus || null,
    amount: Number(existing?.amount || getGuestAmount(guest)),
    notes: oldNotes,
    calledAt: existing?.calledAt || null,
    updatedAt: existing?.updatedAt || null,
  };
}

function buildInitialRounds(guest) {
  return [1, 2, 3].map((roundNumber) => {
    const existing = Array.isArray(guest?.callRounds)
      ? guest.callRounds.find((round) => round.roundNumber === roundNumber)
      : null;

    return normalizeRound(existing, roundNumber, guest);
  });
}

function getLatestRsvpFromRounds(rounds, guest) {
  const reversedRounds = [...rounds].reverse();

  for (const round of reversedRounds) {
    if (round.answerStatus !== "answered") continue;

    if (round.resultStatus === "yes") {
      return {
        rsvpStatus: "yes",
        amount: Math.max(1, Number(round.amount || 1)),
      };
    }

    if (round.resultStatus === "no") {
      return {
        rsvpStatus: "no",
        amount: 0,
      };
    }

    if (
      round.resultStatus === "will_reply" ||
      round.resultStatus === "needs_correction"
    ) {
      return {
        rsvpStatus: "pending",
        amount: getGuestAmount(guest),
      };
    }
  }

  return {
    rsvpStatus: guest?.rsvpStatus || "pending",
    amount: getGuestAmount(guest),
  };
}

export default function CallRoundsModal({ guest, onClose, onUpdated }) {
  const [rounds, setRounds] = useState(() => buildInitialRounds(guest));
  const [noteDrafts, setNoteDrafts] = useState({
    1: "",
    2: "",
    3: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRounds(buildInitialRounds(guest));
    setNoteDrafts({
      1: "",
      2: "",
      3: "",
    });
  }, [guest]);

  const guestName = useMemo(() => {
    return guest?.name || guest?.fullName || "מוזמן";
  }, [guest]);

  const updateRound = (index, patch) => {
    setRounds((prev) =>
      prev.map((round, i) =>
        i === index
          ? {
              ...round,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : round
      )
    );
  };

  const handleAnswerChange = (index, value) => {
    const currentRound = rounds[index];

    updateRound(index, {
      answerStatus: value,
      resultStatus: value === "no_answer" ? null : currentRound.resultStatus,
      calledAt: new Date().toISOString(),
    });
  };

  const handleResultChange = (index, value) => {
    const currentRound = rounds[index];

    updateRound(index, {
      answerStatus: "answered",
      resultStatus: value,
      amount:
        value === "yes"
          ? Math.max(1, Number(currentRound.amount || getGuestAmount(guest)))
          : value === "no"
            ? 0
            : getGuestAmount(guest),
      calledAt: new Date().toISOString(),
    });
  };

  const handleAmountChange = (index, value) => {
    const amount = Math.max(1, Number(value || 1));

    updateRound(index, {
      answerStatus: "answered",
      resultStatus: "yes",
      amount,
      calledAt: new Date().toISOString(),
    });
  };

  const addNote = (index) => {
    const roundNumber = rounds[index].roundNumber;
    const text = String(noteDrafts[roundNumber] || "").trim();

    if (!text) return;

    const currentNotes = Array.isArray(rounds[index].notes)
      ? rounds[index].notes
      : [];

    const newNote = {
      text,
      createdAt: new Date().toISOString(),
      createdBy: "מערכת",
    };

    updateRound(index, {
      notes: [...currentNotes, newNote],
    });

    setNoteDrafts((prev) => ({
      ...prev,
      [roundNumber]: "",
    }));
  };

  const save = async () => {
    try {
      setSaving(true);

      const rsvpUpdate = getLatestRsvpFromRounds(rounds, guest);

      const cleanRounds = rounds.map((round) => ({
        roundNumber: round.roundNumber,
        answerStatus: round.answerStatus,
        resultStatus: round.answerStatus === "answered" ? round.resultStatus : null,
        amount:
          round.answerStatus === "answered" && round.resultStatus === "yes"
            ? Math.max(1, Number(round.amount || 1))
            : round.resultStatus === "no"
              ? 0
              : round.amount || getGuestAmount(guest),
        notes: Array.isArray(round.notes) ? round.notes : [],
        calledAt: round.answerStatus ? round.calledAt || new Date().toISOString() : null,
        updatedAt: round.updatedAt || new Date().toISOString(),
      }));

      const res = await fetch(`/api/guests/${guest._id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callRounds: cleanRounds,

          // עדכון אוטומטי ל-RSVP של האורח
          rsvpStatus: rsvpUpdate.rsvpStatus,
          status: rsvpUpdate.rsvpStatus,
          amount: rsvpUpdate.amount,
          guestsCount: rsvpUpdate.amount,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onUpdated?.(data.guest);
        onClose();
        return;
      }

      alert(data.message || "❌ שגיאה בשמירת סבבי השיחה");
    } catch (error) {
      console.error("Call rounds save error:", error);
      alert("❌ שגיאה בשמירת סבבי השיחה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-[32px] border border-[#E4D3B8] bg-[#FFFDF8] shadow-[0_30px_90px_rgba(36,26,20,0.28)]">
        <div className="border-b border-[#E9DDC8] bg-gradient-to-l from-[#FFF8EA] via-[#FFFDF8] to-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5D8C7] bg-white text-2xl text-[#5A4635] transition hover:bg-[#FFF4E3]"
            >
              ×
            </button>

            <div className="text-right">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#E3C78D] bg-[#FFF7E8] px-4 py-1.5 text-xs font-black text-[#9A6A25]">
                <span>📞</span>
                <span>מעקב שיחות</span>
              </div>

              <h2 className="text-2xl font-black text-[#2B2118]">
                {guestName}
              </h2>

              <p className="mt-1 text-sm font-bold text-[#7D6B59]">
                {guest?.phone || "ללא טלפון"}
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            {rounds.map((round, index) => {
              const showResultOptions = round.answerStatus === "answered";
              const showAmount =
                round.answerStatus === "answered" && round.resultStatus === "yes";
              const notes = Array.isArray(round.notes) ? round.notes : [];

              return (
                <section
                  key={round.roundNumber}
                  className="overflow-hidden rounded-[28px] border border-[#E5D7C2] bg-white shadow-[0_14px_34px_rgba(91,63,31,0.08)]"
                >
                  <div className="flex items-center justify-between gap-4 border-b border-[#EFE5D6] bg-gradient-to-l from-[#FFF8EA] via-white to-[#FFFDF8] px-5 py-4">
                    <div>
                      <p className="text-xs font-black text-[#B8844F]">
                        סבב {round.roundNumber}
                      </p>

                      <h3 className="text-xl font-black text-[#2B2118]">
                        {ROUND_LABELS[round.roundNumber]}
                      </h3>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#B8844F] to-[#E3BD78] text-sm font-black text-white shadow-md">
                      {round.roundNumber}
                    </div>
                  </div>

                  <div className="space-y-5 p-5">
                    <div>
                      <p className="mb-2 text-sm font-black text-[#4F3E2F]">
                        סטטוס שיחה
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {ANSWER_OPTIONS.map((opt) => {
                          const active = round.answerStatus === opt.value;

                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleAnswerChange(index, opt.value)}
                              className={`
                                h-11 rounded-full border px-6 text-sm font-black transition
                                ${
                                  active
                                    ? "border-[#B8844F] bg-[#B8844F] text-white shadow-[0_10px_20px_rgba(184,132,79,0.24)]"
                                    : "border-[#E3D6C3] bg-[#FFFDF8] text-[#6B5B4A] hover:bg-[#FFF4E3]"
                                }
                              `}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {showResultOptions && (
                      <div>
                        <p className="mb-2 text-sm font-black text-[#4F3E2F]">
                          תוצאת השיחה
                        </p>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {RESULT_OPTIONS.map((opt) => {
                            const active = round.resultStatus === opt.value;

                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleResultChange(index, opt.value)}
                                className={`
                                  min-h-[48px] rounded-[18px] border px-3 text-sm font-black transition
                                  ${
                                    active
                                      ? "border-[#2B2118] bg-[#2B2118] text-white shadow-[0_12px_24px_rgba(36,26,20,0.2)]"
                                      : "border-[#E3D6C3] bg-[#FFFDF8] text-[#6B5B4A] hover:bg-[#FFF4E3]"
                                  }
                                `}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {showAmount && (
                      <div className="rounded-[22px] border border-[#EADBC4] bg-[#FFF9EE] p-4">
                        <label className="mb-2 block text-sm font-black text-[#4F3E2F]">
                          כמה מגיעים?
                        </label>

                        <input
                          type="number"
                          min="1"
                          value={round.amount || 1}
                          onChange={(e) => handleAmountChange(index, e.target.value)}
                          className="h-12 w-full rounded-[18px] border border-[#D8C4A5] bg-white px-4 text-lg font-black text-[#2B2118] outline-none transition focus:border-[#B8844F] focus:ring-4 focus:ring-[#B8844F]/15 sm:w-40"
                        />
                      </div>
                    )}

                    <div className="rounded-[24px] border border-[#EADBC4] bg-[#FFFDF8] p-4">
                      <p className="mb-3 text-sm font-black text-[#4F3E2F]">
                        הוספת הערה לסבב
                      </p>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <textarea
                          placeholder="כתבי הערה..."
                          rows={2}
                          value={noteDrafts[round.roundNumber] || ""}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({
                              ...prev,
                              [round.roundNumber]: e.target.value,
                            }))
                          }
                          className="min-h-[64px] flex-1 resize-none rounded-[18px] border border-[#D8C4A5] bg-white px-4 py-3 text-sm font-bold text-[#2B2118] outline-none transition placeholder:text-[#A89C8E] focus:border-[#B8844F] focus:ring-4 focus:ring-[#B8844F]/15"
                        />

                        <button
                          type="button"
                          onClick={() => addNote(index)}
                          disabled={!String(noteDrafts[round.roundNumber] || "").trim()}
                          className={`
                            h-[64px] rounded-[18px] px-6 text-sm font-black transition sm:w-36
                            ${
                              String(noteDrafts[round.roundNumber] || "").trim()
                                ? "bg-gradient-to-l from-[#B8844F] via-[#D4A762] to-[#E7C98D] text-white shadow-[0_12px_24px_rgba(184,132,79,0.24)] hover:-translate-y-0.5"
                                : "cursor-not-allowed bg-gray-200 text-gray-400"
                            }
                          `}
                        >
                          הוסף הערה
                        </button>
                      </div>

                      {notes.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-black text-[#8A7B69]">
                            יומן הערות — לא ניתן לעריכה או מחיקה
                          </p>

                          {[...notes].reverse().map((note, noteIndex) => (
                            <div
                              key={`${note.createdAt}-${noteIndex}`}
                              className="rounded-[18px] border border-[#EFE5D6] bg-white px-4 py-3"
                            >
                              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-black text-[#9A6A25]">
                                <span>{formatDateTime(note.createdAt)}</span>

                                {note.createdBy && (
                                  <>
                                    <span>•</span>
                                    <span>{note.createdBy}</span>
                                  </>
                                )}
                              </div>

                              <p className="whitespace-pre-wrap text-sm font-bold leading-6 text-[#3F3025]">
                                {note.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[#E9DDC8] bg-[#FFFDF8]/95 px-6 py-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-start">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={`
                h-13 rounded-[18px] px-9 text-base font-black transition
                ${
                  saving
                    ? "cursor-wait bg-gray-300 text-gray-500"
                    : "bg-black text-white shadow-[0_14px_28px_rgba(0,0,0,0.22)] hover:-translate-y-0.5"
                }
              `}
            >
              {saving ? "שומר..." : "שמור"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-13 rounded-[18px] border border-[#D8C4A5] bg-white px-9 text-base font-black text-[#5A4635] transition hover:bg-[#FFF4E3]"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}