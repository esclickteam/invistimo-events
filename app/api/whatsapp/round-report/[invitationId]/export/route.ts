import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import {
  buildWhatsappReportFileName,
  buildWhatsappRoundReportWorkbook,
  type ExcelGuestSummary,
  type ExcelReportGuest,
  type ExcelReportRound,
} from "@/lib/whatsapp/exportRoundReportExcel";

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
      .select("_id role")
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
      .select("_id ownerId userId createdBy producerId title eventDate")
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

    const summary = body?.summary as ExcelGuestSummary | undefined;
    const rounds = Array.isArray(body?.rounds)
      ? (body.rounds as ExcelReportRound[])
      : [];
    const allGuests = Array.isArray(body?.allGuests)
      ? (body.allGuests as ExcelReportGuest[])
      : [];
    const guestsForSheets = Array.isArray(body?.guestsForSheets)
      ? (body.guestsForSheets as ExcelReportGuest[])
      : allGuests;

    if (!summary || typeof summary.totalGuests !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_PAYLOAD",
          message: "חסר סיכום דוח לייצוא.",
        },
        { status: 400 }
      );
    }

    const invitationTitle =
      String(body?.invitationTitle || invitation.title || "").trim() ||
      "אירוע";
    const eventDate =
      body?.eventDate || invitation.eventDate || null;
    const clientName = body?.clientName || null;
    const selectedRoundKey = body?.selectedRoundKey || "all";
    const selectedRoundTitle = body?.selectedRoundTitle || null;
    const generatedAt = body?.generatedAt || new Date().toISOString();

    const workbook = await buildWhatsappRoundReportWorkbook({
      summary,
      rounds,
      allGuests,
      guestsForSheets,
      invitationTitle,
      eventDate,
      clientName,
      selectedRoundKey,
      selectedRoundTitle,
      generatedAt,
    });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const fileName = buildWhatsappReportFileName({
      invitationTitle,
      eventDate,
      generatedAt,
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("❌ WHATSAPP REPORT EXCEL EXPORT ERROR:", error);
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
