import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import { KOSHER_MESSAGE_ROUND_ORIGIN } from "@/lib/kosherPhones/match";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAdmin(auth: Awaited<ReturnType<typeof getUserIdFromRequest>>) {
  return Boolean(auth && auth.role === "admin" && !auth.impersonated);
}

export async function GET(req: NextRequest) {
  try {
    await db();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdmin(auth)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const userId = String(req.nextUrl.searchParams.get("userId") || "").trim();
    const filter: Record<string, unknown> = { origin: KOSHER_MESSAGE_ROUND_ORIGIN };
    if (userId) filter.userId = userId;

    const attempts = await IvrCallAttempt.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .select(
        "userId invitationId guestId round phone status answered rsvpResult rsvpApplied error startedAt endedAt createdAt"
      )
      .lean();

    const userIds = [...new Set(attempts.map((row) => String(row.userId)))];
    const invitationIds = [...new Set(attempts.map((row) => String(row.invitationId)))];
    const [users, invitations] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select("name email kosherRecordedCallsEnabled").lean(),
      Invitation.find({ _id: { $in: invitationIds } }).select("title").lean(),
    ]);
    const userById = new Map(users.map((user) => [String(user._id), user]));
    const invitationById = new Map(
      invitations.map((invitation) => [String(invitation._id), invitation])
    );

    return NextResponse.json({
      success: true,
      attempts: attempts.map((row) => {
        const user = userById.get(String(row.userId));
        const invitation = invitationById.get(String(row.invitationId));
        return {
          id: String(row._id),
          userId: String(row.userId),
          customerName: String(user?.name || user?.email || ""),
          serviceEnabled: user?.kosherRecordedCallsEnabled === true,
          invitationId: String(row.invitationId),
          eventName: String(invitation?.title || ""),
          guestId: String(row.guestId),
          round: row.round,
          phone: row.phone,
          status: row.status,
          answered: row.answered === true,
          rsvpResult: row.rsvpResult || null,
          rsvpApplied: row.rsvpApplied === true,
          error: row.error || "",
          createdAt: row.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error("kosher call activity failed", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
