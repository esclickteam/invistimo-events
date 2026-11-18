import {
  formatDurationMs,
  hangupInitiatorLabel,
  telnyxResultLabel,
  type AttemptOutcome,
  type AttemptSnapshot,
} from "@/lib/calls/callAttemptPolicy";
import {
  getGuestRsvpValue,
  hasGuestPhone,
  isRsvpEligibleForCallRound,
  type CallRoundNumber,
} from "@/lib/calls/callRoundEligibility";

export type ReportAttempt = AttemptSnapshot & {
  guestName: string;
  guestPhone: string;
  round: number;
  employeeName: string;
  agentResult: string;
  note: string;
  closedTask: boolean;
  mismatch: string;
};

export type ReportGuest = {
  id: string;
  name: string;
  phone: string;
  rsvp: string;
  round: number;
  taskStatus: string;
  employeeName: string;
  attemptCount: number;
  lastAttemptAt: string;
  lastTelnyxResult: string;
  finalResult: string;
  enforced: string;
  exception: string;
  notDialedReason: string;
  noTask: boolean;
  noVerifiedCall: boolean;
  mismatch: string;
  addedAt: string;
  roundOpenedAt: string;
  eligible: string;
  whyNoTask: string;
  late: string;
  savedAt: string;
  rsvpChanged: string;
  attempts: ReportAttempt[];
};

const RESULT_LABELS: Record<string, string> = {
  confirmed: "אישר הגעה",
  declined: "לא מגיע",
  no_answer: "לא ענה",
  callback: "ביקש חזרה",
  undecided: "מתלבט",
  will_reply_message: "מתלבט",
  needs_fix: "דורש תיקון",
  wrong_number: "מספר שגוי",
  pending: "פתוחה",
  in_progress: "בטיפול",
  cancelled: "הוסרה מהתור",
};

export function resultLabel(value: string) {
  return RESULT_LABELS[value] || value || "—";
}

function snapshotFromStored(raw: any): AttemptSnapshot {
  const outcome = (raw.outcome || "awaiting_provider") as AttemptOutcome;
  return {
    id: String(raw.callControlId || raw.id || ""),
    taskId: String(raw.taskId || ""),
    startedAt: raw.startedAt ? new Date(raw.startedAt).toISOString() : null,
    answeredAt: raw.answeredAt ? new Date(raw.answeredAt).toISOString() : null,
    endedAt: raw.endedAt ? new Date(raw.endedAt).toISOString() : null,
    durationMs: typeof raw.durationMs === "number" ? raw.durationMs : null,
    preciseDuration: Boolean(raw.preciseDuration),
    telnyxAnswered: Boolean(raw.telnyxAnswered),
    answerType: raw.answerType || "",
    telnyxResult: raw.telnyxResult || telnyxResultLabel(outcome),
    sipCode: raw.sipCode || "",
    hangupCause: raw.hangupCause || "",
    hangupSource: raw.hangupSource || "",
    agentHangupRequestedAt: raw.agentHangupRequestedAt
      ? new Date(raw.agentHangupRequestedAt).toISOString()
      : null,
    outcome,
  };
}

export function recordingToAttempt(raw: any): AttemptSnapshot | null {
  const taskId = String(raw?.clientState?.taskId || raw?.taskId || "");
  const id = String(raw?.callControlId || "");
  if (!taskId || !id) return null;
  const startedAt = raw.startedAt ? new Date(raw.startedAt).toISOString() : null;
  const answeredAt = raw.answeredAt ? new Date(raw.answeredAt).toISOString() : null;
  const endedAt = raw.endedAt ? new Date(raw.endedAt).toISOString() : null;
  const seconds = Number(raw.durationSeconds || 0);
  const durationMs =
    startedAt && endedAt
      ? Date.parse(endedAt) - Date.parse(startedAt)
      : seconds > 0
        ? seconds * 1000
        : null;
  const preciseDuration = Boolean(startedAt && endedAt);
  const answered = Boolean(answeredAt);
  const outcome: AttemptOutcome = !endedAt
    ? "awaiting_provider"
    : answered
      ? "answered"
      : String(raw.hangupCause || "").toLowerCase().includes("busy")
        ? "busy"
        : durationMs !== null && durationMs >= 20_000
          ? "valid_no_answer"
          : durationMs !== null && durationMs < 20_000
            ? "early_hangup"
            : "technical_failure";
  return {
    id,
    taskId,
    startedAt,
    answeredAt,
    endedAt,
    durationMs,
    preciseDuration,
    telnyxAnswered: answered,
    answerType: answered ? "unknown" : "",
    telnyxResult: telnyxResultLabel(outcome),
    sipCode: String(raw.sipCode || ""),
    hangupCause: String(raw.hangupCause || ""),
    hangupSource: String(raw.hangupSource || ""),
    agentHangupRequestedAt: null,
    outcome,
  };
}

