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
import { filterGuestsForIvrRound } from "@/lib/calls/ivrRoundEligibility";
import {
  formatCallRoundDateTimeDmy,
  formatCallRoundDateTimeInput,
  normalizeCallRoundScheduledAtForSave,
  parseCallRoundScheduledAt,
} from "@/lib/calls/callRoundScheduleTime";
import { getAppBaseUrl } from "@/lib/calls/ivrAudioStorage";
import {
  openIvrRoundManually,
  resolveIvrRoundAudio,
  setIvrRoundAdminStatus,
} from "@/lib/calls/ivrDialer";
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

async function buildRoundsPayload(user: any) {
  const invitation = await Invitation.findOne({ ownerId: user._id })
    .select("_id")
    .sort({ eventDate: 1, createdAt: -1 })
    .lean();

  const event = await Event.findOne({
    userId: user._id,
    status: "active",
  })
    .select("_id status")
    .sort({ date: -1 })
    .lean();

  const audio = resolveIvrRoundAudio(user);
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

  const liveDialDisabled = process.env.IVR_ALLOW_LIVE_DIAL === "false";
  const eventActive = Boolean(event) && user.isActive !== false;

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
    const eligibleNow = filterGuestsForIvrRound({
      guests,
      round: round as 1 | 2 | 3,
    });
    const remaining = Math.max(0, eligibleNow.length);
    const dialed = roundAttempts.length;
    const canOpen =
      eventActive &&
      audio.audioReady &&
      remaining > 0 &&
      !liveDialDisabled &&
      (executionStatus === "draft" || executionStatus === "scheduled");
    const canStop =
      executionStatus === "in_progress" ||
      executionStatus === "scheduled" ||
      executionStatus === "draft";
    const canResume =
      executionStatus === "cancelled" || executionStatus === "failed";

    const blockReasons: string[] = [];
    if (!eventActive) blockReasons.push("האירוע אינו פעיל");
    if (!audio.audioReady) {
      blockReasons.push(audio.audioBlockReason || "אין קריינות מאושרת ונגישה");
    }
    if (remaining < 1) blockReasons.push("אין אורחים זכאים לחיוג");
    if (liveDialDisabled) blockReasons.push("חיוגים מושבתים זמנית במערכת");
    if (executionStatus === "done") blockReasons.push("הסבב כבר הושלם");
    if (executionStatus === "failed") {
      blockReasons.push("הסבב נכשל — לחצו חידוש לפני פתיחה");
    }
    if (executionStatus === "in_progress") {
      blockReasons.push("הסבב כבר מתבצע");
    }
    if (executionStatus === "cancelled") blockReasons.push("הסבב נעצר");

    return {
      round,
      title: `סבב ${round} — שיחות אישורי הגעה`,
      status: executionStatus,
      statusLabel: statusLabel(executionStatus),
      failureReason: scheduleRound?.failureReason
        ? explainIvrCallFailure(String(scheduleRound.failureReason))
        : "",
      scheduledAt: scheduleRound?.scheduledAt || null,
      scheduledAtInput: formatCallRoundDateTimeInput(scheduleRound?.scheduledAt),
      scheduledAtDisplay: formatCallRoundDateTimeDmy(scheduleRound?.scheduledAt),
      eligibleCount: eligibleNow.length,
      dialedCount: dialed,
      remainingCount: remaining,
      canOpen,
      canStop,
      canResume,
      blockReasons,
    };
  });

  return {
    invitationId: invitation ? String(invitation._id) : null,
    eventActive,
    audioReady: audio.audioReady,
    audioBlockReason: audio.audioBlockReason || "",
    liveDialDisabled,
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

    const payload = await buildRoundsPayload(user);
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
    const invitation = await Invitation.findOne({ ownerId: user._id })
      .select("_id")
      .sort({ eventDate: 1, createdAt: -1 })
      .lean();
    const event = await Event.findOne({
      userId: user._id,
      status: "active",
    })
      .select("_id")
      .sort({ date: -1 })
      .lean();

    if (action === "schedule") {
      const incomingRounds = Array.isArray(body?.rounds) ? body.rounds : [];
      const existingRounds = Array.isArray(user.callRoundsSchedule?.rounds)
        ? user.callRoundsSchedule.rounds
        : [];

      const nextRounds = [1, 2, 3].map((roundNumber) => {
        const incoming = incomingRounds.find(
          (r: any) => Number(r?.roundNumber || r?.round) === roundNumber
        );
        const existing = existingRounds.find(
          (r: any) => Number(r?.roundNumber || r?.round) === roundNumber
        );

        const scheduledAtIso = normalizeCallRoundScheduledAtForSave(
          incoming?.scheduledAt ?? existing?.scheduledAt ?? null
        );
        const scheduledAt = scheduledAtIso
          ? parseCallRoundScheduledAt(scheduledAtIso)
          : null;

        const previousScheduled = existing?.scheduledAt
          ? new Date(existing.scheduledAt).getTime()
          : null;
        const nextScheduled = scheduledAt ? scheduledAt.getTime() : null;
        const scheduleChanged = previousScheduled !== nextScheduled;

        const existingStatus = String(existing?.status || "").toLowerCase();
        const preserveTerminal =
          !scheduleChanged &&
          ["done", "completed", "in_progress", "opened", "failed"].includes(
            existingStatus
          );

        return {
          roundNumber,
          title:
            String(incoming?.title || existing?.title || "").trim() ||
            `סבב מוקלט ${roundNumber}`,
          scheduledAt,
          callType: "ivr" as const,
          status: preserveTerminal
            ? existingStatus
            : scheduleChanged
              ? scheduledAt
                ? "scheduled"
                : "cancelled"
              : existing?.status || (scheduledAt ? "scheduled" : "draft"),
          notes: String(incoming?.notes || existing?.notes || ""),
          failureReason: scheduleChanged ? "" : existing?.failureReason || "",
          dialClaimedAt: scheduleChanged ? null : existing?.dialClaimedAt || null,
          openedAt: scheduleChanged ? null : existing?.openedAt || null,
          tasksCreated: scheduleChanged ? null : existing?.tasksCreated ?? null,
          updatedAt: new Date(),
          createdAt: existing?.createdAt || new Date(),
        };
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
        eventId: event ? String((event as any)._id) : null,
        invitationId: invitation ? String(invitation._id) : null,
        action: "admin_ivr_schedule_update",
        summary: `עדכון תזמון סבבי IVR עבור ${user.name || user.email}`,
        before: user.callRoundsSchedule || null,
        after: { enabled: true, rounds: nextRounds },
      });

      const refreshed = await loadIvrTarget(id);
      const payload = await buildRoundsPayload(refreshed);
      return NextResponse.json({ ok: true, ...payload });
    }

    if (![1, 2, 3].includes(round)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ROUND", message: "סבב לא תקין" },
        { status: 400 }
      );
    }

    if (action === "stop" || action === "resume") {
      const result = await setIvrRoundAdminStatus({
        userId: String(user._id),
        round,
        action,
      });
      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }

      await writeAdminAuditLog({
        adminUserId: String(auth.userId),
        adminName: cleanStr((admin as any)?.name),
        adminEmail: cleanStr((admin as any)?.email),
        managedUserId: String(user._id),
        managedUserName: cleanStr(user.name),
        managedUserEmail: cleanStr(user.email),
        eventId: event ? String((event as any)._id) : null,
        invitationId: invitation ? String(invitation._id) : null,
        action:
          action === "stop" ? "admin_ivr_round_stop" : "admin_ivr_round_resume",
        summary:
          action === "stop"
            ? `עצירת סבב IVR ${round} עבור ${user.name || user.email}`
            : `חידוש סבב IVR ${round} עבור ${user.name || user.email}`,
        meta: { round, status: result.status },
      });

      const refreshed = await loadIvrTarget(id);
      const payload = await buildRoundsPayload(refreshed);
      return NextResponse.json({ ok: true, ...payload, actionResult: result });
    }

    if (action === "open" || action === "preview") {
      if (!event || user.isActive === false) {
        return NextResponse.json(
          {
            ok: false,
            error: "EVENT_INACTIVE",
            message: "האירוע אינו פעיל",
          },
          { status: 400 }
        );
      }

      if (action === "preview") {
        const payload = await buildRoundsPayload(user);
        const row = payload.rounds.find((r) => r.round === round);
        return NextResponse.json({
          ok: true,
          preview: true,
          round,
          eligibleCount: row?.eligibleCount ?? 0,
          canOpen: row?.canOpen ?? false,
          blockReasons: row?.blockReasons ?? [],
          audioReady: payload.audioReady,
          liveDialDisabled: payload.liveDialDisabled,
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
      });

      await writeAdminAuditLog({
        adminUserId: String(auth.userId),
        adminName: cleanStr((admin as any)?.name),
        adminEmail: cleanStr((admin as any)?.email),
        managedUserId: String(user._id),
        managedUserName: cleanStr(user.name),
        managedUserEmail: cleanStr(user.email),
        eventId: event ? String((event as any)._id) : null,
        invitationId: invitation ? String(invitation._id) : null,
        action: "admin_ivr_round_open",
        summary: openResult.ok
          ? `פתיחה ידנית של סבב IVR ${round} עבור ${user.name || user.email} (${openResult.eligibleCount} זכאים)`
          : `ניסיון פתיחה ידנית של סבב IVR ${round} נחסם: ${openResult.message}`,
        meta: {
          round,
          ok: openResult.ok,
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
      const payload = await buildRoundsPayload(refreshed);
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
