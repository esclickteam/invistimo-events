import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import { writeAdminAuditLog } from "@/lib/admin/auditLog";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import {
  filterGuestsForIvrRound,
  isFinalRsvp,
} from "@/lib/calls/ivrRoundEligibility";
import {
  getGuestRsvpValue,
  hasGuestPhone,
} from "@/lib/calls/callRoundEligibility";
import {
  formatCallRoundDateTimeDmy,
  formatCallRoundDateTimeInput,
  parseCallRoundScheduledAt,
} from "@/lib/calls/callRoundScheduleTime";
import {
  getAppBaseUrl,
  resolveIvrPublicAudioUrl,
} from "@/lib/calls/ivrAudioStorage";
import {
  describeIvrAudioDiagnostics,
  openIvrRoundManually,
  resolveIvrRoundAudio,
  setIvrRoundAdminStatus,
} from "@/lib/calls/ivrDialer";
import { buildNextIvrRoundSchedule } from "@/lib/calls/ivrRoundSchedule";
import { explainIvrCallFailure } from "@/lib/telnyx/ivrCallControl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

async function requireAdmin(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId) {
    throw new Error("UNAUTHORIZED");
  }
  if (!isAdminContext(auth)) {
    throw new Error("FORBIDDEN");
  }
  return auth;
}

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function mapExecutionStatus(rawStatus: unknown, hasSchedule: boolean) {
  const status = String(rawStatus || "")
    .trim()
    .toLowerCase();
  if (status === "done" || status === "completed") return "done";
  if (status === "failed") return "failed";
  if (status === "in_progress" || status === "opened") return "in_progress";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "draft" || (!hasSchedule && !status)) return "draft";
  if (status === "scheduled" || hasSchedule) return "scheduled";
  return "draft";
}

function statusLabel(status: string) {
  if (status === "done") return "הושלם";
  if (status === "failed") return "נכשל";
  if (status === "in_progress") return "מתבצע";
  if (status === "cancelled") return "נעצר";
  if (status === "scheduled") return "מתוזמן";
  return "טיוטה";
}

async function loadIvrTarget(userId: string) {
  const user = await User.findById(userId)
    .select(
      "_id name email includeCalls callsType callRoundsSchedule ivrConfig isActive"
    )
    .lean();
  if (!user) return null;
  return user as any;
}

function buildEligibilityBreakdown(guests: any[], round: 1 | 2 | 3) {
  let noPhone = 0;
  let finalYes = 0;
  let finalNo = 0;
  let pending = 0;
  let maybe = 0;
  let other = 0;
  for (const guest of guests) {
    if (!hasGuestPhone(guest)) {
      noPhone += 1;
      continue;
    }
    const rsvp = getGuestRsvpValue(guest);
    if (rsvp === "yes") finalYes += 1;
    else if (rsvp === "no") finalNo += 1;
    else if (rsvp === "pending") pending += 1;
    else if (rsvp === "maybe") maybe += 1;
    else other += 1;
  }
  const eligible = filterGuestsForIvrRound({ guests, round }).length;
  const finalAnswered = finalYes + finalNo;
  const reasons: string[] = [];
  if (noPhone) reasons.push(`ללא טלפון תקין: ${noPhone}`);
  if (finalYes) reasons.push(`אישרו הגעה: ${finalYes}`);
  if (finalNo) reasons.push(`דחו: ${finalNo}`);
  if (round === 3) {
    if (pending + maybe === 0 && finalAnswered > 0) {
      reasons.push("אין ממתינים/מתלבטים לסבב 3");
    }
  } else if (pending === 0 && finalAnswered > 0) {
    reasons.push("אין ממתינים (pending) לסבב זה");
  }
  return {
    totalGuests: guests.length,
    withPhone: guests.length - noPhone,
    noPhone,
    finalYes,
    finalNo,
    finalAnswered,
    pending,
    maybe,
    other,
    eligible,
    filterReasons: reasons,
  };
}

