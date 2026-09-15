import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { buildSmsRoundReportData } from "@/lib/sms4free/buildRoundReportData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    invitationId: string;
  }>;
};

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

function isSameId(a: any, b: any) {
  if (!a || !b) return false;
  return String(a) === String(b);
}

function isAdminRole(role: any) {
  const normalizedRole = String(role || "").toLowerCase();
  return ["admin", "superadmin", "staff", "support", "manager"].includes(
    normalizedRole
  );
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return noStoreJson(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "לא נמצאה התחברות תקינה.",
        },
        401
      );
    }

    const user: any = await User.findById(auth.userId)
      .select("_id role email name")
      .lean();

    if (!user) {
      return noStoreJson(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "לא נמצאה התחברות תקינה.",
        },
        401
      );
    }

    const { invitationId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return noStoreJson(
        {
          success: false,
          error: "INVALID_INVITATION_ID",
          message: "מזהה ההזמנה לא תקין.",
        },
        400
      );
    }

    const invitationObjectId = new mongoose.Types.ObjectId(invitationId);
    const invitation: any = await Invitation.findById(invitationObjectId)
      .select(
        "_id ownerId userId createdBy producerId title eventDate reminderSentAt rsvpSmsRound1SentAt rsvpSmsRound2SentAt rsvpSmsRound3SentAt rsvpSmsRound1ScheduledAt rsvpSmsRound2ScheduledAt rsvpSmsRound3ScheduledAt rsvpRoundSent rsvpRoundsSent"
      )
      .lean();

    if (!invitation) {
      return noStoreJson(
        {
          success: false,
          error: "INVITATION_NOT_FOUND",
          message: "ההזמנה לא נמצאה.",
        },
        404
      );
    }

    const isAdmin =
      isAdminRole(user.role) ||
      isAdminRole(auth.role) ||
      Boolean(auth.impersonatedByAdmin) ||
      auth.impersonationRole === "admin";

    const isOwner =
      isSameId(invitation.ownerId, user._id) ||
      isSameId(invitation.userId, user._id) ||
      isSameId(invitation.createdBy, user._id) ||
      isSameId(invitation.producerId, user._id);

    if (!isAdmin && !isOwner) {
      return noStoreJson(
        {
          success: false,
          error: "FORBIDDEN",
          message: "אין הרשאה לצפות בדוח הזה.",
        },
        403
      );
    }

    const url = new URL(req.url);
    const data = await buildSmsRoundReportData({
      invitation,
      invitationId,
      isAdmin,
      filters: {
        round: url.searchParams.get("round") || "all",
        status: url.searchParams.get("status") || "all",
        rsvp: url.searchParams.get("rsvp") || "all",
        messageCount: url.searchParams.get("messageCount") || "all",
        search: url.searchParams.get("search") || "",
        page: Math.max(1, Number(url.searchParams.get("page") || 1)),
        pageSize: Number(url.searchParams.get("pageSize") || 0),
        includeHistory: url.searchParams.get("includeHistory") !== "0",
        guestId: url.searchParams.get("guestId"),
      },
    });

    if (url.searchParams.get("guestId")) {
      return noStoreJson({
        success: true,
        isAdmin,
        invitation: data.invitation,
        guest: data.guest || null,
        lastUpdated: data.lastUpdated,
        capabilities: data.capabilities,
        provider: data.provider,
      });
    }

    return noStoreJson({
      success: true,
      isAdmin,
      ...data,
      totalGuests: data.pagination.unfilteredTotal,
      view: "guest_centric",
    });
  } catch (error: any) {
    console.error("❌ SMS4FREE ROUND REPORT ERROR:", error);
    return noStoreJson(
      {
        success: false,
        error: error?.message || "REPORT_FAILED",
        message: "טעינת דוח SMS נכשלה.",
      },
      500
    );
  }
}
