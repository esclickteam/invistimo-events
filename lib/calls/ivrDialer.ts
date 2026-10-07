/**
 * IVR round dialer: resolve audience at execution time, create attempts, place calls.
 * Never dials unless IVR_ALLOW_LIVE_DIAL=true or phone is on IVR_TEST_PHONE_ALLOWLIST.
 */

import User from "@/models/User";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import {
  getCallRoundDateKeyInIsrael,
  isCallRoundDue,
  parseCallRoundScheduledAt,
} from "@/lib/calls/callRoundScheduleTime";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import {
  filterGuestsForIvrRound,
  type IvrRoundNumber,
} from "@/lib/calls/ivrRoundEligibility";
import {
  buildIvrPublicAudioUrl,
  getAppBaseUrl,
} from "@/lib/calls/ivrAudioStorage";
import {
  createIvrOutboundCall,
  isIvrDialAllowed,
  normalizePhoneForTelnyx,
} from "@/lib/telnyx/ivrCallControl";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRoundCancelled(round: any) {
  const status = String(round?.status || "")
    .trim()
    .toLowerCase();
  return (
    status === "cancelled" ||
    status === "canceled" ||
    status === "בוטל" ||
    status === "מבוטל" ||
    round?.cancelled === true ||
    round?.enabled === false
  );
}

export type IvrDueRound = {
  userId: string;
  invitationId: string;
  round: IvrRoundNumber;
  scheduledAt: Date;
  introAudioUrl: string;
  clientName: string;
};

export async function listDueIvrRounds(input?: {
  now?: Date;
  dateKey?: string;
  force?: boolean;
}): Promise<IvrDueRound[]> {
  const now = input?.now || new Date();
  const dateKey = input?.dateKey || getCallRoundDateKeyInIsrael(now);
  const force = Boolean(input?.force);

  const users = (await User.find({
    includeCalls: true,
    callsType: "ivr",
    "callRoundsSchedule.rounds.scheduledAt": { $exists: true },
  })
    .select(
      "_id name email includeCalls callsType callRoundsSchedule ivrConfig"
    )
    .lean()) as any[];

  const due: IvrDueRound[] = [];

  for (const user of users) {
    if (!isIvrCallsUser(user)) continue;

    const intro = user?.ivrConfig?.introAudio;
    const token = cleanStr(intro?.publicToken);
    const introAudioUrl =
      cleanStr(intro?.audioUrl) ||
      (token ? buildIvrPublicAudioUrl(token) : "");

    if (!introAudioUrl || intro?.status !== "ready") {
      continue;
    }

    const rounds = Array.isArray(user?.callRoundsSchedule?.rounds)
      ? user.callRoundsSchedule.rounds
      : [];

    const invitation = await Invitation.findOne({ ownerId: user._id })
      .select("_id ownerId eventName")
      .sort({ eventDate: 1, createdAt: -1 })
      .lean();

    if (!invitation?._id) continue;

    for (const raw of rounds) {
      const roundNumber = Number(raw?.roundNumber || raw?.round || 0) as
        | IvrRoundNumber
        | number;
      if (roundNumber !== 1 && roundNumber !== 2 && roundNumber !== 3) continue;
      if (isRoundCancelled(raw)) continue;

      const scheduledAt = parseCallRoundScheduledAt(raw?.scheduledAt);
      if (!scheduledAt) continue;

      if (
        !isCallRoundDue({
          scheduledAt,
          dateKey,
          now,
          force,
        })
      ) {
        continue;
      }

      // Skip if already opened for this schedule instant (idempotent reopen guard).
      if (raw?.status === "opened" || raw?.status === "done") {
        // Still allow retry for guests not yet attempted — dialer dedupes per guest.
      }

      due.push({
        userId: String(user._id),
        invitationId: String(invitation._id),
        round: roundNumber,
        scheduledAt,
        introAudioUrl,
        clientName: cleanStr(user.name) || cleanStr(user.email) || "לקוח",
      });
    }
  }

  due.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  return due;
}

