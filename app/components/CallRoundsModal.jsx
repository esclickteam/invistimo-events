"use client";

import { useEffect, useMemo, useState } from "react";

const ANSWER_OPTIONS = [
  { value: "answered", label: "ענה" },
  { value: "no_answer", label: "לא ענה" },
];

const RESULT_OPTIONS = [
  { value: "yes", label: "מגיע" },
  { value: "no", label: "לא מגיע" },
  { value: "undecided", label: "מתלבט" },
  { value: "callback", label: "לחזור אליו" },
  { value: "will_reply", label: "ישיב בהודעה" },
  { value: "wrong_number", label: "מספר שגוי" },
  { value: "needs_correction", label: "ממתין לתיקון" },
];

const ROUND_LABELS = {
  1: "סבב ראשון",
  2: "סבב שני",
  3: "סבב שלישי",
};

const ANSWER_LABELS = {
  answered: "ענה",
  no_answer: "לא ענה",
};

const RESULT_LABELS = {
  yes: "מגיע",
  no: "לא מגיע",
  undecided: "מתלבט",
  callback: "לחזור אליו",
  will_reply: "ישיב בהודעה",
  wrong_number: "מספר שגוי",
  needs_correction: "ממתין לתיקון",
};

const EMPLOYEE_STATUS_LABELS = {
  confirmed: "מגיע",
  declined: "לא מגיע",
  no_answer: "לא ענה",
  callback: "לחזור אליו",
  undecided: "מתלבט",
  will_reply_message: "ישיב בהודעה",
  wrong_number: "מספר שגוי",
};

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getGuestAmount(guest) {
  const amount = Number(
    guest?.arrivedCount ??
      guest?.actualArrivedCount ??
      guest?.amount ??
      guest?.attendingCount ??
      guest?.confirmedCount ??
      0
  );

  return Number.isFinite(amount) && amount > 0 ? amount : 1;
}

function getRoundAmountFromGuest(guest, roundNumber) {
  const roundKey = `round${roundNumber}`;

  const amount = Number(
    guest?.[`${roundKey}ArrivedCount`] ??
      guest?.[`${roundKey}ActualArrivedCount`] ??
      guest?.[`${roundKey}Amount`] ??
      guest?.[`${roundKey}AttendingCount`] ??
      guest?.arrivedCount ??
      guest?.actualArrivedCount ??
      guest?.amount ??
      guest?.attendingCount ??
      0
  );

  return Number.isFinite(amount) && amount > 0 ? amount : getGuestAmount(guest);
}

function normalizeNote(note) {
  if (typeof note === "string") {
    const text = note.trim();

    if (!text) return null;

    return {
      text,
      createdAt: new Date().toISOString(),
      createdBy: "מערכת",
    };
  }

  const text = typeof note?.text === "string" ? note.text.trim() : "";

  if (!text) return null;

  return {
    text,
    createdAt: note?.createdAt || note?.at || new Date().toISOString(),
    createdBy: note?.createdBy || note?.by || "מערכת",
  };
}

function createSystemLog(text, createdAt = new Date().toISOString()) {
  return {
    text,
    createdAt,
    createdBy: "מערכת",
  };
}

function mapEmployeeStatusToRound(status, rsvpStatus) {
  const s = cleanText(status).toLowerCase();
  const rsvp = cleanText(rsvpStatus).toLowerCase();

  if (s === "confirmed" || rsvp === "yes") {
    return {
      answerStatus: "answered",
      resultStatus: "yes",
    };
  }

  if (s === "declined" || rsvp === "no") {
    return {
      answerStatus: "answered",
      resultStatus: "no",
    };
  }

  if (s === "no_answer") {
    return {
      answerStatus: "no_answer",
      resultStatus: null,
    };
  }

  if (s === "callback") {
    return {
      answerStatus: "answered",
      resultStatus: "callback",
    };
  }

  if (s === "undecided") {
    return {
      answerStatus: "answered",
      resultStatus: "undecided",
    };
  }

  if (s === "will_reply_message" || s === "will_reply") {
    return {
      answerStatus: "answered",
      resultStatus: "will_reply",
    };
  }

  if (s === "wrong_number") {
    return {
      answerStatus: "answered",
      resultStatus: "wrong_number",
    };
  }

  if (s === "needs_correction") {
    return {
      answerStatus: "answered",
      resultStatus: "needs_correction",
    };
  }

  return {
    answerStatus: null,
    resultStatus: null,
  };
}

