import { randomUUID } from "crypto";
import mongoose from "mongoose";

import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import ScheduledMessage from "@/models/ScheduledMessage";
import WhatsappQueue from "@/models/WhatsappQueue";
import CallTask from "@/models/CallTask";
import CallWorkOrder from "@/models/CallWorkOrder";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import EventTask from "@/models/EventTask";
import EventConversation from "@/models/EventConversation";
import RoundGuestDelivery from "@/models/RoundGuestDelivery";
import WeddingChallengeConfig from "@/models/WeddingChallengeConfig";
import VenueEvent from "@/models/VenueEvent";
import EventDeletionControl from "@/models/EventDeletionControl";
import EventDeletionRun from "@/models/EventDeletionRun";
import { deleteInvistimoCustomerAccount } from "@/lib/customers/deleteCustomerAccount";
import {
  assertSafeAssessments,
  assessAccount,
  liveDeletionPermitted,
  planDeletionBatch,
  sanitizeDeletionLog,
  type AccountAssessment,
  type OpenWorkKind,
  type PolicyEventInput,
  type PolicyUserInput,
} from "@/lib/customers/eventDeletionPolicy";

type AnyRecord = Record<string, any>;

const TEST_EXECUTION_TOKEN = "TEST_ONLY_ISOLATED";
const CONTROL_KEY = "event-auto-deletion";

const OPEN_MESSAGE = ["scheduled", "sending", "failed"];
const OPEN_CALL_TASK = [
  "pending",
  "in_progress",
  "callback",
  "undecided",
  "will_reply_message",
  "needs_fix",
];
const OPEN_WORK_ORDER = ["scheduled", "open", "in_progress", "paused"];
const OPEN_IVR = ["queued", "initiated", "ringing", "answered"];

function id(value: unknown) {
  return value ? String(value) : "";
}

function pushWork(map: Map<string, OpenWorkKind[]>, key: string, kind: OpenWorkKind) {
  if (!key) return;
  const list = map.get(key) || [];
  list.push(kind);
  map.set(key, list);
}

function messageKind(type: unknown, status: unknown, attempts = 0, maxAttempts = 1): OpenWorkKind {
  const failed = status === "failed";
  const retry = failed && attempts < maxAttempts;
  if (type === "thankyou") {
    if (status === "sending") return "thankyou_sending";
    if (retry) return "thankyou_retry";
    if (failed) return "thankyou_failed";
    return "thankyou_scheduled";
  }
  if (status === "sending") return "message_sending";
  if (retry) return "message_retry";
  if (failed) return "message_failed";
  return "scheduled_message";
}

async function loadControl() {
  const control = await EventDeletionControl.findOne({ key: CONTROL_KEY }).lean();
  return {
    emergencyStop: control?.emergencyStop === true,
    anomalyThreshold: Number(control?.anomalyThreshold || 25),
    maxPerRun: Number(control?.maxPerRun || 10),
    mode: "dry_run" as const,
  };
}