async function resolveInvitationForUser(
  user: any,
  preferredInvitationId?: string | null
) {
  const preferred = cleanStr(preferredInvitationId);
  if (preferred) {
    const byId = await Invitation.findOne({
      _id: preferred,
      ownerId: user._id,
    })
      .select("_id ownerId eventId eventDate title")
      .lean();
    if (byId) return byId as any;
  }
  return (await Invitation.findOne({ ownerId: user._id })
    .select("_id ownerId eventId eventDate title")
    .sort({ eventDate: 1, createdAt: -1 })
    .lean()) as any;
}

async function resolveEventActivity(user: any, invitation: any) {
  if (user.isActive === false) {
    return {
      eventActive: false,
      eventStatus: "user_inactive",
      eventBlockReason: "המשתמש מסומן כלא פעיל (isActive=false)",
      eventId: null as string | null,
    };
  }

  let event: any = null;
  if (invitation?.eventId) {
    event = await Event.findById(invitation.eventId).select("_id status").lean();
  }
  if (!event) {
    event = await Event.findOne({ userId: user._id })
      .select("_id status")
      .sort({ date: -1 })
      .lean();
  }

  if (event) {
    const status = String(event.status || "");
    if (status === "archived") {
      return {
        eventActive: false,
        eventStatus: "archived",
        eventBlockReason: "האירוע בארכיון",
        eventId: String(event._id),
      };
    }
    if (status && status !== "active") {
      return {
        eventActive: false,
        eventStatus: status,
        eventBlockReason: `סטטוס האירוע במערכת: ${status}`,
        eventId: String(event._id),
      };
    }
    return {
      eventActive: true,
      eventStatus: status || "active",
      eventBlockReason: "",
      eventId: String(event._id),
    };
  }

  // Many IVR clients have an invitation without a separate Event row.
  if (invitation?._id) {
    return {
      eventActive: true,
      eventStatus: "invitation_only",
      eventBlockReason: "",
      eventId: null as string | null,
    };
  }

  return {
    eventActive: false,
    eventStatus: "missing",
    eventBlockReason: "לא נמצאו אירוע או הזמנה למשתמש",
    eventId: null as string | null,
  };
}

