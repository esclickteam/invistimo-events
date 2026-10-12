import type { PlannedNotice } from "@/lib/customerNotifications/planners";

const OPEN_STATUSES = new Set(["pending", "in_progress"]);
const DOCUMENTED_STATUSES = new Set([
  "confirmed",
  "declined",
  "no_answer",
  "callback",
  "undecided",
  "will_reply_message",
  "needs_fix",
  "wrong_number",
  "completed",
]);

const ISRAEL = "Asia/Jerusalem";
const MAX_FUTURE_MS = 2 * 60 * 1000;
const EARLIEST_MS = Date.UTC(2018, 0, 1);

export type HumanCallRecordingTime = {
  taskId?: string | null;
  startedAt?: Date | string | null;
  answeredAt?: Date | string | null;
  endedAt?: Date | string | null;
};

export type HumanCallDocumentation = {
  taskId: string;
  invitationId: string;
  round: number;
  status: string;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  lastAttemptAt?: Date | string | null;
};

export type HumanCallRoundSummary = {
  eventName: string;
  round: number;
  startedAt: Date;
  endedAt: Date;
  documentedCount: number;
  durationMs: number;
};

function asReliableDate(value: unknown, now: Date) {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  const time = date.getTime();
  if (!Number.isFinite(time)) return null;
  if (time < EARLIEST_MS) return null;
  if (time > now.getTime() + MAX_FUTURE_MS) return null;
  return date;
}

function clockParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISRAEL,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value || "00";
  const minute = parts.find((part) => part.type === "minute")?.value || "00";
  return `${hour}:${minute}`;
}

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatHumanCallClock(date: Date, withDate = false) {
  const clock = clockParts(date);
  if (!withDate) return clock;
  const key = dayKey(date);
  const [year, month, day] = key.split("-");
  return `${day}.${month}.${year} ${clock}`;
}

export function formatHumanCallDuration(durationMs: number) {
  const totalMinutes = Math.max(0, Math.round(durationMs / 60000));
  if (totalMinutes <= 0) return "פחות מדקה";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourText = hours === 1 ? "שעה" : `${hours} שעות`;
  const minuteText = minutes === 1 ? "דקה" : `${minutes} דקות`;
  if (hours <= 0) return minuteText;
  if (minutes <= 0) return hourText;
  return `${hourText} ו־${minuteText}`;
}

function windowForCall(input: {
  call: HumanCallDocumentation;
  recordings: HumanCallRecordingTime[];
  now: Date;
}) {
  const starts: Date[] = [];
  const ends: Date[] = [];
  for (const recording of input.recordings) {
    const started =
      asReliableDate(recording.startedAt, input.now) ||
      asReliableDate(recording.answeredAt, input.now);
    const ended = asReliableDate(recording.endedAt, input.now);
    if (started) starts.push(started);
    if (ended) ends.push(ended);
  }
  const documentedAt =
    asReliableDate(input.call.completedAt, input.now) ||
    asReliableDate(input.call.lastAttemptAt, input.now);
  const handlingStart = asReliableDate(input.call.startedAt, input.now);

  const start = starts.sort((a, b) => a.getTime() - b.getTime())[0] || handlingStart || documentedAt;
  let end = ends.sort((a, b) => b.getTime() - a.getTime())[0] || null;
  if (!end) end = documentedAt || start;
  if (!start || !end) return null;
  if (end.getTime() < start.getTime()) end = start;
  return { start, end };
}

export function summarizeHumanCallRound(input: {
  invitationId: string;
  round: number;
  eventName: string;
  calls: HumanCallDocumentation[];
  recordings?: HumanCallRecordingTime[];
  now?: Date;
}): HumanCallRoundSummary | null {
  const now = input.now || new Date();
  const invitationId = String(input.invitationId || "");
  const round = Number(input.round);
  const scoped = input.calls.filter(
    (call) =>
      String(call.invitationId) === invitationId &&
      Number(call.round) === round &&
      DOCUMENTED_STATUSES.has(String(call.status || ""))
  );
  if (!scoped.length) return null;

  const byTask = new Map<string, HumanCallRecordingTime[]>();
  for (const recording of input.recordings || []) {
    const taskId = String(recording.taskId || "");
    if (!taskId) continue;
    const list = byTask.get(taskId) || [];
    list.push(recording);
    byTask.set(taskId, list);
  }

  let startedAt: Date | null = null;
  let endedAt: Date | null = null;
  for (const call of scoped) {
    const window = windowForCall({
      call,
      recordings: byTask.get(String(call.taskId)) || [],
      now,
    });
    if (!window) continue;
    if (!startedAt || window.start.getTime() < startedAt.getTime()) startedAt = window.start;
    if (!endedAt || window.end.getTime() > endedAt.getTime()) endedAt = window.end;
  }
  if (!startedAt || !endedAt) return null;

  return {
    eventName: String(input.eventName || "").trim() || "האירוע",
    round,
    startedAt,
    endedAt,
    documentedCount: scoped.length,
    durationMs: Math.max(0, endedAt.getTime() - startedAt.getTime()),
  };
}

export function formatHumanCallRoundNotice(summary: HumanCallRoundSummary) {
  const showDate = dayKey(summary.startedAt) !== dayKey(summary.endedAt);
  const title = `סבב שיחות אנושיות ${summary.round} הסתיים – ${summary.eventName}.`;
  const body = [
    `תחילת שיחות: ${formatHumanCallClock(summary.startedAt, showDate)}`,
    `סיום שיחות: ${formatHumanCallClock(summary.endedAt, showDate)}`,
    `משך כולל: ${formatHumanCallDuration(summary.durationMs)}`,
    `סה״כ שיחות שתועדו: ${summary.documentedCount}.`,
  ].join("\n");
  return { title, body };
}

export function planHumanCallRoundNotification(input: {
  invitationId: string;
  round: number;
  eventName: string;
  completed: boolean;
  openTaskCount: number;
  calls: HumanCallDocumentation[];
  recordings?: HumanCallRecordingTime[];
  now?: Date;
}): PlannedNotice | null {
  if (!input.completed) return null;
  if (Number(input.openTaskCount || 0) > 0) return null;
  const summary = summarizeHumanCallRound(input);
  if (!summary) return null;
  const text = formatHumanCallRoundNotice(summary);
  return {
    dedupeKey: `human-call-round:${input.invitationId}:${summary.round}`,
    type: "rsvp.humanCalls.done",
    category: "rsvp_rounds",
    severity: "info",
    title: text.title,
    body: text.body,
    actionHref: "/dashboard",
    audience: "customer",
    notifyAdmins: true,
    adminTitle: text.title,
    adminBody: text.body,
    adminCategory: "rsvp_rounds",
    adminSeverity: "info",
    adminActionHref: "/admin/shift-management",
  };
}

export function isOpenHumanCallStatus(status: string) {
  return OPEN_STATUSES.has(String(status || ""));
}