async function collectOpenWork(invitationIds: string[], eventIds: string[]) {
  const byInvitation = new Map<string, OpenWorkKind[]>();
  const byEvent = new Map<string, OpenWorkKind[]>();
  if (!invitationIds.length && !eventIds.length) {
    return { byInvitation, byEvent };
  }

  const invitationObjectIds = invitationIds
    .filter((value) => mongoose.Types.ObjectId.isValid(value))
    .map((value) => new mongoose.Types.ObjectId(value));
  const eventObjectIds = eventIds
    .filter((value) => mongoose.Types.ObjectId.isValid(value))
    .map((value) => new mongoose.Types.ObjectId(value));

  const [messages, queue, calls, orders, ivr, tasks, conversations, deliveries, challenges] =
    await Promise.all([
      invitationObjectIds.length
        ? ScheduledMessage.find({
            invitationId: { $in: invitationObjectIds },
            status: { $in: OPEN_MESSAGE },
          })
            .select("invitationId type status lockedAt")
            .lean()
        : [],
      invitationObjectIds.length
        ? WhatsappQueue.find({
            invitationId: { $in: invitationObjectIds },
            status: { $in: ["pending", "scheduled", "sending", "failed"] },
          })
            .select("invitationId type status attempts maxAttempts lockedAt")
            .lean()
        : [],
      invitationObjectIds.length
        ? CallTask.find({
            invitationId: { $in: invitationObjectIds },
            status: { $in: OPEN_CALL_TASK },
          })
            .select("invitationId status")
            .lean()
        : [],
      invitationObjectIds.length
        ? CallWorkOrder.find({
            invitationId: { $in: invitationObjectIds },
            status: { $in: OPEN_WORK_ORDER },
          })
            .select("invitationId status")
            .lean()
        : [],
      invitationObjectIds.length
        ? IvrCallAttempt.find({
            invitationId: { $in: invitationObjectIds },
            status: { $in: OPEN_IVR },
          })
            .select("invitationId status")
            .lean()
        : [],
      eventObjectIds.length
        ? EventTask.find({
            eventId: { $in: eventObjectIds },
            status: { $in: ["open", "waiting"] },
          })
            .select("eventId status")
            .lean()
        : [],
      eventObjectIds.length
        ? EventConversation.find({
            eventId: { $in: eventObjectIds },
            status: { $in: ["planned", "pending"] },
          })
            .select("eventId status")
            .lean()
        : [],
      invitationObjectIds.length
        ? RoundGuestDelivery.find({
            invitationId: { $in: invitationObjectIds },
            $or: [
              { "whatsapp.status": { $in: ["QUEUED", "SENDING", "FAILED"] } },
              { "sms.status": { $in: ["PENDING", "FAILED", "OUTCOME_UNKNOWN"] } },
            ],
          })
            .select("invitationId whatsapp.status sms.status")
            .lean()
        : [],
      invitationObjectIds.length
        ? WeddingChallengeConfig.find({
            invitationId: { $in: invitationObjectIds },
            "sms.status": { $in: ["scheduled", "sending", "failed"] },
          })
            .select("invitationId sms.status")
            .lean()
        : [],
    ]);

  for (const row of messages as AnyRecord[]) {
    const kind = messageKind(row.type, row.status);
    pushWork(byInvitation, id(row.invitationId), kind);
    if (row.lockedAt && row.status === "sending") {
      pushWork(byInvitation, id(row.invitationId), "worker");
    }
  }
  for (const row of queue as AnyRecord[]) {
    pushWork(
      byInvitation,
      id(row.invitationId),
      messageKind(row.type, row.status, Number(row.attempts || 0), Number(row.maxAttempts || 1))
    );
    if (row.lockedAt && row.status === "sending") {
      pushWork(byInvitation, id(row.invitationId), "worker");
    }
  }
  for (const row of [...(calls as AnyRecord[]), ...(orders as AnyRecord[]), ...(ivr as AnyRecord[])]) {
    pushWork(byInvitation, id(row.invitationId), "call");
  }
  for (const row of deliveries as AnyRecord[]) {
    const whatsapp = String(row.whatsapp?.status || "");
    const sms = String(row.sms?.status || "");
    const kind: OpenWorkKind =
      whatsapp === "SENDING" || sms === "PENDING"
        ? "message_sending"
        : whatsapp === "FAILED" || sms === "FAILED" || sms === "OUTCOME_UNKNOWN"
          ? "message_failed"
          : "scheduled_message";
    pushWork(byInvitation, id(row.invitationId), kind);
  }
  for (const row of challenges as AnyRecord[]) {
    const status = String(row.sms?.status || "");
    pushWork(
      byInvitation,
      id(row.invitationId),
      status === "sending" ? "message_sending" : status === "failed" ? "message_failed" : "scheduled_message"
    );
  }
  for (const row of [...(tasks as AnyRecord[]), ...(conversations as AnyRecord[])]) {
    pushWork(byEvent, id(row.eventId), "task");
  }

  return { byInvitation, byEvent };
}