async function buildRoundsPayload(
  user: any,
  preferredInvitationId?: string | null
) {
  const invitation = await resolveInvitationForUser(
    user,
    preferredInvitationId
  );
  const eventInfo = await resolveEventActivity(user, invitation);

  const audio = resolveIvrRoundAudio(user);
  const audioDiagnostics = describeIvrAudioDiagnostics(user);
  const cfg = user?.ivrConfig || {};
  const composed = cfg.composedIntroAudio || {};
  const intro = cfg.introAudio || {};
  const previewAudioUrl =
    audio.introAudioUrl ||
    resolveIvrPublicAudioUrl({
      publicToken: composed.publicToken,
      storedUrl: composed.audioUrl,
    }) ||
    resolveIvrPublicAudioUrl({
      publicToken: intro.publicToken,
      storedUrl: intro.audioUrl,
    }) ||
    "";
  const canApproveAudio =
    !audio.audioReady &&
    audio.audioMode === "ai" &&
    audioDiagnostics.composedStatus === "ready" &&
    audioDiagnostics.eventNameStatus === "ready" &&
    audioDiagnostics.composeVersion ===
      audioDiagnostics.requiredComposeVersion &&
    Boolean(previewAudioUrl);
  const scheduleRounds = Array.isArray(user?.callRoundsSchedule?.rounds)
    ? user.callRoundsSchedule.rounds
    : [];

  const guests = invitation
    ? await InvitationGuest.find({ invitationId: invitation._id }).lean()
    : [];

  const attempts = invitation
    ? await IvrCallAttempt.find({
        invitationId: invitation._id,
        channel: "outbound_ivr",
      })
        .select("round status")
        .lean()
    : [];

  const liveByRound: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  if (invitation) {
    for (const round of [1, 2, 3] as const) {
      liveByRound[round] = await IvrCallAttempt.countDocuments({
        invitationId: invitation._id,
        round,
        channel: "outbound_ivr",
        status: {
          $in: ["queued", "initiated", "ringing", "answered", "invalid_input"],
        },
      });
    }
  }

  const liveDialDisabled = process.env.IVR_ALLOW_LIVE_DIAL === "false";
  const eventActive = eventInfo.eventActive;

  const rounds = [1, 2, 3].map((round) => {
    const scheduleRound = scheduleRounds.find(
      (item: any) => Number(item?.roundNumber || item?.round) === round
    );
    const hasSchedule = Boolean(
      parseCallRoundScheduledAt(scheduleRound?.scheduledAt)
    );
    const executionStatus = mapExecutionStatus(
      scheduleRound?.status,
      hasSchedule
    );
    const roundAttempts = attempts.filter((a) => Number(a.round) === round);
    const breakdown = buildEligibilityBreakdown(
      guests,
      round as 1 | 2 | 3
    );
    const remaining = Math.max(0, breakdown.eligible);
    const dialed = roundAttempts.length;
    const liveCount = liveByRound[round] || 0;
    const statusMismatch =
      executionStatus === "done" && dialed === 0
        ? "סומן כהושלם ללא ניסיונות חיוג — ניתן לתקן סטטוס / לפתוח מחדש"
        : executionStatus === "done" && remaining > 0
          ? "סומן כהושלם אך נותרו אורחים זכאים"
          : "";

    const failureReasonRaw = String(scheduleRound?.failureReason || "");
    const blocked =
      executionStatus === "cancelled" &&
      (/חסום|נעצר ידנית|blocked/i.test(failureReasonRaw) ||
        failureReasonRaw.includes("אדמין"));

    // Parity with WhatsApp/SMS: reopen/block always available (except live dials).
    const canReset = liveCount === 0;
    const canBlock = liveCount === 0 && !blocked;
    const canUnblock = liveCount === 0 && blocked;

    const dialGateNotes: string[] = [];
    if (!eventActive) {
      dialGateNotes.push(
        eventInfo.eventBlockReason || "האירוע אינו פעיל"
      );
    }
    if (!audio.audioReady) {
      dialGateNotes.push(
        audio.audioBlockReason || "אין קריינות מאושרת ונגישה"
      );
    }
    if (remaining < 1) {
      dialGateNotes.push(
        breakdown.filterReasons[0]
          ? `אין אורחים זכאים (${breakdown.filterReasons.join(" · ")})`
          : "אין אורחים זכאים לחיוג"
      );
    }
    if (liveDialDisabled) dialGateNotes.push("חיוגים מושבתים זמנית במערכת");
    if (blocked) dialGateNotes.push("הסבב חסום באדמין");
    if (statusMismatch) dialGateNotes.push(statusMismatch);

    return {
      round,
      title: `סבב ${round} — שיחות אישורי הגעה`,
      status: executionStatus,
      statusLabel: blocked ? "חסום" : statusLabel(executionStatus),
      statusMismatch,
      blocked,
      failureReason: failureReasonRaw
        ? explainIvrCallFailure(failureReasonRaw)
        : "",
      scheduledAt: scheduleRound?.scheduledAt || null,
      scheduledAtInput: formatCallRoundDateTimeInput(scheduleRound?.scheduledAt),
      scheduledAtDisplay: formatCallRoundDateTimeDmy(scheduleRound?.scheduledAt),
      eligibleCount: breakdown.eligible,
      dialedCount: dialed,
      remainingCount: remaining,
      finalAnsweredCount: breakdown.finalAnswered,
      eligibility: breakdown,
      liveCount,
      canReset,
      canBlock,
      canUnblock,
      // Dial gates are informational only — reopen/block do not require them.
      dialGateNotes,
      blockReasons: dialGateNotes,
    };
  });

  return {
    invitationId: invitation ? String(invitation._id) : null,
    eventActive,
    eventStatus: eventInfo.eventStatus,
    eventBlockReason: eventInfo.eventBlockReason,
    eventId: eventInfo.eventId,
    audioReady: audio.audioReady,
    audioBlockReason: audio.audioBlockReason || "",
    audioDiagnostics,
    previewAudioUrl,
    canApproveAudio,
    narrationSettingsPath: "/admin/recorded-calls",
    clientRecordedCallsHint: canApproveAudio
      ? "הקריינות מוכנה אך לא מאושרת — האזינו ואשרו כאן לפני חיוג. לא נוצרים קבצים מחדש."
      : "להשלמת קריינות: אצל הלקוח בשיחות מוקלטות, או הגדרות קריינות גלובליות.",
    liveDialDisabled,
    guestTotals: {
      totalGuests: guests.length,
      withPhone: guests.filter((g) => hasGuestPhone(g)).length,
      finalAnswered: guests.filter(
        (g) => hasGuestPhone(g) && isFinalRsvp(getGuestRsvpValue(g))
      ).length,
    },
    rounds,
  };
}