function getRsvpFromResult(resultStatus) {
  if (resultStatus === "yes") return "yes";
  if (resultStatus === "no") return "no";
  return "pending";
}

function normalizeRound(existing, roundNumber, guest) {
  const oldNotes = Array.isArray(existing?.notes)
    ? existing.notes.map(normalizeNote).filter(Boolean)
    : existing?.notes
      ? [
          {
            text: String(existing.notes),
            createdAt:
              existing.calledAt ||
              existing.updatedAt ||
              new Date().toISOString(),
            createdBy: "מערכת",
          },
        ]
      : [];

  const mapped = mapEmployeeStatusToRound(
    existing?.status || existing?.callStatus,
    existing?.rsvpStatus
  );

  return {
    roundNumber,
    answerStatus:
      existing?.answerStatus ||
      mapped.answerStatus ||
      existing?.status ||
      null,
    resultStatus:
      existing?.resultStatus ||
      mapped.resultStatus ||
      existing?.callResult ||
      null,
    amount: Number(existing?.amount || getRoundAmountFromGuest(guest, roundNumber)),
    notes: oldNotes,
    calledAt: existing?.calledAt || existing?.completedAt || null,
    updatedAt: existing?.updatedAt || null,
    source: existing?.source || "manual",
  };
}

function getExistingRoundFromArray(guest, roundNumber) {
  if (!Array.isArray(guest?.callRounds)) return null;

  return (
    guest.callRounds.find(
      (round) =>
        Number(round?.roundNumber || round?.round || 0) === Number(roundNumber)
    ) || null
  );
}

function getLatestHistoryForRound(guest, roundNumber) {
  if (!Array.isArray(guest?.callHistory)) return null;

  const rows = guest.callHistory
    .filter((row) => Number(row?.round || row?.roundNumber || 0) === roundNumber)
    .sort((a, b) => {
      const aTime = new Date(a?.at || a?.createdAt || 0).getTime();
      const bTime = new Date(b?.at || b?.createdAt || 0).getTime();
      return bTime - aTime;
    });

  return rows[0] || null;
}

function getHistoryNotesForRound(guest, roundNumber) {
  if (!Array.isArray(guest?.callHistory)) return [];

  return guest.callHistory
    .filter((row) => Number(row?.round || row?.roundNumber || 0) === roundNumber)
    .map((row) => {
      const status = cleanText(row?.status);
      const label = EMPLOYEE_STATUS_LABELS[status] || status;
      const rowNote = cleanText(row?.note);

      const text = rowNote
        ? `${label ? `${label}: ` : ""}${rowNote}`
        : label
          ? `עודכן סטטוס מהעובד: ${label}`
          : "";

      if (!text) return null;

      return {
        text,
        createdAt: row?.at || row?.createdAt || new Date().toISOString(),
        createdBy: "עובד",
      };
    })
    .filter(Boolean);
}

function getFlatRoundData(guest, roundNumber) {
  const roundKey = `round${roundNumber}`;

  const status =
    guest?.[`${roundKey}CallStatus`] ||
    guest?.[`${roundKey}CallResult`] ||
    null;

  const note = cleanText(guest?.[`${roundKey}CallNote`] || "");
  const completedAt =
    guest?.[`${roundKey}CallCompletedAt`] ||
    guest?.[`${roundKey}CallAt`] ||
    null;

  if (!status && !note && !completedAt) return null;

  const mapped = mapEmployeeStatusToRound(status, guest?.rsvpStatus);

  const notes = [];

  if (status) {
    const label = EMPLOYEE_STATUS_LABELS[status] || status;
    notes.push(
      createSystemLog(
        `עודכן מהעובד: ${label}`,
        completedAt || new Date().toISOString()
      )
    );
  }

  if (note) {
    notes.push({
      text: note,
      createdAt: completedAt || new Date().toISOString(),
      createdBy: "עובד",
    });
  }

  return {
    roundNumber,
    answerStatus: mapped.answerStatus,
    resultStatus: mapped.resultStatus,
    amount: getRoundAmountFromGuest(guest, roundNumber),
    notes,
    calledAt: completedAt,
    updatedAt: completedAt,
    source: "employee_flat",
  };
}

