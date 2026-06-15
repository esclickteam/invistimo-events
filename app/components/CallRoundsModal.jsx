"use client";

import { useEffect, useMemo, useState } from "react";

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
  confirmed: "מגיע",
  declined: "לא מגיע",
  will_reply_message: "ישיב בהודעה",
  will_reply: "ישיב בהודעה",
  self_reply: "ישיב בהודעה",
  callback: "חזרה בסבב הבא",
  callback_next_round: "חזרה בסבב הבא",
  move_to_next_round: "חזרה בסבב הבא",
  no_answer: "לא ענה",
  needs_fix: "דורש תיקון",
  wrong_number: "דורש תיקון",
  needs_correction: "דורש תיקון",
};

const STATUS_STYLE = {
  yes: "border-emerald-200 bg-emerald-50 text-emerald-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",

  no: "border-rose-200 bg-rose-50 text-rose-700",
  declined: "border-rose-200 bg-rose-50 text-rose-700",

  will_reply_message: "border-cyan-200 bg-cyan-50 text-cyan-700",
  will_reply: "border-cyan-200 bg-cyan-50 text-cyan-700",
  self_reply: "border-cyan-200 bg-cyan-50 text-cyan-700",

  callback: "border-blue-200 bg-blue-50 text-blue-700",
  callback_next_round: "border-blue-200 bg-blue-50 text-blue-700",
  move_to_next_round: "border-blue-200 bg-blue-50 text-blue-700",

  no_answer: "border-amber-200 bg-amber-50 text-amber-700",

  needs_fix: "border-orange-200 bg-orange-50 text-orange-700",
  wrong_number: "border-orange-200 bg-orange-50 text-orange-700",
  needs_correction: "border-orange-200 bg-orange-50 text-orange-700",
};

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

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
      employeeEmail: "",
    };
  }

  const text =
    cleanText(note?.text) ||
    cleanText(note?.note) ||
    cleanText(note?.callDocumentation) ||
    "";

  if (!text) return null;

  return {
    text,
    createdAt: note?.createdAt || note?.at || new Date().toISOString(),
    createdBy:
      note?.createdBy ||
      note?.by ||
      note?.employeeName ||
      note?.employeeEmail ||
      "מערכת",
    employeeEmail: cleanText(note?.employeeEmail),
  };
}

function createSystemLog(text, createdAt = new Date().toISOString()) {
  return {
    text,
    createdAt,
    createdBy: "מערכת",
    employeeEmail: "",
  };
}

function getResultLabel(value) {
  const key = cleanText(value).toLowerCase();
  return RESULT_LABELS[key] || key || "—";
}

function getAnswerLabel(value) {
  const key = cleanText(value).toLowerCase();
  return ANSWER_LABELS[key] || key || "—";
}

function getResultStyle(value) {
  const key = cleanText(value).toLowerCase();
  return STATUS_STYLE[key] || "border-[#E3D6C3] bg-[#FFFDF8] text-[#6B5B4A]";
}