/** GET — status / counts for admin Edit User IVR rounds panel */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    await requireAdmin(req);
    const { id } = await context.params;
    const user = await loadIvrTarget(id);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!isIvrCallsUser(user)) {
      return NextResponse.json(
        { ok: false, error: "NOT_IVR_USER" },
        { status: 400 }
      );
    }

    const preferredInvitationId = new URL(req.url).searchParams.get(
      "invitationId"
    );
    const payload = await buildRoundsPayload(user, preferredInvitationId);
    return NextResponse.json({ ok: true, ...payload });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }
    console.error("[admin/users/ivr-rounds GET]", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "FAILED" },
      { status: 500 }
    );
  }
}

/**
 * POST — open / stop / resume / schedule
 * Open always goes through openIvrRoundManually → executeIvrRound.
 * Never accepts force=1 as a safety bypass.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await requireAdmin(req);
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const action = cleanStr(body?.action);
    const round = Number(body?.round);

    // Explicitly reject force bypass from admin clients.
    if (body?.force === 1 || body?.force === true || body?.force === "1") {
      return NextResponse.json(
        {
          ok: false,
          error: "FORCE_NOT_ALLOWED",
          message: "אין לעקוף חסימות בטיחות באמצעות force",
        },
        { status: 400 }
      );
    }

    const user = await loadIvrTarget(id);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }
    if (!isIvrCallsUser(user)) {
      return NextResponse.json(
        { ok: false, error: "NOT_IVR_USER" },
        { status: 400 }
      );
    }

    const admin = await User.findById(auth.userId).select("name email").lean();
    const preferredInvitationId =
      cleanStr(body?.invitationId) ||
      new URL(req.url).searchParams.get("invitationId");
    const invitation = await resolveInvitationForUser(
      user,
      preferredInvitationId
    );
    const eventInfo = await resolveEventActivity(user, invitation);
    const eventId = eventInfo.eventId;

    if (action === "schedule") {
      const incomingRounds = Array.isArray(body?.rounds) ? body.rounds : [];
      const existingRounds = Array.isArray(user.callRoundsSchedule?.rounds)
        ? user.callRoundsSchedule.rounds
        : [];

      // Same builder as client /api/ivr/schedule — new runId on schedule change.
      // Admin UI sets status:"scheduled" on the round being saved so a terminal
      // round with the same wall-clock still opens a new runId.
      const { rounds: nextRounds, changedRounds } = buildNextIvrRoundSchedule({
        incomingRounds,
        existingRounds,
      });

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            callRoundsSchedule: {
              enabled: true,
              rounds: nextRounds,
            },
          },
        }
      );

      await writeAdminAuditLog({
        adminUserId: String(auth.userId),
        adminName: cleanStr((admin as any)?.name),
        adminEmail: cleanStr((admin as any)?.email),
        managedUserId: String(user._id),
        managedUserName: cleanStr(user.name),
        managedUserEmail: cleanStr(user.email),
        eventId,
        invitationId: invitation ? String(invitation._id) : null,
        action: "admin_ivr_schedule_update",
        summary: `עדכון תזמון סבבי IVR עבור ${user.name || user.email}`,
        before: user.callRoundsSchedule || null,
        after: { enabled: true, rounds: nextRounds },
        meta: { changedRounds },
      });

      const refreshed = await loadIvrTarget(id);
      const payload = await buildRoundsPayload(refreshed, preferredInvitationId);
      const scheduledCount = nextRounds.filter(
        (r) => r.status === "scheduled"
      ).length;
      const executable =
        scheduledCount === 0 || payload.audioReady === true;
      const executeBlockReason = executable
        ? ""
        : payload.audioBlockReason ||
          "אין קריינות מאושרת — התזמון נשמר אבל לא יתבצע חיוג עד לאישור";
      return NextResponse.json({
        ok: true,
        ...payload,
        changedRounds,
        executable,
        executeBlockReason,
        message: executable
          ? undefined
          : `התזמון נשמר, אך לא יתבצע חיוג: ${executeBlockReason}`,
      });
    }

    if (![1, 2, 3].includes(round)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ROUND", message: "סבב לא תקין" },
        { status: 400 }
      );
    }

    if (
      action === "stop" ||
      action === "resume" ||
      action === "reopen" ||
      action === "reset" ||
      action === "block" ||
      action === "unblock" ||
      action === "repair_status"
    ) {
      const normalizedAction =
        action === "repair_status"
          ? "reopen"
          : action === "reset"
            ? "reopen"
            : action === "block"
              ? "block"
              : action === "unblock"
                ? "unblock"
                : action;

      const result = await setIvrRoundAdminStatus({
        userId: String(user._id),
        round,
        action: normalizedAction as
          | "stop"
          | "resume"
          | "reopen"
          | "block"
          | "unblock"
          | "reset",
        invitationId: invitation ? String(invitation._id) : undefined,
      });
      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }

      const auditAction =
        normalizedAction === "block" || normalizedAction === "stop"
          ? "admin_ivr_round_block"
          : normalizedAction === "unblock" || normalizedAction === "resume"
            ? "admin_ivr_round_unblock"
            : "admin_ivr_round_reopen";

      await writeAdminAuditLog({
        adminUserId: String(auth.userId),
        adminName: cleanStr((admin as any)?.name),
        adminEmail: cleanStr((admin as any)?.email),
        managedUserId: String(user._id),
        managedUserName: cleanStr(user.name),
        managedUserEmail: cleanStr(user.email),
        eventId,
        invitationId: invitation ? String(invitation._id) : null,
        action: auditAction,
        summary:
          auditAction === "admin_ivr_round_block"
            ? `חסימת סבב IVR ${round} עבור ${user.name || user.email}`
            : auditAction === "admin_ivr_round_unblock"
              ? `ביטול חסימת סבב IVR ${round} עבור ${user.name || user.email}`
              : `פתיחה מחדש של סבב IVR ${round} עבור ${user.name || user.email} (ללא חיוג)`,
        meta: { round, status: result.status, action: normalizedAction },
      });

      const refreshed = await loadIvrTarget(id);
      const payload = await buildRoundsPayload(refreshed, preferredInvitationId);
      return NextResponse.json({ ok: true, ...payload, actionResult: result });
    }

    if (action === "open" || action === "preview") {
      if (!eventInfo.eventActive) {
        return NextResponse.json(
          {
            ok: false,
            error: "EVENT_INACTIVE",
            message: eventInfo.eventBlockReason || "האירוע אינו פעיל",
            eventStatus: eventInfo.eventStatus,
          },
          { status: 400 }
        );
      }

      const reopenIfDone = body?.reopen === true || body?.reopenIfDone === true;

      if (action === "preview") {
        const payload = await buildRoundsPayload(user, preferredInvitationId);
        const row = payload.rounds.find((r) => r.round === round);
        const status = String(row?.status || "");
        const dialReady =
          Boolean(payload.eventActive) &&
          Boolean(payload.audioReady) &&
          !payload.liveDialDisabled &&
          !row?.blocked &&
          Number(row?.liveCount || 0) === 0 &&
          Number(row?.eligibleCount || 0) > 0;
        const statusAllowsOpen =
          status === "draft" ||
          status === "scheduled" ||
          (reopenIfDone &&
            (status === "done" ||
              status === "failed" ||
              status === "cancelled"));
        const canProceed = dialReady && statusAllowsOpen;
        return NextResponse.json({
          ok: true,
          preview: true,
          round,
          eligibleCount: row?.eligibleCount ?? 0,
          dialedCount: row?.dialedCount ?? 0,
          remainingCount: row?.remainingCount ?? 0,
          finalAnsweredCount: row?.finalAnsweredCount ?? 0,
          eligibility: row?.eligibility || null,
          status: row?.status,
          statusLabel: row?.statusLabel,
          statusMismatch: row?.statusMismatch || "",
          blocked: row?.blocked ?? false,
          canReset: row?.canReset ?? false,
          canBlock: row?.canBlock ?? false,
          canUnblock: row?.canUnblock ?? false,
          canProceed,
          blockReasons: row?.blockReasons ?? row?.dialGateNotes ?? [],
          dialGateNotes: row?.dialGateNotes ?? [],
          audioReady: payload.audioReady,
          audioBlockReason: payload.audioBlockReason,
          audioDiagnostics: payload.audioDiagnostics,
          canApproveAudio: payload.canApproveAudio,
          eventActive: payload.eventActive,
          eventBlockReason: payload.eventBlockReason,
          liveDialDisabled: payload.liveDialDisabled,
          reopenIfDone,
        });
      }

      const baseUrl = getAppBaseUrl();
      const webhookUrl =
        process.env.TELNYX_IVR_WEBHOOK_URL ||
        (baseUrl ? `${baseUrl}/api/telnyx/ivr/webhook` : "");

      if (!webhookUrl) {
        return NextResponse.json(
          {
            ok: false,
            error: "IVR_WEBHOOK_URL_MISSING",
            message: "חסר כתובת webhook לחיוג",
          },
          { status: 500 }
        );
      }

      const openResult = await openIvrRoundManually({
        userId: String(user._id),
        round,
        webhookUrl,
        maxCalls: Math.min(
          100,
          Math.max(1, Number(body?.maxCalls || 40))
        ),
        reopenIfDone,
      });

      await writeAdminAuditLog({
        adminUserId: String(auth.userId),
        adminName: cleanStr((admin as any)?.name),
        adminEmail: cleanStr((admin as any)?.email),
        managedUserId: String(user._id),
        managedUserName: cleanStr(user.name),
        managedUserEmail: cleanStr(user.email),
        eventId,
        invitationId: invitation ? String(invitation._id) : null,
        action: reopenIfDone
          ? "admin_ivr_round_reopen_open"
          : "admin_ivr_round_open",
        summary: openResult.ok
          ? `${reopenIfDone ? "פתיחה מחדש" : "פתיחה ידנית"} של סבב IVR ${round} עבור ${user.name || user.email} (${openResult.eligibleCount} זכאים)`
          : `ניסיון ${reopenIfDone ? "פתיחה מחדש" : "פתיחה ידנית"} של סבב IVR ${round} נחסם: ${openResult.message}`,
        meta: {
          round,
          ok: openResult.ok,
          reopenIfDone,
          error: openResult.ok ? null : openResult.error,
          eligibleCount: openResult.eligibleCount ?? null,
          dialed: openResult.ok
            ? (openResult.result as any)?.dialed ?? null
            : null,
        },
        after: openResult.ok ? openResult.result : openResult,
      });

      if (!openResult.ok) {
        return NextResponse.json(openResult, { status: 400 });
      }

      const refreshed = await loadIvrTarget(id);
      const payload = await buildRoundsPayload(refreshed, preferredInvitationId);
      return NextResponse.json({
        ok: true,
        ...payload,
        openResult,
      });
    }

    return NextResponse.json(
      { ok: false, error: "UNKNOWN_ACTION", message: "פעולה לא מוכרת" },
      { status: 400 }
    );
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }
    console.error("[admin/users/ivr-rounds POST]", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "FAILED" },
      { status: 500 }
    );
  }
}