function reminderComplete(rows: AnyRecord[]) {
  const reminders = rows.filter((row) => row.type === "reminder" || row.type === "table");
  if (!reminders.length) return false;
  return reminders.every((row) => row.status === "sent" || row.status === "cancelled");
}

export async function scanEventDeletion(now = new Date()) {
  const control = await loadControl();
  const users = await User.find({
    role: { $in: ["user", "client"] },
    venueUser: { $ne: true },
  })
    .select(
      "_id name role venueUser autoDeletionExempt autoDeletionDisputeOpen autoDeletionAdminHold autoDeletionOpenTreatment eventDeletionPolicyAcceptedAt"
    )
    .lean();

  const userIds = users.map((user) => user._id);
  const events = userIds.length
    ? await Event.find({ userId: { $in: userIds } })
        .select(
          "_id userId title date venueOwnerId venueHallId autoDeletionExempt autoDeletionDisputeOpen autoDeletionAdminHold autoDeletionOpenTreatment deletionFailureWaivedAt updatedAt"
        )
        .lean()
    : [];
  const eventIds = events.map((event) => id(event._id));
  const invitations = eventIds.length
    ? await Invitation.find({ eventId: { $in: events.map((event) => event._id) } })
        .select("_id eventId ownerId eventDate reminderSentAt")
        .lean()
    : [];
  const invitationIds = invitations.map((invitation) => id(invitation._id));
  const reminderRows = invitationIds.length
    ? await ScheduledMessage.find({
        invitationId: { $in: invitations.map((invitation) => invitation._id) },
        type: { $in: ["reminder", "table"] },
      })
        .select("invitationId type status")
        .lean()
    : [];
  const venueLinks = eventIds.length
    ? await VenueEvent.find({ linkedEventId: { $in: events.map((event) => event._id) } })
        .select("linkedEventId")
        .lean()
    : [];
  const open = await collectOpenWork(invitationIds, eventIds);

  const invitationByEvent = new Map<string, AnyRecord>();
  for (const invitation of invitations as AnyRecord[]) {
    invitationByEvent.set(id(invitation.eventId), invitation);
  }
  const remindersByInvitation = new Map<string, AnyRecord[]>();
  for (const row of reminderRows as AnyRecord[]) {
    const key = id(row.invitationId);
    const list = remindersByInvitation.get(key) || [];
    list.push(row);
    remindersByInvitation.set(key, list);
  }
  const linked = new Set(venueLinks.map((row) => id((row as AnyRecord).linkedEventId)));
  const eventsByUser = new Map<string, AnyRecord[]>();
  for (const event of events as AnyRecord[]) {
    const key = id(event.userId);
    const list = eventsByUser.get(key) || [];
    list.push(event);
    eventsByUser.set(key, list);
  }

  const accounts: AccountAssessment[] = users.map((user) => {
    const record = user as AnyRecord;
    const owned = eventsByUser.get(id(record._id)) || [];
    const policyEvents: PolicyEventInput[] = owned.map((event) => {
      const invitation = invitationByEvent.get(id(event._id));
      const invitationId = id(invitation?._id);
      const openWork = [
        ...(open.byInvitation.get(invitationId) || []),
        ...(open.byEvent.get(id(event._id)) || []),
      ];
      const ownerMatches =
        !invitation || !invitation.ownerId || id(invitation.ownerId) === id(event.userId);
      const eventMatches = !invitation || id(invitation.eventId) === id(event._id);
      return {
        id: id(event._id),
        title: String(event.title || ""),
        storedDate: event.date,
        invitationDate: invitation?.eventDate ?? null,
        exempt: event.autoDeletionExempt === true,
        disputeOpen: event.autoDeletionDisputeOpen === true,
        adminHold: event.autoDeletionAdminHold === true,
        openTreatment: event.autoDeletionOpenTreatment === true,
        failureWaived: Boolean(event.deletionFailureWaivedAt),
        reminderRoundComplete:
          invitation?.reminderSentAt != null ||
          reminderComplete(remindersByInvitation.get(invitationId) || []),
        thankYouRoundComplete: !openWork.some((kind) => kind.startsWith("thankyou_")),
        openWork,
        venueLinked: Boolean(event.venueOwnerId || event.venueHallId || linked.has(id(event._id))),
        attributionUncertain: !ownerMatches || !eventMatches,
      };
    });

    const input: PolicyUserInput = {
      id: id(record._id),
      name: String(record.name || ""),
      role: String(record.role || ""),
      venueUser: record.venueUser === true,
      exempt: record.autoDeletionExempt === true,
      disputeOpen: record.autoDeletionDisputeOpen === true,
      adminHold: record.autoDeletionAdminHold === true,
      openTreatment: record.autoDeletionOpenTreatment === true,
      policyAccepted: Boolean(record.eventDeletionPolicyAcceptedAt),
      events: policyEvents,
    };
    return assessAccount(input, now);
  });

  assertSafeAssessments(accounts);
  const eligibleAccountIds = accounts.filter((account) => account.accountDeletable).map((account) => account.userId);
  const batch = planDeletionBatch(eligibleAccountIds, control);

  return { now, control, accounts, batch, liveDeletionEnabled: liveDeletionPermitted() };
}

