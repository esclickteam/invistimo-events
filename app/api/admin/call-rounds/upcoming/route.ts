import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LeanUser = {
  _id: any;
  name?: string;
  email?: string;
  role?: string;
  includeCalls?: boolean;
  callRoundsSchedule?: {
    rounds?: {
      roundNumber?: number;
      scheduledAt?: string | Date | null;
      sentAt?: string | Date | null;
      status?: string | null;
    }[];
  };
};

type LeanGuest = {
  _id: any;
  invitationId?: any;
  invitation?: any;
  rsvp?: string | null;
  status?: string | null;
  callRounds?: any[];
  allRounds?: any[];
};

function toDate(value: any) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function normalizeStatus(status: any) {
  return String(status || "").trim().toLowerCase();
}

function isRoundCancelled(round: any) {
  const status = normalizeStatus(round?.status);

  return (
    status === "cancelled" ||
    status === "canceled" ||
    status === "בוטל" ||
    status === "מבוטל"
  );
}

function getEventTitle(invitation: any) {
  return (
    invitation?.eventName ||
    invitation?.eventTitle ||
    invitation?.invitationTitle ||
    invitation?.title ||
    invitation?.name ||
    invitation?.coupleName ||
    "אירוע ללא שם"
  );
}

function getEventDate(invitation: any) {
  return (
    invitation?.eventDate ||
    invitation?.date ||
    invitation?.event?.date ||
    null
  );
}

function buildObjectIdOrString(value: any) {
  const id = String(value || "");
  if (!id) return [];

  const values: any[] = [id];

  if (mongoose.Types.ObjectId.isValid(id)) {
    values.push(new mongoose.Types.ObjectId(id));
  }

  return values;
}

function getGuestInvitationKey(guest: LeanGuest) {
  return String(guest?.invitationId || guest?.invitation || "");
}

function normalizeAnswerStatus(value: any) {
  const status = String(value || "").trim().toLowerCase();

  if (status === "answered" || status === "ענה") return "answered";
  if (status === "no_answer" || status === "לא ענה") return "no_answer";

  return "";
}

function getGuestRoundResult(guest: LeanGuest, roundNumber: number) {
  const rounds = [
    ...(Array.isArray(guest?.callRounds) ? guest.callRounds : []),
    ...(Array.isArray(guest?.allRounds) ? guest.allRounds : []),
  ];

  const matchingRounds = rounds
    .filter((round: any) => Number(round?.roundNumber || 0) === roundNumber)
    .sort((a: any, b: any) => {
      const aTime = toDate(a?.updatedAt || a?.calledAt)?.getTime() || 0;
      const bTime = toDate(b?.updatedAt || b?.calledAt)?.getTime() || 0;
      return bTime - aTime;
    });

  const latest = matchingRounds[0];

  if (!latest) return "";

  return (
    normalizeAnswerStatus(latest?.answerStatus) ||
    normalizeAnswerStatus(latest?.status)
  );
}