function mergeNotes(...noteGroups) {
  const map = new Map();

  for (const group of noteGroups) {
    for (const note of Array.isArray(group) ? group : []) {
      const normalized = normalizeNote(note);
      if (!normalized) continue;

      const key = `${normalized.createdAt}-${normalized.text}-${normalized.createdBy}`;
      map.set(key, normalized);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return aTime - bTime;
  });
}

function buildRoundFromSources(guest, roundNumber) {
  const arrayRound = getExistingRoundFromArray(guest, roundNumber);
  const flatRound = getFlatRoundData(guest, roundNumber);
  const historyRound = getLatestHistoryForRound(guest, roundNumber);

  const normalizedArrayRound = arrayRound
    ? normalizeRound(arrayRound, roundNumber, guest)
    : null;

  const normalizedHistoryRound = historyRound
    ? normalizeRound(
        {
          roundNumber,
          status: historyRound.status,
          resultStatus:
            mapEmployeeStatusToRound(historyRound.status, historyRound.rsvpStatus)
              .resultStatus,
          amount:
            historyRound.arrivedCount ??
            historyRound.attendingCount ??
            getRoundAmountFromGuest(guest, roundNumber),
          notes: historyRound.note
            ? [
                {
                  text: historyRound.note,
                  createdAt: historyRound.at || new Date().toISOString(),
                  createdBy: "עובד",
                },
              ]
            : [],
          calledAt: historyRound.at,
          updatedAt: historyRound.at,
          source: "employee_history",
        },
        roundNumber,
        guest
      )
    : null;

  const candidates = [
    normalizedArrayRound,
    flatRound,
    normalizedHistoryRound,
  ].filter(Boolean);

  const latest = candidates.sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.calledAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.calledAt || 0).getTime();
    return bTime - aTime;
  })[0];

  const base =
    latest ||
    normalizeRound(null, roundNumber, {
      ...guest,
      arrivedCount: 0,
      actualArrivedCount: 0,
    });

  const allNotes = mergeNotes(
    normalizedArrayRound?.notes,
    flatRound?.notes,
    normalizedHistoryRound?.notes,
    getHistoryNotesForRound(guest, roundNumber)
  );

  return {
    ...base,
    notes: allNotes,
  };
}

function buildInitialRounds(guest) {
  return [1, 2, 3].map((roundNumber) =>
    buildRoundFromSources(guest, roundNumber)
  );
}

function getLatestRsvpFromRounds(rounds) {
  const reversedRounds = [...rounds].reverse();

  for (const round of reversedRounds) {
    if (round.answerStatus === "no_answer") {
      return {
        rsvpStatus: "pending",
        amount: 0,
      };
    }

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
      round.resultStatus === "needs_correction" ||
      round.resultStatus === "callback" ||
      round.resultStatus === "undecided" ||
      round.resultStatus === "wrong_number"
    ) {
      return {
        rsvpStatus: "pending",
        amount: 0,
      };
    }
  }

  return {
    rsvpStatus: "pending",
    amount: 0,
  };
}