function mismatchText(attempt: AttemptSnapshot, agentResult: string) {
  if (!attempt.telnyxAnswered || agentResult !== "no_answer") return "";
  const talk = formatDurationMs(
    attempt.answeredAt && attempt.endedAt
      ? Date.parse(attempt.endedAt) - Date.parse(attempt.answeredAt)
      : attempt.durationMs,
    attempt.preciseDuration
  );
  return `Telnyx רשם מענה במשך ${talk}, אך הנציגה סימנה לא ענה. אין כאן מסקנה שהמענה היה אנושי.`;
}

export function buildCallRoundReport(input: {
  round: number;
  guests: any[];
  tasks: any[];
  attempts: any[];
  recordings?: any[];
  workOrders?: any[];
}) {
  const round = input.round;
  const attemptsByTask = new Map<string, ReportAttempt[]>();
  const seenControl = new Set<string>();

  const stored = [
    ...input.attempts.map(snapshotFromStored),
    ...(input.recordings || []).map(recordingToAttempt).filter(Boolean),
  ] as AttemptSnapshot[];

  for (const attempt of stored) {
    if (!attempt.id || seenControl.has(attempt.id)) continue;
    seenControl.add(attempt.id);
    const task = input.tasks.find((row) => String(row._id || row.id) === attempt.taskId);
    const agentResult = String(task?.result || task?.status || "");
    const view: ReportAttempt = {
      ...attempt,
      guestName: String(task?.guestName || ""),
      guestPhone: String(task?.guestPhone || ""),
      round: Number(task?.round || round || 0),
      employeeName: String(task?.employeeName || ""),
      agentResult: resultLabel(agentResult),
      note: String(task?.note || ""),
      closedTask: Boolean(task?.completedAt) && !task?.managerException,
      mismatch: mismatchText(attempt, agentResult),
    };
    const list = attemptsByTask.get(attempt.taskId) || [];
    list.push(view);
    attemptsByTask.set(attempt.taskId, list);
  }

  const tasksForRound = input.tasks.filter(
    (task) => round === 0 || Number(task.round) === round
  );
  const taskByGuest = new Map<string, any>();
  for (const task of tasksForRound) {
    taskByGuest.set(String(task.guestId), task);
  }

  const rows: ReportGuest[] = [];
  for (const guest of input.guests) {
    const guestId = String(guest._id || guest.id || "");
    const task = taskByGuest.get(guestId);
    const taskRound = Number(task?.round || round || 1) as CallRoundNumber;
    const reportRound = (round === 0 ? taskRound : round) as CallRoundNumber;
    if (![1, 2, 3].includes(reportRound)) continue;
    const rsvpEligible = isRsvpEligibleForCallRound(guest, reportRound);
    const phoneOk = hasGuestPhone(guest);
    if (!task && !rsvpEligible && phoneOk) continue;
    const order = (input.workOrders || []).find(
      (item) => Number(item.round) === reportRound
    );
    const attempts = (task ? attemptsByTask.get(String(task._id || task.id)) : []) || [];
    attempts.sort((a, b) => Date.parse(a.startedAt || "") - Date.parse(b.startedAt || ""));
    const finalStatus = String(task?.result || task?.status || "");
    const savedWithoutCall =
      Boolean(task) &&
      ["confirmed", "declined", "no_answer", "callback", "undecided", "needs_fix", "wrong_number"].includes(
        finalStatus
      ) &&
      attempts.length === 0;
    const noTask = !task;
    const whyNoTask = noTask
      ? !phoneOk
        ? "מספר לא תקין"
        : guest.createdAt && order?.createdAt && new Date(guest.createdAt) > new Date(order.createdAt)
          ? "נוסף לאחר פתיחת הסבב"
          : "לא ניתן לאימות"
      : "";
    const last = attempts[attempts.length - 1];
    const enforced =
      Boolean(task?.completedAt) &&
      !savedWithoutCall &&
      !task?.managerException &&
      attempts.some((attempt) => attempt.startedAt);
    rows.push({
      id: guestId || String(task?._id || ""),
      name: String(guest.name || task?.guestName || ""),
      phone: String(guest.phone || task?.guestPhone || ""),
      rsvp: getGuestRsvpValue(guest),
      round: reportRound,
      taskStatus: task ? resultLabel(String(task.status || "")) : "לא נוצרה",
      employeeName: String(task?.employeeName || "—"),
      attemptCount: attempts.length,
      lastAttemptAt: last?.startedAt || "",
      lastTelnyxResult: last?.telnyxResult || "—",
      finalResult: task ? resultLabel(finalStatus) : "—",
      enforced: enforced ? "כן" : "לא",
      exception: savedWithoutCall || noTask || task?.managerException || attempts.some((a) => a.mismatch) ? "כן" : "לא",
      notDialedReason: savedWithoutCall
        ? "נשמרה תוצאה בלי שיחת Telnyx"
        : noTask
          ? whyNoTask
          : "—",
      noTask,
      noVerifiedCall: savedWithoutCall,
      mismatch: attempts.map((attempt) => attempt.mismatch).filter(Boolean).join(" "),
      addedAt: guest.createdAt ? new Date(guest.createdAt).toISOString() : "",
      roundOpenedAt: order?.createdAt ? new Date(order.createdAt).toISOString() : "",
      eligible: noTask ? (rsvpEligible && phoneOk ? "כן" : phoneOk ? "לא" : "לא לחיוג. כן לדוח החריגים") : "כן",
      whyNoTask,
      late: whyNoTask === "נוסף לאחר פתיחת הסבב" ? "כן" : "לא",
      savedAt: task?.completedAt ? new Date(task.completedAt).toISOString() : "",
      rsvpChanged: savedWithoutCall ? "כן" : "לא",
      attempts: attempts.map((attempt) => ({
        ...attempt,
        guestName: String(guest.name || attempt.guestName),
        guestPhone: String(guest.phone || attempt.guestPhone),
      })),
    });
  }

  return { rows, metrics: summarizeCallRoundRows(rows), attempts: rows.flatMap((row) => row.attempts) };
}