function mapEmployeeStatusToRound(status, rsvpStatus, row = {}) {
  const s = cleanText(status).toLowerCase();
  const rsvp = cleanText(rsvpStatus).toLowerCase();
  const callAnswered = cleanText(row?.callAnswered).toLowerCase();
  const answeredResult = cleanText(row?.answeredResult).toLowerCase();
  const messageFollowUpAction = cleanText(row?.messageFollowUpAction).toLowerCase();
  const noAnswerResult = cleanText(row?.noAnswerResult).toLowerCase();

  if (
    s === "confirmed" ||
    s === "yes" ||
    rsvp === "yes" ||
    answeredResult === "confirmed"
  ) {
    return {
      answerStatus: "answered",
      resultStatus: "yes",
    };
  }

  if (
    s === "declined" ||
    s === "no" ||
    rsvp === "no" ||
    answeredResult === "declined"
  ) {
    return {
      answerStatus: "answered",
      resultStatus: "no",
    };
  }

  if (
    s === "callback" ||
    messageFollowUpAction === "move_to_next_round" ||
    messageFollowUpAction === "callback_next_round"
  ) {
    return {
      answerStatus: "answered",
      resultStatus: "callback",
    };
  }

  if (
    s === "will_reply_message" ||
    s === "will_reply" ||
    answeredResult === "will_reply_message" ||
    messageFollowUpAction === "self_reply"
  ) {
    return {
      answerStatus: "answered",
      resultStatus: "will_reply_message",
    };
  }

  if (
    s === "needs_fix" ||
    s === "wrong_number" ||
    s === "needs_correction" ||
    noAnswerResult === "needs_fix"
  ) {
    return {
      answerStatus: callAnswered === "answered" ? "answered" : "no_answer",
      resultStatus: "needs_fix",
    };
  }

  if (s === "no_answer" || callAnswered === "no_answer" || noAnswerResult === "no_answer") {
    return {
      answerStatus: "no_answer",
      resultStatus: "no_answer",
    };
  }

  return {
    answerStatus: null,
    resultStatus: null,
  };
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
            employeeEmail: "",
          },
        ]
      : [];

  const mapped = mapEmployeeStatusToRound(
    existing?.status || existing?.callStatus || existing?.resultStatus,
    existing?.rsvpStatus,
    existing
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
    calledAt: existing?.calledAt || existing?.completedAt || existing?.at || null,
    updatedAt: existing?.updatedAt || existing?.at || null,
    source: existing?.source || "manual",
    employeeName: cleanText(existing?.employeeName || existing?.createdBy),
    employeeEmail: cleanText(existing?.employeeEmail),
    movedToNextRound: Boolean(existing?.movedToNextRound),
    nextRound: existing?.nextRound || null,
    nextRoundReason: cleanText(existing?.nextRoundReason),
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
      const status = cleanText(row?.status || row?.result);
      const label = getResultLabel(status);
      const rowNote =
        cleanText(row?.callDocumentation) ||
        cleanText(row?.note) ||
        cleanText(row?.documentationNote);
      const guestNote = cleanText(row?.guestNote);
      const employeeName = cleanText(row?.employeeName);
      const employeeEmail = cleanText(row?.employeeEmail);
      const moved = Boolean(row?.movedToNextRound);
      const nextRound = row?.nextRound ? Number(row.nextRound) : null;

      const parts = [];

      if (label && label !== "—") {
        parts.push(`תוצאה: ${label}`);
      }

      if (rowNote) {
        parts.push(`תיעוד: ${rowNote}`);
      }

      if (guestNote) {
        parts.push(`הערת אורח: ${guestNote}`);
      }

      if (moved && nextRound) {
        parts.push(`הועבר לסבב ${nextRound}`);
      }

      const text = parts.join("\n");

      if (!text) return null;

      return {
        text,
        createdAt: row?.at || row?.createdAt || new Date().toISOString(),
        createdBy: employeeName || employeeEmail || "עובד",
        employeeEmail,
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

  const callAnswered = guest?.[`${roundKey}CallAnswered`] || "";
  const answeredResult = guest?.[`${roundKey}AnsweredResult`] || "";
  const messageFollowUpAction =
    guest?.[`${roundKey}MessageFollowUpAction`] || "";
  const noAnswerResult = guest?.[`${roundKey}NoAnswerResult`] || "";

  const note = cleanText(guest?.[`${roundKey}CallNote`] || "");
  const employeeName = cleanText(guest?.[`${roundKey}CallEmployeeName`] || "");
  const employeeEmail = cleanText(guest?.[`${roundKey}CallEmployeeEmail`] || "");

  const completedAt =
    guest?.[`${roundKey}CallCompletedAt`] ||
    guest?.[`${roundKey}CallAt`] ||
    null;

  if (!status && !note && !completedAt) return null;

  const mapped = mapEmployeeStatusToRound(status, guest?.rsvpStatus, {
    callAnswered,
    answeredResult,
    messageFollowUpAction,
    noAnswerResult,
  });

  const notes = [];

  if (status) {
    const label = getResultLabel(status);
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
      createdBy: employeeName || employeeEmail || "עובד",
      employeeEmail,
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
    employeeName,
    employeeEmail,
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
          rsvpStatus: historyRound.rsvpStatus,
          callAnswered: historyRound.callAnswered,
          answeredResult: historyRound.answeredResult,
          messageFollowUpAction: historyRound.messageFollowUpAction,
          noAnswerResult: historyRound.noAnswerResult,
          amount:
            historyRound.arrivedCount ??
            historyRound.attendingCount ??
            getRoundAmountFromGuest(guest, roundNumber),
          notes: historyRound.note || historyRound.callDocumentation
            ? [
                {
                  text: historyRound.callDocumentation || historyRound.note,
                  createdAt: historyRound.at || new Date().toISOString(),
                  createdBy:
                    historyRound.employeeName ||
                    historyRound.employeeEmail ||
                    "עובד",
                  employeeEmail: historyRound.employeeEmail || "",
                },
              ]
            : [],
          calledAt: historyRound.at,
          updatedAt: historyRound.at,
          source: "employee_history",
          employeeName: historyRound.employeeName,
          employeeEmail: historyRound.employeeEmail,
          movedToNextRound: historyRound.movedToNextRound,
          nextRound: historyRound.nextRound,
          nextRoundReason: historyRound.nextRoundReason,
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

function getMaxRoundFromGuest(guest) {
  const numbers = [1, 2, 3];

  if (Array.isArray(guest?.callRounds)) {
    for (const round of guest.callRounds) {
      const n = Number(round?.roundNumber || round?.round || 0);
      if (Number.isFinite(n) && n > 0) numbers.push(n);
    }
  }

  if (Array.isArray(guest?.callHistory)) {
    for (const row of guest.callHistory) {
      const n = Number(row?.round || row?.roundNumber || 0);
      const next = Number(row?.nextRound || 0);

      if (Number.isFinite(n) && n > 0) numbers.push(n);
      if (Number.isFinite(next) && next > 0) numbers.push(next);
    }
  }

  const flatKeys = Object.keys(guest || {});
  for (const key of flatKeys) {
    const match = key.match(/^round(\d+)Call/i);
    if (match?.[1]) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > 0) numbers.push(n);
    }
  }

  return Math.max(...numbers, 3);
}

function buildInitialRounds(guest) {
  const maxRound = getMaxRoundFromGuest(guest);

  return Array.from({ length: maxRound }, (_, index) =>
    buildRoundFromSources(guest, index + 1)
  );
}

function getAllHistory(guest) {
  if (!Array.isArray(guest?.callHistory)) return [];

  return [...guest.callHistory].sort((a, b) => {
    const aTime = new Date(a?.at || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.at || b?.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export default function CallRoundsModal({ guest, onClose, onUpdated }) {
  const [rounds, setRounds] = useState(() => buildInitialRounds(guest));
  const [expandedLogs, setExpandedLogs] = useState({});
  const [showFullHistory, setShowFullHistory] = useState(false);

  useEffect(() => {
    setRounds(buildInitialRounds(guest));
    setExpandedLogs({});
    setShowFullHistory(false);
  }, [guest]);

  const guestName = useMemo(() => {
    return guest?.name || guest?.fullName || "מוזמן";
  }, [guest]);

  const fullHistory = useMemo(() => getAllHistory(guest), [guest]);

  const toggleLogs = (roundNumber) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [roundNumber]: !prev[roundNumber],
    }));
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

          <div className="mt-3 rounded-[16px] border border-[#EFE5D6] bg-white/70 px-3 py-2 text-xs font-black leading-5 text-[#7D6B59]">
            צפייה בלבד — הנתונים מסתנכרנים מתיעוד העובדים. אין אפשרות לערוך או
            למחוק מהחלון הזה.
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            {rounds.map((round) => {
              const notes = Array.isArray(round.notes) ? round.notes : [];
              const sortedNotes = [...notes].reverse();
              const showAllLogs = !!expandedLogs[round.roundNumber];
              const visibleNotes = showAllLogs
                ? sortedNotes
                : sortedNotes.slice(0, 3);

              const hasResult = Boolean(round.answerStatus || round.resultStatus);
              const resultForStyle = round.resultStatus || round.answerStatus;

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
                        {ROUND_LABELS[round.roundNumber] ||
                          `סבב ${round.roundNumber}`}
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
                        <div
                          className={`
                            min-h-9 rounded-full border px-5 py-2 text-xs font-black
                            ${
                              round.answerStatus
                                ? "border-[#B8844F] bg-[#B8844F] text-white"
                                : "border-[#E3D6C3] bg-[#FFFDF8] text-[#A89C8E]"
                            }
                          `}
                        >
                          {round.answerStatus
                            ? getAnswerLabel(round.answerStatus)
                            : "אין סטטוס"}
                        </div>

                        {round.calledAt && (
                          <div className="min-h-9 rounded-full border border-[#E3D6C3] bg-[#FFFDF8] px-5 py-2 text-xs font-black text-[#6B5B4A]">
                            {formatDateTime(round.calledAt)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-1.5 text-xs font-black text-[#4F3E2F]">
                        תוצאת השיחה
                      </p>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { value: "yes", label: "מגיע" },
                          { value: "no", label: "לא מגיע" },
                          { value: "will_reply_message", label: "ישיב בהודעה" },
                          { value: "callback", label: "חזרה בסבב הבא" },
                          { value: "no_answer", label: "לא ענה" },
                          { value: "needs_fix", label: "דורש תיקון" },
                        ].map((opt) => {
                          const active =
                            round.resultStatus === opt.value ||
                            (opt.value === "yes" &&
                              round.resultStatus === "confirmed") ||
                            (opt.value === "no" &&
                              round.resultStatus === "declined") ||
                            (opt.value === "callback" &&
                              [
                                "callback_next_round",
                                "move_to_next_round",
                              ].includes(round.resultStatus)) ||
                            (opt.value === "needs_fix" &&
                              ["wrong_number", "needs_correction"].includes(
                                round.resultStatus
                              ));

                          return (
                            <div
                              key={opt.value}
                              className={`
                                flex min-h-[40px] items-center justify-center rounded-[14px] border px-2 text-center text-xs font-black
                                ${
                                  active
                                    ? getResultStyle(opt.value)
                                    : "border-[#EFE5D6] bg-[#FFFDF8] text-[#B9AA98]"
                                }
                              `}
                            >
                              {opt.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {hasResult && (
                      <div className="rounded-[16px] border border-[#EADBC4] bg-[#FFF9EE] p-3">
                        <div className="grid gap-2 text-xs font-black text-[#4F3E2F] sm:grid-cols-2">
                          <div>
                            <span className="text-[#8A7B69]">סיכום תוצאה: </span>
                            <span>{getResultLabel(resultForStyle)}</span>
                          </div>

                          {round.resultStatus === "yes" ||
                          round.resultStatus === "confirmed" ? (
                            <div>
                              <span className="text-[#8A7B69]">
                                כמה מגיעים:{" "}
                              </span>
                              <span>{safeNumber(round.amount, 1)}</span>
                            </div>
                          ) : null}

                          {round.employeeName || round.employeeEmail ? (
                            <div>
                              <span className="text-[#8A7B69]">נציג: </span>
                              <span>
                                {round.employeeName ||
                                  round.employeeEmail ||
                                  "—"}
                              </span>
                            </div>
                          ) : null}

                          {round.movedToNextRound && round.nextRound ? (
                            <div>
                              <span className="text-[#8A7B69]">
                                המשך טיפול:{" "}
                              </span>
                              <span>הועבר לסבב {round.nextRound}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    <div className="rounded-[18px] border border-[#EADBC4] bg-[#FFFDF8] p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-[#4F3E2F]">
                          תיעוד שיחות ולוג שינויים
                        </p>

                        {notes.length > 3 && (
                          <button
                            type="button"
                            onClick={() => toggleLogs(round.roundNumber)}
                            className="text-[11px] font-black text-[#B8844F] transition hover:text-[#2B2118]"
                          >
                            {showAllLogs
                              ? "הצג רק 3 אחרונים"
                              : `צפייה בכל התיעודים (${notes.length})`}
                          </button>
                        )}
                      </div>

                      {notes.length === 0 ? (
                        <div className="rounded-[14px] border border-dashed border-[#E3D6C3] bg-white px-3 py-4 text-center text-xs font-black text-[#A89C8E]">
                          אין תיעוד שיחה לסבב הזה
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-black text-[#8A7B69]">
                            מוצגים {visibleNotes.length} מתוך {notes.length} —
                            צפייה בלבד
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

                                {note.employeeEmail && (
                                  <>
                                    <span>•</span>
                                    <span dir="ltr">{note.employeeEmail}</span>
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

            {fullHistory.length > 0 && (
              <section className="overflow-hidden rounded-[20px] border border-[#E5D7C2] bg-white shadow-[0_10px_24px_rgba(91,63,31,0.06)]">
                <div className="flex items-center justify-between gap-3 border-b border-[#EFE5D6] bg-[#FFF9EF] px-4 py-3">
                  <div>
                    <p className="text-[11px] font-black text-[#B8844F]">
                      כל התיעודים
                    </p>

                    <h3 className="text-base font-black text-[#2B2118]">
                      היסטוריית שיחות מלאה
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFullHistory((prev) => !prev)}
                    className="rounded-full border border-[#E3D6C3] bg-white px-4 py-2 text-xs font-black text-[#6B5B4A] transition hover:bg-[#FFF4E3]"
                  >
                    {showFullHistory ? "הסתר" : "הצג"}
                  </button>
                </div>

                {showFullHistory && (
                  <div className="space-y-2 p-4">
                    {fullHistory.map((row, index) => {
                      const status = cleanText(row?.status || row?.result);
                      const documentation =
                        cleanText(row?.callDocumentation) ||
                        cleanText(row?.note);
                      const guestNote = cleanText(row?.guestNote);
                      const employeeName = cleanText(row?.employeeName);
                      const employeeEmail = cleanText(row?.employeeEmail);

                      return (
                        <div
                          key={`${row?.at || row?.createdAt || index}-${index}`}
                          className="rounded-[16px] border border-[#EFE5D6] bg-[#FFFDF8] px-3 py-3"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-black text-[#9A6A25]">
                            <span>סבב {row?.round || "—"}</span>
                            <span>•</span>
                            <span>{formatDateTime(row?.at || row?.createdAt)}</span>

                            {(employeeName || employeeEmail) && (
                              <>
                                <span>•</span>
                                <span>{employeeName || employeeEmail}</span>
                              </>
                            )}
                          </div>

                          <div className="mb-2 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-black ${getResultStyle(
                                status
                              )}`}
                            >
                              {getResultLabel(status)}
                            </span>

                            {row?.movedToNextRound && row?.nextRound && (
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                                הועבר לסבב {row.nextRound}
                              </span>
                            )}
                          </div>

                          {documentation && (
                            <p className="whitespace-pre-wrap text-xs font-bold leading-5 text-[#3F3025]">
                              {documentation}
                            </p>
                          )}

                          {guestNote && (
                            <p className="mt-2 whitespace-pre-wrap rounded-[12px] border border-[#EADBC4] bg-white px-3 py-2 text-xs font-bold leading-5 text-[#3F3025]">
                              הערת אורח: {guestNote}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-[#E9DDC8] bg-[#FFFDF8]/95 px-5 py-3">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-start">
            <button
              type="button"
              onClick={onClose}
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