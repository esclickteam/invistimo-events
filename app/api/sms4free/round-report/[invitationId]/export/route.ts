import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { buildSmsRoundReportData } from "@/lib/sms4free/buildRoundReportData";
import {
  applySmsReportGuestFilters,
  summarizeSmsGuests,
} from "@/lib/sms4free/roundReport";
import {
  buildSmsReportFileName,
  buildSmsRoundReportWorkbook,
  workbookToNodeBuffer,
} from "@/lib/sms4free/exportRoundReportExcel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    invitationId: string;
  }>;
};

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

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "לא מחובר." },
        { status: 401 }
      );
    }

    const user: any = await User.findById(auth.userId)
      .select("_id role name email")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "לא מחובר." },
        { status: 401 }
      );
    }

    const { invitationId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_INVITATION_ID",
          message: "מזהה הזמנה לא תקין.",
        },
        { status: 400 }
      );
    }

    const invitation: any = await Invitation.findById(invitationId)
      .select(
        "_id ownerId userId createdBy producerId title eventDate reminderSentAt rsvpSmsRound1SentAt rsvpSmsRound2SentAt rsvpSmsRound3SentAt rsvpSmsRound1ScheduledAt rsvpSmsRound2ScheduledAt rsvpSmsRound3ScheduledAt rsvpRoundSent rsvpRoundsSent"
      )
      .lean();

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "INVITATION_NOT_FOUND",
          message: "ההזמנה לא נמצאה.",
        },
        { status: 404 }
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
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "אין הרשאה." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const selectedRoundKey = String(
      body?.round || body?.selectedRoundKey || "all"
    );
    const status = String(body?.status || "all");
    const rsvp = String(body?.rsvp || "all");
    const messageCount = String(body?.messageCount || "all");
    const search = String(body?.search || "");
    const clientName = body?.clientName || user.name || user.email || null;
    const generatedAt = new Date().toISOString();

    // Full re-aggregation server-side (no client payload as source of truth).
    const reportData = await buildSmsRoundReportData({
      invitation,
      invitationId,
      isAdmin,
      filters: {
        includeHistory: true,
        // No pageSize => ALL guests for Excel.
      },
    });

    const rounds = Array.isArray(reportData.rounds) ? reportData.rounds : [];
    const allGuests = Array.isArray(reportData.guests) ? reportData.guests : [];
    const invitationTitle =
      String(reportData.invitation?.title || invitation.title || "").trim() ||
      "אירוע";
    const eventDate =
      reportData.invitation?.eventDate || invitation.eventDate || null;
    const selectedRoundTitle =
      selectedRoundKey === "all"
        ? "כל הסבבים"
        : rounds.find((round: any) => round.key === selectedRoundKey)?.title ||
          selectedRoundKey;

    const guestsForSheets = applySmsReportGuestFilters(allGuests, {
      roundKey: selectedRoundKey,
      status,
      rsvp,
      messageCount,
      search,
    });

    // Summary / RSVP in Excel must match the exported filter context (not UI page).
    const summary = summarizeSmsGuests(guestsForSheets);
    const roundsForExcel =
      selectedRoundKey === "all"
        ? rounds
        : rounds.filter((round: any) => round.key === selectedRoundKey);

    if (typeof summary.totalGuests !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_REPORT",
          message: "סיכום הדוח לייצוא אינו תקין.",
        },
        { status: 500 }
      );
    }

    const workbook = await buildSmsRoundReportWorkbook({
      summary,
      rounds: roundsForExcel,
      allGuests: guestsForSheets,
      guestsForSheets,
      invitationTitle,
      eventDate,
      clientName,
      selectedRoundKey,
      selectedRoundTitle,
      generatedAt,
    });

    const buffer = await workbookToNodeBuffer(workbook);
    const fileName = buildSmsReportFileName({
      invitationTitle,
      eventDate,
      generatedAt,
    });
    const asciiName = fileName.replace(/[^\x20-\x7E]+/g, "_");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (error: any) {
    console.error("❌ SMS REPORT EXCEL EXPORT ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "EXPORT_FAILED",
        message: "ייצוא הדוח לאקסל נכשל.",
      },
      { status: 500 }
    );
  }
}
