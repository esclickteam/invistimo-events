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

function isRoundDoneOrCancelled(round: any) {
  const status = normalizeStatus(round?.status);

  return (
    Boolean(round?.sentAt) ||
    status === "done" ||
    status === "sent" ||
    status === "בוצע" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "בוטל"
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

    /*
      מחפשים את כל המשתמשים שיש להם שירות שיחות פעיל
      או שיש להם לוח סבבי שיחות שמור.
    */
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
        if (isRoundDoneOrCancelled(round)) return false;

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

    /*
      לכל לקוח נשלוף הזמנה פעילה/אחרונה.
      אם יש כמה הזמנות — ניקח את הקרובה ביותר לפי תאריך אירוע,
      כדי שההתראה תיפתח על האירוע הרלוונטי.
    */
    const invitations = await Invitation.find({
      ownerId: { $in: userIds },
    })
      .select(
        "_id ownerId eventName eventTitle invitationTitle title name coupleName eventDate date"
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

    const guestStatsByInvitation = new Map<
      string,
      { guestsWaiting: number; guestsDone: number }
    >();

    const invitationIds = invitations.map((invitation) => invitation._id);

    if (invitationIds.length) {
      const invitationMatchValues = invitationIds.flatMap((id: any) =>
        buildObjectIdOrString(id)
      );

      const guestStats = await InvitationGuest.aggregate([
        {
          $match: {
            invitationId: { $in: invitationMatchValues },
          },
        },
        {
          $group: {
            _id: "$invitationId",
            guestsWaiting: {
              $sum: {
                $cond: [{ $eq: ["$rsvp", "pending"] }, 1, 0],
              },
            },
            guestsDone: {
              $sum: {
                $cond: [{ $ne: ["$rsvp", "pending"] }, 1, 0],
              },
            },
          },
        },
      ]);

      for (const item of guestStats || []) {
        guestStatsByInvitation.set(String(item._id), {
          guestsWaiting: Number(item.guestsWaiting || 0),
          guestsDone: Number(item.guestsDone || 0),
        });
      }
    }

    const rounds: any[] = [];

    for (const user of usersWithRelevantRounds) {
      const ownerId = String(user._id);
      const invitation = invitationByOwner.get(ownerId);

      const userRounds = user?.callRoundsSchedule?.rounds || [];

      for (const round of userRounds) {
        const scheduledAt = toDate(round?.scheduledAt);
        if (!scheduledAt) continue;
        if (isRoundDoneOrCancelled(round)) continue;
        if (scheduledAt < todayStart || scheduledAt >= rangeEnd) continue;

        const invitationId = invitation?._id ? String(invitation._id) : "";
        const stats = guestStatsByInvitation.get(invitationId) || {
          guestsWaiting: 0,
          guestsDone: 0,
        };

        rounds.push({
          id: `${ownerId}_${Number(round?.roundNumber || 0)}_${scheduledAt.getTime()}`,
          userId: ownerId,
          invitationId,
          clientName: user.name || user.email || "לקוח ללא שם",
          clientEmail: user.email || "",
          eventName: getEventTitle(invitation),
          eventDate: getEventDate(invitation),
          roundNumber: Number(round?.roundNumber || 0),
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