export function filterCallRoundRows(
  rows: ReportGuest[],
  input: { q?: string; agent?: string; view?: string }
) {
  const q = String(input.q || "").trim();
  const digits = q.replace(/\D/g, "");
  return rows.filter((row) => {
    const phoneDigits = row.phone.replace(/\D/g, "");
    if (q && !`${row.name} ${row.phone}`.includes(q) && !(digits && phoneDigits.includes(digits))) {
      return false;
    }
    if (input.agent && row.employeeName !== input.agent) return false;
    if (input.view === "exception" && row.exception !== "כן") return false;
    if (input.view === "nocall" && !row.noVerifiedCall) return false;
    if (input.view === "notask" && !row.noTask) return false;
    if (input.view === "mismatch" && !row.mismatch) return false;
    return true;
  });
}

export function summarizeCallRoundRows(rows: ReportGuest[]) {
  const scopedAttempts = rows.flatMap((row) => row.attempts);
  return {
    eligibleGuests: rows.filter((row) => row.eligible !== "לא").length,
    tasksCreated: rows.filter((row) => !row.noTask).length,
    dialedGuests: rows.filter((row) => row.attemptCount > 0).length,
    neverDialed: rows.filter((row) => row.attemptCount === 0).length,
    attempts: scopedAttempts.length,
    providerAnswered: scopedAttempts.filter((row) => row.telnyxAnswered).length,
    providerUnanswered: scopedAttempts.filter((row) => row.outcome === "valid_no_answer" || row.outcome === "early_hangup").length,
    busy: scopedAttempts.filter((row) => row.outcome === "busy").length,
    under20: scopedAttempts.filter((row) => row.outcome === "early_hangup").length,
    atLeast20: scopedAttempts.filter((row) => (row.durationMs || 0) >= 20_000 && row.endedAt).length,
    answeredEnded: scopedAttempts.filter((row) => row.outcome === "answered" && row.endedAt).length,
    confirmed: rows.filter((row) => row.finalResult === "אישר הגעה" && row.enforced === "כן").length,
    declined: rows.filter((row) => row.finalResult === "לא מגיע" && row.enforced === "כן").length,
    undecided: rows.filter((row) => row.finalResult === "מתלבט" && row.enforced === "כן").length,
    callback: rows.filter((row) => row.finalResult === "ביקש חזרה" && row.enforced === "כן").length,
    wrongNumber: rows.filter((row) => row.finalResult === "מספר שגוי").length,
    openTasks: rows.filter((row) => ["פתוחה", "בטיפול"].includes(row.taskStatus)).length,
    exceptions: rows.filter((row) => row.exception === "כן").length,
    properlyCompleted: rows.filter((row) => row.enforced === "כן").length,
    before10: scopedAttempts.filter((row) => row.outcome !== "answered" && (row.durationMs || 0) > 0 && (row.durationMs || 0) < 10_000).length,
    from10to20: scopedAttempts.filter((row) => row.outcome !== "answered" && (row.durationMs || 0) >= 10_000 && (row.durationMs || 0) < 20_000).length,
    calleeHangup: scopedAttempts.filter((row) => hangupInitiatorLabel(row) === "נמען").length,
    softphoneHangup: scopedAttempts.filter((row) => hangupInitiatorLabel(row) === "נציגה").length,
    technical: scopedAttempts.filter((row) => row.outcome === "technical_failure").length,
    unclassified: scopedAttempts.filter((row) => hangupInitiatorLabel(row) === "לא ניתן לקבוע").length,
  };
}