export function deletionRows(accounts: AccountAssessment[]) {
  return accounts.flatMap((account) =>
    account.events.map((event) =>
      sanitizeDeletionLog({
        userId: account.userId,
        customerName: account.customerName,
        eventId: event.eventId,
        eventTitle: event.eventTitle,
        eventDate: event.eventDate || "",
        plannedDeletionAt: event.plannedDeletionAt || "",
        bucket: event.bucket,
        reasons: [...event.reasons, ...account.reasons.filter((reason) => reason === "RETROACTIVE_HOLD" || reason === "OTHER_FUTURE_EVENT")],
        reminderRoundComplete: event.reminderRoundComplete,
        thankYouClear: event.thankYouClear,
        openWorkCount: event.openWork.length,
        outcome: "reported",
        accountDeletable: event.accountDeletable,
      })
    )
  );
}

export async function runDryEventDeletion(now = new Date()) {
  if (liveDeletionPermitted()) {
    throw new Error("LIVE_DELETION_DISABLED");
  }
  const scanned = await scanEventDeletion(now);
  const entries = deletionRows(scanned.accounts).map((entry) => ({
    ...entry,
    outcome: scanned.control.emergencyStop ? "emergency_stop" : "dry_run",
  }));
  const run = await EventDeletionRun.create({
    mode: "dry_run",
    startedAt: scanned.now,
    finishedAt: new Date(),
    emergencyStop: scanned.control.emergencyStop,
    anomaly: scanned.batch.anomaly,
    eligibleAccounts: scanned.accounts.filter((account) =>
      account.events.some((event) => event.eligible)
    ).length,
    executed: 0,
    entries,
  });
  return {
    mode: "dry_run" as const,
    liveDeletionEnabled: false,
    executed: 0,
    emergencyStop: scanned.control.emergencyStop,
    anomaly: scanned.batch.anomaly,
    runId: String(run._id),
    accounts: scanned.accounts,
    entries,
  };
}

function assertIsolatedExecution(token: string | undefined) {
  if (liveDeletionPermitted()) throw new Error("LIVE_DELETION_DISABLED");
  if (token !== TEST_EXECUTION_TOKEN) throw new Error("LIVE_DELETION_DISABLED");
  if (String(process.env.APP_ENV || "").toLowerCase() !== "test") {
    throw new Error("LIVE_DELETION_DISABLED");
  }
}

async function releaseLease(eventId: string, token: string) {
  await Event.updateOne(
    { _id: eventId, deletionLeaseToken: token },
    { $set: { deletionLeaseToken: null, deletionLeaseUntil: null } }
  );
}

/**
 * Isolated test execution only. Production cron and admin routes do not call this.
 * A date that no longer matches the pre-lock read aborts the whole account.
 */