export default function CallRoundsModal({ guest, onClose, onUpdated }) {
  const [rounds, setRounds] = useState(() => buildInitialRounds(guest));
  const [noteDrafts, setNoteDrafts] = useState({
    1: "",
    2: "",
    3: "",
  });
  const [expandedLogs, setExpandedLogs] = useState({
    1: false,
    2: false,
    3: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRounds(buildInitialRounds(guest));
    setNoteDrafts({
      1: "",
      2: "",
      3: "",
    });
    setExpandedLogs({
      1: false,
      2: false,
      3: false,
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
    const currentNotes = Array.isArray(currentRound.notes)
      ? currentRound.notes
      : [];

    const previousAnswer = currentRound.answerStatus;
    let nextNotes = currentNotes;

    if (!previousAnswer) {
      nextNotes = [
        ...currentNotes,
        createSystemLog(`סומן סטטוס שיחה: ${ANSWER_LABELS[value] || value}`),
      ];
    } else if (previousAnswer !== value) {
      nextNotes = [
        ...currentNotes,
        createSystemLog(
          `שונה סטטוס שיחה: ${
            ANSWER_LABELS[previousAnswer] || previousAnswer
          } ← ${ANSWER_LABELS[value] || value}`
        ),
      ];
    }

    updateRound(index, {
      answerStatus: value,
      resultStatus: value === "no_answer" ? null : currentRound.resultStatus,
      amount:
        value === "no_answer"
          ? currentRound.amount || getGuestAmount(guest)
          : currentRound.amount || getGuestAmount(guest),
      notes: nextNotes,
      calledAt: new Date().toISOString(),
      source: "manual",
    });
  };

  const handleResultChange = (index, value) => {
    const currentRound = rounds[index];
    const currentNotes = Array.isArray(currentRound.notes)
      ? currentRound.notes
      : [];

    const previousResult = currentRound.resultStatus;
    let nextNotes = currentNotes;

    if (!previousResult) {
      nextNotes = [
        ...currentNotes,
        createSystemLog(`סומנה תוצאת שיחה: ${RESULT_LABELS[value] || value}`),
      ];
    } else if (previousResult !== value) {
      nextNotes = [
        ...currentNotes,
        createSystemLog(
          `שונתה תוצאת שיחה: ${
            RESULT_LABELS[previousResult] || previousResult
          } ← ${RESULT_LABELS[value] || value}`
        ),
      ];
    }

    updateRound(index, {
      answerStatus: value === "no_answer" ? "no_answer" : "answered",
      resultStatus: value === "no_answer" ? null : value,
      amount:
        value === "yes"
          ? Math.max(1, Number(currentRound.amount || getGuestAmount(guest)))
          : 0,
      notes: nextNotes,
      calledAt: new Date().toISOString(),
      source: "manual",
    });
  };

  const handleAmountChange = (index, value) => {
    const currentRound = rounds[index];
    const previousAmount = Number(currentRound.amount || 0);
    const nextAmount = Math.max(1, Number(value || 1));
    const currentNotes = Array.isArray(currentRound.notes)
      ? currentRound.notes
      : [];

    const nextNotes =
      previousAmount > 0 && previousAmount !== nextAmount
        ? [
            ...currentNotes,
            createSystemLog(`שונתה כמות מגיעים: ${previousAmount} ← ${nextAmount}`),
          ]
        : currentNotes;

    updateRound(index, {
      answerStatus: "answered",
      resultStatus: "yes",
      amount: nextAmount,
      notes: nextNotes,
      calledAt: new Date().toISOString(),
      source: "manual",
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
      source: "manual",
    });

    setNoteDrafts((prev) => ({
      ...prev,
      [roundNumber]: "",
    }));
  };

  const toggleLogs = (roundNumber) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [roundNumber]: !prev[roundNumber],
    }));
  };

  const save = async () => {
    try {
      setSaving(true);

      const rsvpUpdate = getLatestRsvpFromRounds(rounds);

      const cleanRounds = rounds.map((round) => ({
        roundNumber: round.roundNumber,
        answerStatus: round.answerStatus,
        resultStatus:
          round.answerStatus === "answered" ? round.resultStatus : null,
        amount:
          round.answerStatus === "answered" && round.resultStatus === "yes"
            ? Math.max(1, Number(round.amount || 1))
            : 0,
        notes: Array.isArray(round.notes)
          ? round.notes.map(normalizeNote).filter(Boolean)
          : [],
        calledAt: round.answerStatus
          ? round.calledAt || new Date().toISOString()
          : null,
        updatedAt: round.updatedAt || new Date().toISOString(),
        source: round.source || "manual",
      }));

      const latestTouchedRound = [...cleanRounds]
        .reverse()
        .find((round) => round.answerStatus || round.resultStatus);

      const res = await fetch(`/api/guests/${guest._id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callRounds: cleanRounds,

          // RSVP חוקי לפי enum: yes / no / pending
          rsvp: rsvpUpdate.rsvpStatus,
          rsvpStatus: rsvpUpdate.rsvpStatus,
          status: rsvpUpdate.rsvpStatus,

          // רק מגיעים, לא מוזמנים
          arrivedCount: rsvpUpdate.amount,
          actualArrivedCount: rsvpUpdate.amount,
          amount: rsvpUpdate.amount,

          // שדות תצוגה אחרונים ללקוח / טלפון
          lastCallStatus: latestTouchedRound?.resultStatus || null,
          lastCallResult: latestTouchedRound?.resultStatus || null,
          lastCallRound: latestTouchedRound?.roundNumber || null,
          lastCallNote:
            latestTouchedRound?.notes?.[latestTouchedRound.notes.length - 1]
              ?.text || "",
          lastCallAt: new Date().toISOString(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        onUpdated?.(data.guest);
        onClose();
        return;
      }

      alert(data.message || data.error || "❌ שגיאה בשמירת סבבי השיחה");
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
    >
      <div className="flex max-h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[26px] border border-[#E4D3B8] bg-[#FFFDF8] shadow-[0_24px_70px_rgba(36,26,20,0.24)]">
        <div className="shrink-0 border-b border-[#E9DDC8] bg-gradient-to-l from-[#FFF8EA] via-[#FFFDF8] to-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5D8C7] bg-white text-xl text-[#5A4635] transition hover:bg-[#FFF4E3]"
            >
              ×
            </button>

            <div className="text-right">
              <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#E3C78D] bg-[#FFF7E8] px-3 py-1 text-[11px] font-black text-[#9A6A25]">
                <span>📞</span>
                <span>מעקב שיחות</span>
              </div>

              <h2 className="text-xl font-black text-[#2B2118]">
                {guestName}
              </h2>

              <p className="mt-0.5 text-xs font-bold text-[#7D6B59]">
                {guest?.phone || "ללא טלפון"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            {rounds.map((round, index) => {
              const showResultOptions = round.answerStatus === "answered";
              const showAmount =
                round.answerStatus === "answered" &&
                round.resultStatus === "yes";
              const notes = Array.isArray(round.notes) ? round.notes : [];
              const sortedNotes = [...notes].reverse();
              const showAllLogs = !!expandedLogs[round.roundNumber];
              const visibleNotes = showAllLogs
                ? sortedNotes
                : sortedNotes.slice(0, 3);

              return (
                <section
                  key={round.roundNumber}
                  className="overflow-hidden rounded-[20px] border border-[#E5D7C2] bg-white shadow-[0_10px_24px_rgba(91,63,31,0.06)]"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-[#EFE5D6] bg-[#FFF9EF] px-4 py-3">
                    <div>
                      <p className="text-[11px] font-black text-[#B8844F]">
                        סבב {round.roundNumber}
                      </p>

                      <h3 className="text-base font-black text-[#2B2118]">
                        {ROUND_LABELS[round.roundNumber]}
                      </h3>
                    </div>

                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B8844F] text-xs font-black text-white shadow-sm">
                      {round.roundNumber}
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <p className="mb-1.5 text-xs font-black text-[#4F3E2F]">
                        סטטוס שיחה
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {ANSWER_OPTIONS.map((opt) => {
                          const active = round.answerStatus === opt.value;

                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                handleAnswerChange(index, opt.value)
                              }
                              className={`
                                h-9 rounded-full border px-5 text-xs font-black transition
                                ${
                                  active
                                    ? "border-[#B8844F] bg-[#B8844F] text-white shadow-[0_8px_16px_rgba(184,132,79,0.22)]"
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
                        <p className="mb-1.5 text-xs font-black text-[#4F3E2F]">
                          תוצאת השיחה
                        </p>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {RESULT_OPTIONS.map((opt) => {
                            const active = round.resultStatus === opt.value;

                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  handleResultChange(index, opt.value)
                                }
                                className={`
                                  min-h-[40px] rounded-[14px] border px-2 text-xs font-black transition
                                  ${
                                    active
                                      ? "border-[#2B2118] bg-[#2B2118] text-white shadow-[0_8px_16px_rgba(36,26,20,0.18)]"
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
                      <div className="flex flex-wrap items-center gap-3 rounded-[16px] border border-[#EADBC4] bg-[#FFF9EE] p-3">
                        <label className="text-xs font-black text-[#4F3E2F]">
                          כמה מגיעים?
                        </label>

                        <input
                          type="number"
                          min="1"
                          value={round.amount || 1}
                          onChange={(e) =>
                            handleAmountChange(index, e.target.value)
                          }
                          className="h-10 w-24 rounded-[14px] border border-[#D8C4A5] bg-white px-3 text-sm font-black text-[#2B2118] outline-none transition focus:border-[#B8844F] focus:ring-4 focus:ring-[#B8844F]/15"
                        />
                      </div>
                    )}

                    <div className="rounded-[18px] border border-[#EADBC4] bg-[#FFFDF8] p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-[#4F3E2F]">
                          הערות ולוג שינויים
                        </p>

                        {notes.length > 3 && (
                          <button
                            type="button"
                            onClick={() => toggleLogs(round.roundNumber)}
                            className="text-[11px] font-black text-[#B8844F] transition hover:text-[#2B2118]"
                          >
                            {showAllLogs
                              ? "הצג רק 3 אחרונים"
                              : `צפייה בכל הלוגים (${notes.length})`}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <textarea
                          placeholder="כתבי הערה..."
                          rows={1}
                          value={noteDrafts[round.roundNumber] || ""}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({
                              ...prev,
                              [round.roundNumber]: e.target.value,
                            }))
                          }
                          className="min-h-[42px] flex-1 resize-none rounded-[14px] border border-[#D8C4A5] bg-white px-3 py-2 text-xs font-bold text-[#2B2118] outline-none transition placeholder:text-[#A89C8E] focus:border-[#B8844F] focus:ring-4 focus:ring-[#B8844F]/15"
                        />

                        <button
                          type="button"
                          onClick={() => addNote(index)}
                          disabled={
                            !String(noteDrafts[round.roundNumber] || "").trim()
                          }
                          className={`
                            h-[42px] rounded-[14px] px-5 text-xs font-black transition sm:w-28
                            ${
                              String(noteDrafts[round.roundNumber] || "").trim()
                                ? "bg-gradient-to-l from-[#B8844F] via-[#D4A762] to-[#E7C98D] text-white shadow-[0_8px_16px_rgba(184,132,79,0.22)] hover:-translate-y-0.5"
                                : "cursor-not-allowed bg-gray-200 text-gray-400"
                            }
                          `}
                        >
                          הוסף
                        </button>
                      </div>

                      {notes.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-[11px] font-black text-[#8A7B69]">
                            מוצגים {visibleNotes.length} מתוך {notes.length} —
                            לא ניתן לעריכה או מחיקה
                          </p>

                          {visibleNotes.map((note, noteIndex) => (
                            <div
                              key={`${note.createdAt}-${noteIndex}`}
                              className="rounded-[14px] border border-[#EFE5D6] bg-white px-3 py-2"
                            >
                              <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-black text-[#9A6A25]">
                                <span>{formatDateTime(note.createdAt)}</span>

                                {note.createdBy && (
                                  <>
                                    <span>•</span>
                                    <span>{note.createdBy}</span>
                                  </>
                                )}
                              </div>

                              <p className="whitespace-pre-wrap text-xs font-bold leading-5 text-[#3F3025]">
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

        <div className="shrink-0 border-t border-[#E9DDC8] bg-[#FFFDF8]/95 px-5 py-3">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-start">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={`
                h-10 rounded-[14px] px-8 text-sm font-black transition
                ${
                  saving
                    ? "cursor-wait bg-gray-300 text-gray-500"
                    : "bg-black text-white shadow-[0_10px_20px_rgba(0,0,0,0.18)] hover:-translate-y-0.5"
                }
              `}
            >
              {saving ? "שומר..." : "שמור"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 rounded-[14px] border border-[#D8C4A5] bg-white px-8 text-sm font-black text-[#5A4635] transition hover:bg-[#FFF4E3]"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}