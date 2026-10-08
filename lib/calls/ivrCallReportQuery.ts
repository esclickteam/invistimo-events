import mongoose from "mongoose";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import {
  classifyIvrAttempt,
  formatIvrDuration,
  formatIvrIsraelDateTime,
  ivrAttemptTimings,
  ivrAudioModeLabel,
  ivrDirectionLabel,
  parseIvrReportDayRange,
  redactIvrReportText,
  type IvrAttemptFacts,
} from "@/lib/calls/ivrCallReport";

const EXPORT_LIMIT = 20000;
const LIST_FIELDS =
  "userId invitationId guestId round phone channel direction eventName status flowStep answered dtmfDigits choiceDigit guestCountDigits rsvpResult attendingCount rsvpApplied rsvpAppliedAt startedAt answeredAt endedAt durationSeconds error hangupCause hangupSource retryCount audioMode eventNameAudioUrl introAudioUrl telnyxCallControlId telnyxCallLegId telnyxCallSessionId dialRequestedAt ringingAt playbackCommandAt playbackStartedAt firstDigitAt choiceDigitAt followupPlaybackStartedAt createdAt";

export type IvrReportQuery = {
  invitationId?: string;
  userId?: string;
  from?: string;
  to?: string;
  round?: string;
  direction?: string;
  callStatus?: string;
  rsvp?: string;
  audioMode?: string;
  outcome?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

function oid(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw || !mongoose.isValidObjectId(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function ivrReportStatusMatch(callStatus: string) {
  switch (callStatus) {
    case "waiting":
      return { status: "queued", answered: { $ne: true } };
    case "dialing":
      return { status: "initiated", answered: { $ne: true } };
    case "ringing":
      return { status: "ringing", answered: { $ne: true } };
    case "in_call":
      return {
        answered: true,
        rsvpApplied: { $ne: true },
        endedAt: null,
      };
    case "no_answer":
      return {
        answered: { $ne: true },
        status: { $in: ["no_answer", "hangup_before_response"] },
      };
    case "busy":
      return { status: "busy", answered: { $ne: true } };
    case "failed":
      return { status: "failed" };
    case "voicemail":
      return { status: "voicemail" };
    case "blocked":
      return { status: "canceled" };
    case "unresolved":
      return { status: "unresolved" };
    case "yes":
      return { rsvpApplied: true, rsvpResult: "yes" };
    case "no":
      return { rsvpApplied: true, rsvpResult: "no" };
    case "maybe":
      return { rsvpApplied: true, rsvpResult: "maybe" };
    case "partial":
      return {
        answered: true,
        rsvpApplied: { $ne: true },
        endedAt: { $ne: null },
        $or: [{ choiceDigit: "1" }, { guestCountDigits: { $gt: "" } }],
      };
    case "answered_no_digit":
      return {
        answered: true,
        rsvpApplied: { $ne: true },
        endedAt: { $ne: null },
        choiceDigit: { $in: ["", null] },
        guestCountDigits: { $in: ["", null] },
      };
    case "answered_hangup":
      return {
        answered: true,
        rsvpApplied: { $ne: true },
        endedAt: { $ne: null },
        choiceDigit: { $nin: ["", "1", null] },
      };
    default:
      return null;
  }
}

async function guestIdsForSearch(q: string) {
  const guests = await InvitationGuest.find({
    name: new RegExp(escapeRegex(q), "i"),
  })
    .select("_id")
    .limit(300)
    .lean();
  return guests.map((guest) => guest._id);
}

export async function buildIvrReportFilter(query: IvrReportQuery) {
  const and: Record<string, unknown>[] = [];
  const invitationId = oid(query.invitationId);
  const userId = oid(query.userId);
  if (query.invitationId && !invitationId) return { empty: true as const, filter: {} };
  if (query.userId && !userId) return { empty: true as const, filter: {} };
  if (invitationId) and.push({ invitationId });
  if (userId) and.push({ userId });

  const round = Number(query.round);
  if (query.round) {
    if (![1, 2, 3].includes(round)) return { empty: true as const, filter: {} };
    and.push({ round });
  }

  if (query.direction === "inbound") {
    and.push({ $or: [{ direction: "inbound" }, { channel: "inbound_ivr" }] });
  } else if (query.direction === "outbound") {
    and.push({ direction: { $ne: "inbound" }, channel: { $ne: "inbound_ivr" } });
  }

  if (query.audioMode === "ai") {
    and.push({
      $or: [
        { audioMode: "ai" },
        {
          audioMode: { $in: ["", null] },
          eventNameAudioUrl: { $gt: "" },
        },
      ],
    });
  } else if (query.audioMode === "self_recorded") {
    and.push({
      $or: [
        { audioMode: "self_recorded" },
        {
          audioMode: { $in: ["", null] },
          introAudioUrl: { $gt: "" },
          eventNameAudioUrl: { $in: ["", null] },
        },
      ],
    });
  }

  if (query.rsvp === "yes" || query.rsvp === "no" || query.rsvp === "maybe") {
    and.push({ rsvpApplied: true, rsvpResult: query.rsvp });
  } else if (query.rsvp === "none") {
    and.push({ rsvpApplied: { $ne: true } });
  }

  if (query.outcome === "completed") {
    and.push({
      rsvpApplied: true,
      rsvpResult: { $in: ["yes", "no", "maybe"] },
    });
  } else if (query.outcome === "problem") {
    and.push({
      $or: [
        {
          status: {
            $in: [
              "failed",
              "busy",
              "no_answer",
              "voicemail",
              "canceled",
              "unresolved",
              "hangup_before_response",
              "invalid_input",
            ],
          },
        },
        {
          answered: true,
          rsvpApplied: { $ne: true },
          endedAt: { $ne: null },
        },
      ],
    });
  }

  const statusMatch = query.callStatus
    ? ivrReportStatusMatch(query.callStatus)
    : null;
  if (query.callStatus && !statusMatch) return { empty: true as const, filter: {} };
  if (statusMatch) and.push(statusMatch);

  const range = parseIvrReportDayRange(query.from, query.to);
  if (query.from && !range.start) return { empty: true as const, filter: {} };
  if (query.to && !range.end) return { empty: true as const, filter: {} };
  if (range.start || range.end) {
    const createdAt: Record<string, Date> = {};
    if (range.start) createdAt.$gte = range.start;
    if (range.end) createdAt.$lt = range.end;
    and.push({ createdAt });
  }

  const q = String(query.q || "").trim();
  if (q) {
    const or: Record<string, unknown>[] = [];
    const digits = q.replace(/\D/g, "");
    if (digits.length >= 3) {
      or.push({ phone: new RegExp(escapeRegex(digits)) });
    }
    const guestIds = await guestIdsForSearch(q);
    if (guestIds.length) or.push({ guestId: { $in: guestIds } });
    if (!or.length) return { empty: true as const, filter: {} };
    and.push({ $or: or });
  }

  return {
    empty: false as const,
    filter: and.length ? { $and: and } : {},
  };
}

function displayAt(row: any) {
  return row.dialRequestedAt || row.startedAt || row.createdAt || null;
}

export function shapeIvrReportRow(
  row: any,
  names: {
    guestName: string;
    invitedCount: number | null;
    eventName: string;
    clientName: string;
  }
) {
  const facts = row as IvrAttemptFacts;
  const classified = classifyIvrAttempt(facts);
  const timings = ivrAttemptTimings(facts);
  const attending =
    typeof row.attendingCount === "number" ? row.attendingCount : null;
  return {
    id: String(row._id),
    at: displayAt(row),
    atLabel: formatIvrIsraelDateTime(displayAt(row)),
    eventName: names.eventName || "לא זמין",
    clientName: names.clientName || "לא זמין",
    guestName: names.guestName || "לא זמין",
    phone: String(row.phone || ""),
    direction: ivrDirectionLabel(facts) === "נכנסת" ? "inbound" : "outbound",
    directionLabel: ivrDirectionLabel(facts),
    round: row.round === 1 || row.round === 2 || row.round === 3 ? row.round : null,
    audioModeLabel: ivrAudioModeLabel(facts),
    callStatus: classified.callStatus,
    callStatusLabel: classified.label,
    rsvpLabel: classified.rsvpLabel,
    invitedCount: names.invitedCount,
    attendingCount: attending,
    callDurationLabel: formatIvrDuration(timings.callDurationMs),
    ringLabel: formatIvrDuration(timings.ringMs),
    answerToPlaybackLabel: formatIvrDuration(timings.answerToPlaybackMs),
    digitToFollowupLabel: formatIvrDuration(timings.digitToFollowupMs),
    digitToRsvpLabel: formatIvrDuration(timings.digitToRsvpMs),
    dialToRingLabel: formatIvrDuration(timings.dialToRingMs),
    attempts: Number(row.retryCount || 0) + 1,
    error: redactIvrReportText(row.error || ""),
    hangupCause: redactIvrReportText(row.hangupCause || ""),
    hangupSource: redactIvrReportText(row.hangupSource || ""),
    telnyxCallControlId: String(row.telnyxCallControlId || ""),
    telnyxCallLegId: String(row.telnyxCallLegId || ""),
    telnyxCallSessionId: String(row.telnyxCallSessionId || ""),
    digits: Array.isArray(row.dtmfDigits) ? row.dtmfDigits.join(", ") : "",
    choiceDigit: String(row.choiceDigit || ""),
    guestCountDigits: String(row.guestCountDigits || ""),
    problem: classified.problem,
    timeline: Array.isArray(row.timeline)
      ? [...row.timeline]
          .filter((entry) => entry?.at)
          .sort(
            (a, b) =>
              new Date(a.at).getTime() - new Date(b.at).getTime()
          )
          .map((entry) => ({
            at: entry.at,
            atLabel: formatIvrIsraelDateTime(entry.at),
            source: entry.source === "telnyx" ? "telnyx" : "server",
            label: redactIvrReportText(entry.label),
            detail: redactIvrReportText(entry.detail),
            digit: String(entry.digit || ""),
            stage: String(entry.stage || ""),
          }))
      : [],
  };
}

async function nameMaps(rows: any[]) {
  const guestIds = [...new Set(rows.map((row) => String(row.guestId || "")).filter(Boolean))];
  const invitationIds = [
    ...new Set(rows.map((row) => String(row.invitationId || "")).filter(Boolean)),
  ];
  const userIds = [...new Set(rows.map((row) => String(row.userId || "")).filter(Boolean))];
  const [guests, invitations, users] = await Promise.all([
    guestIds.length
      ? InvitationGuest.find({ _id: { $in: guestIds } })
          .select("name guestsCount")
          .lean()
      : [],
    invitationIds.length
      ? Invitation.find({ _id: { $in: invitationIds } })
          .select("title")
          .lean()
      : [],
    userIds.length
      ? User.find({ _id: { $in: userIds } })
          .select("name email")
          .lean()
      : [],
  ]);
  const guestById = new Map(guests.map((item: any) => [String(item._id), item]));
  const invitationById = new Map(
    invitations.map((item: any) => [String(item._id), item])
  );
  const userById = new Map(users.map((item: any) => [String(item._id), item]));
  return { guestById, invitationById, userById };
}

function namesFor(row: any, maps: Awaited<ReturnType<typeof nameMaps>>) {
  const guest = maps.guestById.get(String(row.guestId));
  const invitation = maps.invitationById.get(String(row.invitationId));
  const user = maps.userById.get(String(row.userId));
  return {
    guestName: String(guest?.name || ""),
    invitedCount:
      typeof guest?.guestsCount === "number" ? guest.guestsCount : null,
    eventName: String(row.eventName || invitation?.title || ""),
    clientName: String(user?.name || user?.email || ""),
  };
}

function emptyStats() {
  return {
    attempts: 0,
    uniqueGuests: 0,
    answered: 0,
    uniqueAnswered: 0,
    noAnswer: 0,
    busy: 0,
    failed: 0,
    answeredNoResponse: 0,
    partial: 0,
    yes: 0,
    no: 0,
    maybe: 0,
    uniqueYes: 0,
    uniqueNo: 0,
    uniqueMaybe: 0,
    queued: 0,
    answerRate: null as number | null,
    completionRate: null as number | null,
    avgCallMs: null as number | null,
    avgAnswerToPlaybackMs: null as number | null,
    avgDigitToFollowupMs: null as number | null,
  };
}

function sizeOf(ids: unknown) {
  if (!Array.isArray(ids)) return 0;
  return new Set(ids.filter(Boolean).map((id) => String(id))).size;
}

export async function summarizeIvrReport(filter: Record<string, unknown>) {
  const [row] = await IvrCallAttempt.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        attempts: { $sum: 1 },
        guestIds: { $addToSet: "$guestId" },
        answered: { $sum: { $cond: [{ $eq: ["$answered", true] }, 1, 0] } },
        answeredGuestIds: {
          $addToSet: {
            $cond: [{ $eq: ["$answered", true] }, "$guestId", null],
          },
        },
        noAnswer: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$answered", true] },
                  { $in: ["$status", ["no_answer", "hangup_before_response"]] },
                ],
              },
              1,
              0,
            ],
          },
        },
        busy: {
          $sum: {
            $cond: [
              {
                $and: [{ $ne: ["$answered", true] }, { $eq: ["$status", "busy"] }],
              },
              1,
              0,
            ],
          },
        },
        failed: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
        answeredNoResponse: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$answered", true] },
                  { $ne: ["$rsvpApplied", true] },
                  { $ne: ["$endedAt", null] },
                  { $in: ["$choiceDigit", ["", null]] },
                  { $in: ["$guestCountDigits", ["", null]] },
                ],
              },
              1,
              0,
            ],
          },
        },
        partial: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$answered", true] },
                  { $ne: ["$rsvpApplied", true] },
                  { $ne: ["$endedAt", null] },
                  {
                    $or: [
                      { $eq: ["$choiceDigit", "1"] },
                      { $gt: ["$guestCountDigits", ""] },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        yes: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$rsvpApplied", true] },
                  { $eq: ["$rsvpResult", "yes"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        no: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$rsvpApplied", true] },
                  { $eq: ["$rsvpResult", "no"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        maybe: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$rsvpApplied", true] },
                  { $eq: ["$rsvpResult", "maybe"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        yesGuestIds: {
          $addToSet: {
            $cond: [
              {
                $and: [
                  { $eq: ["$rsvpApplied", true] },
                  { $eq: ["$rsvpResult", "yes"] },
                ],
              },
              "$guestId",
              null,
            ],
          },
        },
        noGuestIds: {
          $addToSet: {
            $cond: [
              {
                $and: [
                  { $eq: ["$rsvpApplied", true] },
                  { $eq: ["$rsvpResult", "no"] },
                ],
              },
              "$guestId",
              null,
            ],
          },
        },
        maybeGuestIds: {
          $addToSet: {
            $cond: [
              {
                $and: [
                  { $eq: ["$rsvpApplied", true] },
                  { $eq: ["$rsvpResult", "maybe"] },
                ],
              },
              "$guestId",
              null,
            ],
          },
        },
        queued: {
          $sum: { $cond: [{ $eq: ["$status", "queued"] }, 1, 0] },
        },
        avgCallMs: {
          $avg: {
            $cond: [
              {
                $and: [
                  { $ne: ["$answeredAt", null] },
                  { $ne: ["$endedAt", null] },
                ],
              },
              { $subtract: ["$endedAt", "$answeredAt"] },
              null,
            ],
          },
        },
        avgAnswerToPlaybackMs: {
          $avg: {
            $cond: [
              {
                $and: [
                  { $ne: ["$answeredAt", null] },
                  { $ne: ["$playbackStartedAt", null] },
                ],
              },
              { $subtract: ["$playbackStartedAt", "$answeredAt"] },
              null,
            ],
          },
        },
        avgDigitToFollowupMs: {
          $avg: {
            $cond: [
              {
                $and: [
                  { $ne: ["$firstDigitAt", null] },
                  { $ne: ["$followupPlaybackStartedAt", null] },
                ],
              },
              { $subtract: ["$followupPlaybackStartedAt", "$firstDigitAt"] },
              null,
            ],
          },
        },
      },
    },
  ]);

  if (!row) return emptyStats();
  const answered = Number(row.answered || 0);
  const attempts = Number(row.attempts || 0);
  const responses = Number(row.yes || 0) + Number(row.no || 0) + Number(row.maybe || 0);
  return {
    attempts,
    uniqueGuests: sizeOf(row.guestIds),
    answered,
    uniqueAnswered: sizeOf(row.answeredGuestIds),
    noAnswer: Number(row.noAnswer || 0),
    busy: Number(row.busy || 0),
    failed: Number(row.failed || 0),
    answeredNoResponse: Number(row.answeredNoResponse || 0),
    partial: Number(row.partial || 0),
    yes: Number(row.yes || 0),
    no: Number(row.no || 0),
    maybe: Number(row.maybe || 0),
    uniqueYes: sizeOf(row.yesGuestIds),
    uniqueNo: sizeOf(row.noGuestIds),
    uniqueMaybe: sizeOf(row.maybeGuestIds),
    queued: Number(row.queued || 0),
    answerRate: attempts ? answered / attempts : null,
    completionRate: answered ? responses / answered : null,
    avgCallMs: typeof row.avgCallMs === "number" ? row.avgCallMs : null,
    avgAnswerToPlaybackMs:
      typeof row.avgAnswerToPlaybackMs === "number"
        ? row.avgAnswerToPlaybackMs
        : null,
    avgDigitToFollowupMs:
      typeof row.avgDigitToFollowupMs === "number"
        ? row.avgDigitToFollowupMs
        : null,
  };
}

export async function listIvrReportPage(query: IvrReportQuery) {
  const built = await buildIvrReportFilter(query);
  const page = Math.max(1, Math.min(500, Number(query.page) || 1));
  const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 50));
  if (built.empty) {
    return { rows: [], total: 0, page, pageSize, stats: emptyStats() };
  }
  const [total, docs, stats] = await Promise.all([
    IvrCallAttempt.countDocuments(built.filter),
    IvrCallAttempt.find(built.filter)
      .select(LIST_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    summarizeIvrReport(built.filter),
  ]);
  const maps = await nameMaps(docs);
  return {
    rows: docs.map((row) => shapeIvrReportRow(row, namesFor(row, maps))),
    total,
    page,
    pageSize,
    stats,
  };
}

export async function listIvrReportExport(query: IvrReportQuery) {
  const built = await buildIvrReportFilter(query);
  if (built.empty) return { rows: [], truncated: false, total: 0 };
  const total = await IvrCallAttempt.countDocuments(built.filter);
  const docs = await IvrCallAttempt.find(built.filter)
    .select(`${LIST_FIELDS} timeline`)
    .sort({ createdAt: -1 })
    .limit(EXPORT_LIMIT)
    .lean();
  const maps = await nameMaps(docs);
  return {
    rows: docs.map((row) => shapeIvrReportRow(row, namesFor(row, maps))),
    truncated: total > EXPORT_LIMIT,
    total,
  };
}

export async function getIvrReportAttempt(attemptId: string) {
  if (!mongoose.isValidObjectId(attemptId)) return null;
  const row = await IvrCallAttempt.findById(attemptId).lean();
  if (!row) return null;
  const maps = await nameMaps([row]);
  const shaped = shapeIvrReportRow(row, namesFor(row, maps));
  return {
    ...shaped,
    timelineAvailable: shaped.timeline.length > 0,
  };
}

export async function listIvrReportOptions() {
  const [invitations, users] = await Promise.all([
    IvrCallAttempt.aggregate([
      { $group: { _id: "$invitationId" } },
      { $limit: 400 },
    ]),
    IvrCallAttempt.aggregate([{ $group: { _id: "$userId" } }, { $limit: 400 }]),
  ]);
  const invitationIds = invitations.map((item) => item._id).filter(Boolean);
  const userIds = users.map((item) => item._id).filter(Boolean);
  const [invitationDocs, userDocs] = await Promise.all([
    invitationIds.length
      ? Invitation.find({ _id: { $in: invitationIds } })
          .select("title")
          .lean()
      : [],
    userIds.length
      ? User.find({ _id: { $in: userIds } })
          .select("name email")
          .lean()
      : [],
  ]);
  return {
    events: invitationDocs
      .map((item: any) => ({
        id: String(item._id),
        name: String(item.title || "אירוע"),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "he")),
    clients: userDocs
      .map((item: any) => ({
        id: String(item._id),
        name: String(item.name || item.email || "לקוח"),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "he")),
  };
}

export async function summarizeIvrRounds(invitationId: string) {
  const id = oid(invitationId);
  if (!id) return [];
  const invitation = await Invitation.findById(id).select("title ownerId").lean();
  const ownerId = (invitation as any)?.ownerId;
  const owner = ownerId
    ? await User.findById(ownerId).select("callRoundsSchedule").lean()
    : null;
  const rounds = Array.isArray((owner as any)?.callRoundsSchedule?.rounds)
    ? (owner as any).callRoundsSchedule.rounds
    : [];
  const grouped = await IvrCallAttempt.aggregate([
    {
      $match: {
        invitationId: id,
        direction: { $ne: "inbound" },
        round: { $in: [1, 2, 3] },
      },
    },
    {
      $group: {
        _id: "$round",
        attempts: { $sum: 1 },
        sent: {
          $sum: {
            $cond: [{ $gt: ["$telnyxCallControlId", ""] }, 1, 0],
          },
        },
        answered: {
          $sum: { $cond: [{ $eq: ["$answered", true] }, 1, 0] },
        },
        noAnswer: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$answered", true] },
                  {
                    $in: [
                      "$status",
                      ["no_answer", "hangup_before_response", "voicemail"],
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        responses: {
          $sum: { $cond: [{ $eq: ["$rsvpApplied", true] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
        reasons: { $addToSet: "$error" },
        firstAt: {
          $min: { $ifNull: ["$dialRequestedAt", "$startedAt"] },
        },
        lastAt: { $max: "$endedAt" },
        live: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$endedAt", null] },
                  {
                    $in: [
                      "$status",
                      ["queued", "initiated", "ringing", "answered", "invalid_input"],
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return [1, 2, 3].map((round) => {
    const saved = rounds.find((item: any) => Number(item.roundNumber) === round);
    const agg = grouped.find((item) => Number(item._id) === round);
    const status = String(saved?.status || "");
    const terminal = status === "done" || status === "failed" || status === "completed";
    const startedAt = saved?.openedAt || agg?.firstAt || null;
    const endedAt = terminal && Number(agg?.live || 0) === 0 ? agg?.lastAt || null : null;
    const reasons = Array.isArray(agg?.reasons)
      ? agg.reasons.map((reason: unknown) => redactIvrReportText(reason)).filter(Boolean)
      : [];
    return {
      round,
      eligibleCount:
        typeof saved?.eligibleCount === "number" ? saved.eligibleCount : null,
      queued: Number(agg?.attempts || 0),
      sent: Number(agg?.sent || 0),
      answered: Number(agg?.answered || 0),
      noAnswer: Number(agg?.noAnswer || 0),
      responses: Number(agg?.responses || 0),
      failed: Number(agg?.failed || 0),
      reasons,
      failureReason: redactIvrReportText(saved?.failureReason || ""),
      status,
      startedAt,
      startedAtLabel: formatIvrIsraelDateTime(startedAt),
      endedAt,
      endedAtLabel: formatIvrIsraelDateTime(endedAt),
      durationLabel:
        startedAt && endedAt
          ? formatIvrDuration(
              new Date(endedAt).getTime() - new Date(startedAt).getTime()
            )
          : "לא זמין",
    };
  });
}
