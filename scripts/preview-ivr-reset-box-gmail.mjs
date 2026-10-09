#!/usr/bin/env node
/**
 * Controlled IVR reset preview / execute for box@gmail.com only.
 *
 * Default: dry-run (print impact + write backup JSON). Never dials.
 * Execute only with: --execute --i-understand-irreversible
 *
 * Preserves: guests, RSVPs, groups, seating, WhatsApp/SMS, global admin packs,
 * other users, call-attempt history (attempts are kept; queued dial work is
 * cancelled so history cannot re-trigger).
 */

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const TARGET_EMAIL = "box@gmail.com";
const EXECUTE =
  process.argv.includes("--execute") &&
  process.argv.includes("--i-understand-irreversible");

function clean(v) {
  return typeof v === "string" ? v.trim() : "";
}

function emptyAudio() {
  return {
    status: "missing",
    source: null,
    publicToken: "",
    audioUrl: "",
    r2Key: "",
    contentType: "",
    contentHash: "",
    durationSeconds: null,
    generatedAt: null,
    textSnapshot: "",
    approved: false,
    approvedAt: null,
  };
}

function emptyComposed() {
  return {
    ...emptyAudio(),
    source: null,
    composeVersion: "",
  };
}

async function main() {
  const uri = clean(process.env.MONGODB_URI);
  if (!uri) {
    console.error("MONGODB_URI is required for preview/execute.");
    process.exit(2);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;

  const user = await db.collection("users").findOne({
    email: TARGET_EMAIL.toLowerCase(),
  });
  if (!user) {
    console.error(`User not found: ${TARGET_EMAIL}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const invitations = await db
    .collection("invitations")
    .find({ ownerId: user._id })
    .project({
      _id: 1,
      eventName: 1,
      eventDate: 1,
      createdAt: 1,
    })
    .toArray();

  const guestCount = await db.collection("guests").countDocuments({
    $or: [{ ownerId: user._id }, { userId: user._id }],
  });
  const invitationGuestCount = await db
    .collection("invitationguests")
    .countDocuments({
      invitationId: { $in: invitations.map((i) => i._id) },
    })
    .catch(() => 0);

  const attemptFilter = { userId: user._id };
  const attemptCount = await db
    .collection("ivrcallattempts")
    .countDocuments(attemptFilter);
  const liveAttempts = await db
    .collection("ivrcallattempts")
    .countDocuments({
      ...attemptFilter,
      status: {
        $in: ["queued", "initiated", "ringing", "answered", "invalid_input"],
      },
      endedAt: null,
    });

  const rounds = Array.isArray(user?.callRoundsSchedule?.rounds)
    ? user.callRoundsSchedule.rounds
    : [];
  const ivr = user.ivrConfig || {};

  const impact = {
    mode: EXECUTE ? "EXECUTE" : "DRY_RUN",
    user: {
      _id: String(user._id),
      email: user.email,
      name: user.name || "",
      includeCalls: user.includeCalls,
      callsType: user.callsType,
    },
    invitations: invitations.map((i) => ({
      _id: String(i._id),
      eventName: i.eventName || "",
      eventDate: i.eventDate || null,
    })),
    preserved: {
      guestsApprox: guestCount,
      invitationGuestsApprox: invitationGuestCount,
      whatsappSmsUntouched: true,
      groupsSeatingUntouched: true,
      globalAdminPacksUntouched: true,
      otherUsersUntouched: true,
      callAttemptHistoryKept: true,
    },
    willReset: {
      callRoundsSchedule: {
        enabled: user?.callRoundsSchedule?.enabled ?? null,
        rounds: rounds.map((r) => ({
          roundNumber: r.roundNumber,
          status: r.status,
          scheduledAt: r.scheduledAt || null,
          dialClaimedAt: r.dialClaimedAt || null,
          failureReason: r.failureReason || "",
        })),
      },
      ivrConfig: {
        voiceGender: ivr.voiceGender || null,
        audioMode: ivr.audioMode || ivr.recordingApproval?.audioMode || null,
        eventName: ivr.eventName || ivr.eventTypeLabel || "",
        eventNameAudio: {
          status: ivr.eventNameAudio?.status,
          approved: ivr.eventNameAudio?.approved,
          audioUrl: ivr.eventNameAudio?.audioUrl || "",
        },
        composedIntroAudio: {
          status: ivr.composedIntroAudio?.status,
          approved: ivr.composedIntroAudio?.approved,
          audioUrl: ivr.composedIntroAudio?.audioUrl || "",
        },
        introAudio: {
          status: ivr.introAudio?.status,
          approved: ivr.introAudio?.approved,
          audioUrl: ivr.introAudio?.audioUrl || "",
        },
        recordingApproval: ivr.recordingApproval || null,
      },
      liveAttemptsThatWillBeCancelledNotDeleted: liveAttempts,
      totalAttemptsPreserved: attemptCount,
    },
  };

  const backupDir = path.join(
    process.cwd(),
    "tmp",
    "ivr-reset-backups"
  );
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(
    backupDir,
    `box-gmail-ivr-${stamp}.json`
  );
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        userId: String(user._id),
        email: user.email,
        callRoundsSchedule: user.callRoundsSchedule || null,
        ivrConfig: user.ivrConfig || null,
        impact,
      },
      null,
      2
    )
  );

  console.log(JSON.stringify({ ...impact, backupPath }, null, 2));

  if (!EXECUTE) {
    console.log(
      "\nDry-run only. Re-run with --execute --i-understand-irreversible after explicit approval."
    );
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  const resetRounds = [1, 2, 3].map((n) => {
    const prev = rounds.find((r) => Number(r.roundNumber) === n) || {};
    return {
      roundNumber: n,
      title: prev.title || `סבב ${n}`,
      scheduledAt: null,
      status: "draft",
      notes: "",
      failureReason: "reset_pending_reconfigure",
      dialClaimedAt: null,
      openedAt: null,
      tasksCreated: null,
      eligibleCount: null,
      createdAt: prev.createdAt || now,
      updatedAt: now,
    };
  });

  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        "callRoundsSchedule.enabled": false,
        "callRoundsSchedule.rounds": resetRounds,
        "ivrConfig.voiceGender": null,
        "ivrConfig.systemVoiceId": "",
        "ivrConfig.voiceId": "",
        "ivrConfig.eventName": "",
        "ivrConfig.eventNamePronunciation": "",
        "ivrConfig.eventTypeLabel": "",
        "ivrConfig.hostsNames": "",
        "ivrConfig.hostsNamesPronunciation": "",
        "ivrConfig.eventNameAudio": emptyAudio(),
        "ivrConfig.composedIntroAudio": emptyComposed(),
        "ivrConfig.composedInboundAudio": emptyComposed(),
        "ivrConfig.introAudio": emptyAudio(),
        "ivrConfig.recordingApproval": {
          approved: false,
          approvedAt: null,
          audioMode: null,
          voiceGender: null,
          audioPublicToken: "",
          audioContentHash: "",
          audioUrl: "",
        },
        "ivrConfig.updatedAt": now,
      },
    }
  );

  // Cancel queued/live dial work for this user only — do not delete history.
  await db.collection("ivrcallattempts").updateMany(
    {
      userId: user._id,
      status: { $in: ["queued", "initiated"] },
      endedAt: null,
      rsvpApplied: { $ne: true },
    },
    {
      $set: {
        status: "failed",
        error: "USER_IVR_RESET",
        flowStep: "done",
        phase: "COMPLETED",
        endedAt: now,
        hangupCause: "user_ivr_reset",
      },
    }
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        executed: true,
        userId: String(user._id),
        backupPath,
        note: "IVR rounds disabled/draft; narration cleared; guests/RSVP/history kept. No auto re-dial.",
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