function getCallRoundStats(guests: LeanGuest[], roundNumber: number) {
  let guestsDone = 0;
  let guestsWaiting = 0;

  for (const guest of guests || []) {
    const roundResult = getGuestRoundResult(guest, roundNumber);
    const rsvp = normalizeStatus(guest?.rsvp || guest?.status || "pending");

    /*
      בוצע = רק אם במעקב הטלפוני של אותו סבב סימנו:
      answerStatus/status = answered או no_answer.
      אישור הגעה רגיל / RSVP לבד לא נחשב "בוצע" בסבב שיחות.
    */
    if (roundResult === "answered" || roundResult === "no_answer") {
      guestsDone += 1;
      continue;
    }

    /*
      ממתינים = מי שעדיין צריך טיפול טלפוני בסבב הזה.
      מי שכבר אישר/סירב בערוץ אחר ולא סומן בסבב — לא נספר כממתין.
    */
    if (rsvp === "pending" || rsvp === "בהמתנה" || !rsvp) {
      guestsWaiting += 1;
    }
  }

  return {
    guestsWaiting,
    guestsDone,
  };
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const auth: any = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const currentUser = await User.findById(auth.userId)
      .select("_id role")
      .lean();

    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "אין הרשאת אדמין",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(
      30,
      Math.max(1, Number(searchParams.get("days") || 7))
    );

    const todayStart = startOfToday();
    const tomorrowStart = addDays(todayStart, 1);
    const afterTomorrowStart = addDays(todayStart, 2);
    const rangeEnd = addDays(todayStart, days + 1);

    const users = (await User.find({
      $or: [
        { includeCalls: true },
        { "callRoundsSchedule.rounds.scheduledAt": { $exists: true } },
      ],
    })
      .select(
        "_id name email includeCalls callRoundsSchedule role packageName eventDate"
      )
      .lean()) as LeanUser[];

    const usersWithRelevantRounds = users.filter((user) => {
      const rounds = user?.callRoundsSchedule?.rounds || [];

      return rounds.some((round) => {
        const scheduledAt = toDate(round?.scheduledAt);
        if (!scheduledAt) return false;
        if (isRoundCancelled(round)) return false;

        return scheduledAt >= todayStart && scheduledAt < rangeEnd;
      });
    });

    if (!usersWithRelevantRounds.length) {
      return NextResponse.json({
        success: true,
        total: 0,
        today: 0,
        tomorrow: 0,
        week: 0,
        rounds: [],
      });
    }

    const userIds = usersWithRelevantRounds.map((user) => user._id);

    const invitations = await Invitation.find({
      ownerId: { $in: userIds },
    })
      .select(
        "_id ownerId eventName eventTitle invitationTitle title name coupleName eventDate date createdAt"
      )
      .sort({ eventDate: 1, createdAt: -1 })
      .lean();

    const invitationByOwner = new Map<string, any>();

    for (const invitation of invitations) {
      const ownerId = String(invitation?.ownerId || "");
      if (!ownerId) continue;

      if (!invitationByOwner.has(ownerId)) {
        invitationByOwner.set(ownerId, invitation);
      }
    }

    const guestsByInvitation = new Map<string, LeanGuest[]>();
    const invitationIds = invitations.map((invitation) => invitation._id);

    if (invitationIds.length) {
      const invitationMatchValues = invitationIds.flatMap((id: any) =>
        buildObjectIdOrString(id)
      );

      const guests = (await InvitationGuest.find({
        $or: [
          { invitationId: { $in: invitationMatchValues } },
          { invitation: { $in: invitationMatchValues } },
        ],
      })
        .select("_id invitationId invitation rsvp status callRounds allRounds")
        .lean()) as LeanGuest[];

      for (const guest of guests || []) {
        const invitationKey = getGuestInvitationKey(guest);
        if (!invitationKey) continue;

        const current = guestsByInvitation.get(invitationKey) || [];
        current.push(guest);
        guestsByInvitation.set(invitationKey, current);
      }
    }

    const rounds: any[] = [];

    for (const user of usersWithRelevantRounds) {
      const ownerId = String(user._id);
      const invitation = invitationByOwner.get(ownerId);
      const invitationId = invitation?._id ? String(invitation._id) : "";
      const invitationGuests = invitationId
        ? guestsByInvitation.get(invitationId) || []
        : [];

      const userRounds = user?.callRoundsSchedule?.rounds || [];

      for (const round of userRounds) {
        const scheduledAt = toDate(round?.scheduledAt);
        if (!scheduledAt) continue;
        if (isRoundCancelled(round)) continue;
        if (scheduledAt < todayStart || scheduledAt >= rangeEnd) continue;

        const roundNumber = Number(round?.roundNumber || 0);
        const stats = getCallRoundStats(invitationGuests, roundNumber);

        rounds.push({
          id: `${ownerId}_${roundNumber}_${scheduledAt.getTime()}`,
          userId: ownerId,
          invitationId,
          clientName: user.name || user.email || "לקוח ללא שם",
          clientEmail: user.email || "",
          eventName: getEventTitle(invitation),
          eventDate: getEventDate(invitation),
          roundNumber,
          scheduledAt: scheduledAt.toISOString(),
          status: normalizeStatus(round?.status) || "scheduled",
          guestsWaiting: stats.guestsWaiting,
          guestsDone: stats.guestsDone,
        });
      }
    }

    rounds.sort((a, b) => {
      return (
        new Date(a.scheduledAt).getTime() -
        new Date(b.scheduledAt).getTime()
      );
    });

    const today = rounds.filter((round) =>
      isSameDay(new Date(round.scheduledAt), todayStart)
    ).length;

    const tomorrow = rounds.filter((round) => {
      const scheduledAt = new Date(round.scheduledAt);
      return scheduledAt >= tomorrowStart && scheduledAt < afterTomorrowStart;
    }).length;

    return NextResponse.json({
      success: true,
      total: rounds.length,
      today,
      tomorrow,
      week: rounds.length,
      rounds,
    });
  } catch (error: any) {
    console.error("❌ GET /api/admin/call-rounds/upcoming error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Server error",
      },
      { status: 500 }
    );
  }
}