export async function executeIvrRound(input: {
  due: IvrDueRound;
  webhookUrl: string;
  maxCalls?: number;
  now?: Date;
}) {
  const now = input.now || new Date();
  const maxCalls = Math.max(1, Number(input.maxCalls) || 50);

  const guests = await InvitationGuest.find({
    invitationId: input.due.invitationId,
  }).lean();

  const eligible = filterGuestsForIvrRound({
    guests,
    round: input.due.round,
  });

  const results: Array<{
    guestId: string;
    phone: string;
    status: string;
    attemptId?: string;
    reason?: string;
  }> = [];

  let dialed = 0;

  for (const guest of eligible) {
    if (dialed >= maxCalls) break;

    const guestId = String(guest._id);
    const phoneRaw = cleanStr(guest.phone || guest.mobile || guest.phoneNumber);
    const phone = normalizePhoneForTelnyx(phoneRaw);

    if (!phone) {
      results.push({ guestId, phone: phoneRaw, status: "skipped", reason: "bad_phone" });
      continue;
    }

    // Already attempted this round for this guest?
    const existing = await IvrCallAttempt.findOne({
      invitationId: input.due.invitationId,
      guestId,
      round: input.due.round,
      status: {
        $nin: ["failed", "canceled"],
      },
    })
      .select("_id status")
      .lean();

    if (existing) {
      results.push({
        guestId,
        phone,
        status: "already_attempted",
        attemptId: String(existing._id),
      });
      continue;
    }

    if (!isIvrDialAllowed(phone)) {
      // Create a dry-run attempt marker so we can test audience without mass dialing.
      const dry = await IvrCallAttempt.create({
        userId: input.due.userId,
        invitationId: input.due.invitationId,
        guestId,
        round: input.due.round,
        phone,
        status: "canceled",
        flowStep: "done",
        answered: false,
        dtmfDigits: [],
        rsvpApplied: false,
        startedAt: now,
        endedAt: now,
        durationSeconds: 0,
        introAudioUrl: input.due.introAudioUrl,
        error: "DIAL_BLOCKED_TEST_MODE",
      });

      results.push({
        guestId,
        phone,
        status: "blocked_test_mode",
        attemptId: String(dry._id),
        reason: "IVR_TEST_PHONE_ALLOWLIST",
      });
      continue;
    }

    const attempt = await IvrCallAttempt.create({
      userId: input.due.userId,
      invitationId: input.due.invitationId,
      guestId,
      round: input.due.round,
      phone,
      status: "queued",
      flowStep: "dialing",
      answered: false,
      dtmfDigits: [],
      rsvpApplied: false,
      startedAt: now,
      introAudioUrl: input.due.introAudioUrl,
      dialLockedAt: now,
    });

    try {
      const clientState = {
        source: "invistimo-ivr",
        ivr: true,
        callAttemptId: String(attempt._id),
        userId: input.due.userId,
        invitationId: input.due.invitationId,
        guestId,
        round: input.due.round,
        event_id: input.due.invitationId,
        guest_id: guestId,
        round_id: String(input.due.round),
        call_attempt_id: String(attempt._id),
      };

      const created = await createIvrOutboundCall({
        to: phone,
        webhookUrl: input.webhookUrl,
        clientState,
      });

      await IvrCallAttempt.updateOne(
        { _id: attempt._id },
        {
          $set: {
            status: "initiated",
            telnyxCallControlId: created.callControlId,
            telnyxCallLegId: created.callLegId,
            telnyxCallSessionId: created.callSessionId,
            telnyxConnectionId: created.connectionId,
          },
        }
      );

      dialed += 1;
      results.push({
        guestId,
        phone,
        status: "initiated",
        attemptId: String(attempt._id),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "DIAL_FAILED";
      await IvrCallAttempt.updateOne(
        { _id: attempt._id },
        {
          $set: {
            status: "failed",
            flowStep: "done",
            endedAt: new Date(),
            error: message,
          },
        }
      );
      results.push({
        guestId,
        phone,
        status: "failed",
        attemptId: String(attempt._id),
        reason: message,
      });
    }
  }

  // Mark schedule round opened (does not mutate scheduledAt).
  await User.updateOne(
    {
      _id: input.due.userId,
      "callRoundsSchedule.rounds.roundNumber": input.due.round,
    },
    {
      $set: {
        "callRoundsSchedule.rounds.$.status": "opened",
        "callRoundsSchedule.rounds.$.openedAt": now,
        "callRoundsSchedule.rounds.$.tasksCreated": results.filter((r) =>
          ["initiated", "blocked_test_mode"].includes(r.status)
        ).length,
        "callRoundsSchedule.rounds.$.updatedAt": now,
      },
    }
  );

  return {
    invitationId: input.due.invitationId,
    round: input.due.round,
    eligibleCount: eligible.length,
    dialed,
    results,
    appBaseUrl: getAppBaseUrl(),
  };
}