export async function executeIsolatedDeletion(
  userId: string,
  options: {
    now?: Date;
    executionToken?: string;
    beforeLock?: () => Promise<void>;
    emergencyStop?: boolean;
    anomalyThreshold?: number;
    siblingEligibleCount?: number;
  }
) {
  assertIsolatedExecution(options.executionToken);
  const now = options.now || new Date();
  if (options.emergencyStop) return { deleted: false, reason: "EMERGENCY_STOP" };
  if ((options.siblingEligibleCount || 1) > (options.anomalyThreshold ?? 25)) {
    return { deleted: false, reason: "ANOMALY_HOLD" };
  }

  const user = await User.findById(userId);
  if (!user) return { deleted: false, reason: "ALREADY_ABSENT" };

  const events = await Event.find({ userId: user._id }).lean();
  const invitations = await Invitation.find({ eventId: { $in: events.map((event) => event._id) } })
    .select("_id eventId ownerId eventDate reminderSentAt")
    .lean();
  const open = await collectOpenWork(
    invitations.map((invitation) => id(invitation._id)),
    events.map((event) => id(event._id))
  );
  const invitationByEvent = new Map(invitations.map((invitation) => [id(invitation.eventId), invitation as AnyRecord]));
  const reminderRows = invitations.length
    ? await ScheduledMessage.find({
        invitationId: { $in: invitations.map((invitation) => invitation._id) },
        type: { $in: ["reminder", "table"] },
      })
        .select("invitationId type status")
        .lean()
    : [];

  const snapshot = assessAccount(
    {
      id: id(user._id),
      name: String(user.name || ""),
      role: String(user.role || ""),
      venueUser: user.venueUser === true,
      exempt: user.autoDeletionExempt === true,
      disputeOpen: user.autoDeletionDisputeOpen === true,
      adminHold: user.autoDeletionAdminHold === true,
      openTreatment: user.autoDeletionOpenTreatment === true,
      policyAccepted: Boolean(user.eventDeletionPolicyAcceptedAt),
      events: events.map((event) => {
        const invitation = invitationByEvent.get(id(event._id));
        const openWork = [
          ...(open.byInvitation.get(id(invitation?._id)) || []),
          ...(open.byEvent.get(id(event._id)) || []),
        ];
        return {
          id: id(event._id),
          title: String(event.title || ""),
          storedDate: event.date,
          invitationDate: invitation?.eventDate ?? null,
          exempt: event.autoDeletionExempt === true,
          disputeOpen: event.autoDeletionDisputeOpen === true,
          adminHold: event.autoDeletionAdminHold === true,
          openTreatment: event.autoDeletionOpenTreatment === true,
          failureWaived: Boolean(event.deletionFailureWaivedAt),
          reminderRoundComplete: reminderComplete(
            (reminderRows as AnyRecord[]).filter((row) => id(row.invitationId) === id(invitation?._id))
          ),
          thankYouRoundComplete: !openWork.some((kind) => String(kind).startsWith("thankyou_")),
          openWork,
          venueLinked: Boolean(event.venueOwnerId || event.venueHallId),
          attributionUncertain: Boolean(
            invitation && id(invitation.ownerId) && id(invitation.ownerId) !== id(event.userId)
          ),
        };
      }),
    },
    now
  );
  assertSafeAssessments([snapshot]);
  if (!snapshot.accountDeletable) {
    return { deleted: false, reason: snapshot.reasons[0] || snapshot.events[0]?.reasons[0] || "NOT_ELIGIBLE", assessment: snapshot };
  }

  const locks: Array<{ eventId: string; token: string; date: unknown }> = [];
  try {
    if (options.beforeLock) await options.beforeLock();
    for (const event of events) {
      const token = randomUUID();
      const locked = await Event.findOneAndUpdate(
        {
          _id: event._id,
          date: event.date,
          updatedAt: event.updatedAt,
        },
        {
          $set: {
            deletionLeaseToken: token,
            deletionLeaseUntil: new Date(now.getTime() + 2 * 60 * 1000),
          },
        },
        { new: true }
      );
      if (!locked) {
        return { deleted: false, reason: "DATE_CHANGED_OR_LOCK_FAILED" };
      }
      locks.push({ eventId: id(event._id), token, date: locked.date });
      if (String(locked.date) !== String(event.date)) {
        return { deleted: false, reason: "DATE_CHANGED_OR_LOCK_FAILED" };
      }
      const again = assessAccount(
        {
          ...snapshot,
          id: snapshot.userId,
          role: snapshot.role,
          policyAccepted: true,
          events: snapshot.events.map((item) =>
            item.eventId === id(event._id)
              ? { ...item, storedDate: locked.date, id: item.eventId }
              : { ...item, storedDate: events.find((row) => id(row._id) === item.eventId)?.date, id: item.eventId }
          ) as PolicyEventInput[],
        },
        now
      );
      assertSafeAssessments([again]);
      if (!again.accountDeletable || again.events.some((item) => item.eventId === id(event._id) && !item.eligible)) {
        return { deleted: false, reason: "DATE_CHANGED_OR_LOCK_FAILED" };
      }
    }

    const freshUser = await User.findById(user._id);
    if (!freshUser) return { deleted: false, reason: "ALREADY_ABSENT" };
    const freshEvents = await Event.find({ userId: freshUser._id }).select("date userId").lean();
    if (freshEvents.length !== events.length) {
      return { deleted: false, reason: "DATE_CHANGED_OR_LOCK_FAILED" };
    }
    for (const locked of locks) {
      const fresh = freshEvents.find((event) => id(event._id) === locked.eventId);
      if (!fresh || String(fresh.date) !== String(locked.date)) {
        return { deleted: false, reason: "DATE_CHANGED_OR_LOCK_FAILED" };
      }
    }

    await deleteInvistimoCustomerAccount(freshUser.toObject());
    const stillThere = await User.exists({ _id: user._id });
    if (stillThere) throw new Error("DELETION_INCOMPLETE");
    return { deleted: true, reason: "DELETED" };
  } finally {
    if (await User.exists({ _id: userId })) {
      for (const lock of locks) await releaseLease(lock.eventId, lock.token);
    }
  }
}

