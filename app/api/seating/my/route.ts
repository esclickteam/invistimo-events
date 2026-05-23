import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import { requireSeating } from "@/lib/guards/requireSeating";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    /*
      הרשאת הושבה:
      אם למשתמש אין הרשאה להושבה — נחזיר את אותה חסימה כמו שאר מערכת ההושבה.
    */
    const guard = await requireSeating();

    if (!guard.ok) {
      return guard.response!;
    }

    /*
      המשתמש המחובר:
      כאן אנחנו לא מחפשים הזמנה.
      אנחנו מחפשים ישירות את ההושבה ששייכת למשתמש.
    */
    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      );
    }

    const userId = cleanString(auth.userId);
    const userObjectId = toObjectId(userId);

    if (!userId || !userObjectId) {
      return NextResponse.json(
        { success: false, error: "מזהה משתמש לא תקין" },
        { status: 400 }
      );
    }

    console.log("📤 LOAD MY SEATING:", {
      userId,
    });

    /*
      שליפה ישירה לפי userId:
      זה מתאים בדיוק ללקוח אולם, כי ב-seatingtables כבר יש:
      userId
      eventId
      invitationId
      source: "venue_seating_template"
      tables
      zones
      background
      canvasView
    */
    const record = await SeatingTable.findOne({
      $or: [
        { userId: userObjectId },
        { userId },
      ],
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    console.log("📦 MY SEATING FOUND:", {
      hasRecord: !!record,
      recordId: record?._id ? String(record._id) : null,
      source: record?.source ?? null,
      sourceTemplateId: record?.sourceTemplateId
        ? String(record.sourceTemplateId)
        : null,
      eventId: record?.eventId ? String(record.eventId) : null,
      invitationId: record?.invitationId ? String(record.invitationId) : null,
      tables: Array.isArray(record?.tables) ? record.tables.length : 0,
      zones: Array.isArray(record?.zones) ? record.zones.length : 0,
      hasBackground: !!record?.background,
      canvasView: record?.canvasView ?? null,
    });

    return NextResponse.json({
      success: true,

      seatingRecordId: record?._id ? String(record._id) : null,

      eventId: record?.eventId ? String(record.eventId) : null,
      invitationId: record?.invitationId ? String(record.invitationId) : null,

      source: record?.source ?? null,
      sourceTemplateId: record?.sourceTemplateId
        ? String(record.sourceTemplateId)
        : null,

      tables: Array.isArray(record?.tables) ? record.tables : [],
      background: record?.background ?? null,
      zones: Array.isArray(record?.zones) ? record.zones : [],
      canvasView: record?.canvasView ?? null,

      venueHallId: record?.venueHallId ?? null,
      venueHallName: record?.venueHallName ?? null,
    });
  } catch (error: any) {
    console.error("❌ GET /api/seating/my error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בשליפת ההושבה",
      },
      { status: 500 }
    );
  }
}