export async function setDeletionHold(input: {
  userId?: string;
  eventId?: string;
  exempt?: boolean;
  disputeOpen?: boolean;
  waiveFailure?: boolean;
}) {
  const userSet: AnyRecord = {};
  const eventSet: AnyRecord = {};
  if (input.exempt != null) {
    userSet.autoDeletionExempt = input.exempt;
    eventSet.autoDeletionExempt = input.exempt;
  }
  if (input.disputeOpen != null) {
    userSet.autoDeletionDisputeOpen = input.disputeOpen;
    eventSet.autoDeletionDisputeOpen = input.disputeOpen;
  }
  if (input.waiveFailure != null) {
    eventSet.deletionFailureWaivedAt = input.waiveFailure ? new Date() : null;
  }
  if (input.userId && Object.keys(userSet).length) {
    await User.updateOne({ _id: input.userId }, { $set: userSet });
  }
  if (input.eventId && Object.keys(eventSet).length) {
    await Event.updateOne({ _id: input.eventId }, { $set: eventSet });
  } else if (input.userId && Object.keys(eventSet).length) {
    await Event.updateMany({ userId: input.userId }, { $set: eventSet });
  }
}

export async function setEmergencyStop(stopped: boolean) {
  await EventDeletionControl.findOneAndUpdate(
    { key: CONTROL_KEY },
    { $set: { key: CONTROL_KEY, mode: "dry_run", emergencyStop: stopped } },
    { upsert: true, new: true }
  );
  return { emergencyStop: stopped, mode: "dry_run" as const, liveDeletionEnabled: false };
}

export async function recentDeletionRuns(limit = 20) {
  return EventDeletionRun.find({ mode: "dry_run" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}
