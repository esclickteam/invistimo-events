import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import { requireSeating } from "@/lib/guards/requireSeating";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** ⭐ Next.js 16 — params הוא Promise */
type RouteContext = {
  params: Promise<{ eventId: string }>;
};

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

function createIdQueries({
  eventId,
  invitationId,
}: {
  eventId: string;
  invitationId?: string | null;
}) {
  const queries: any[] = [];

  const cleanEventId = cleanString(eventId);
  const cleanInvitationId = cleanString(invitationId);

  const eventObjectId = toObjectId(cleanEventId);
  const invitationObjectId = toObjectId(cleanInvitationId);

  if (cleanEventId) {
    queries.push({ eventId: cleanEventId });
    queries.push({ invitationId: cleanEventId });

    if (eventObjectId) {
      queries.push({ eventId: eventObjectId });
      queries.push({ invitationId: eventObjectId });
    }
  }

  if (cleanInvitationId) {
    queries.push({ invitationId: cleanInvitationId });
    queries.push({ eventId: cleanInvitationId });

    if (invitationObjectId) {
      queries.push({ invitationId: invitationObjectId });
      queries.push({ eventId: invitationObjectId });
    }
  }

  return queries;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    /* 🔐 Guard אחיד – הרשאת הושבה */
    const guard = await requireSeating();

    if (!guard.ok) {
      return guard.response!;
    }

    /* ===============================
       1️⃣ params
    =============================== */
    const { eventId } = await context.params;

    const cleanEventId = cleanString(eventId);

    if (!cleanEventId) {
      return NextResponse.json(
        { success: false, error: "Missing eventId" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const invitationId = cleanString(searchParams.get("invitationId"));

    console.log("📤 LOAD SEATING TABLES:", {
      eventId: cleanEventId,
      invitationId: invitationId || null,
    });

    /* ===============================
       2️⃣ שליפת הושבה
       תומך גם בהושבה שנוצרה מתבנית אולם
       וגם בשמירה רגילה של הלקוח.
    =============================== */

    const idQueries = createIdQueries({
      eventId: cleanEventId,
      invitationId,
    });

    const record = await SeatingTable.findOne({
      $or: idQueries,
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    console.log("📦 RECORD FOUND:", {
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

    /* ===============================
       3️⃣ החזרה מלאה לפרונט
    =============================== */
    return NextResponse.json({
      success: true,

      seatingRecordId: record?._id ? String(record._id) : null,
      source: record?.source ?? null,
      sourceTemplateId: record?.sourceTemplateId
        ? String(record.sourceTemplateId)
        : null,

      tables: Array.isArray(record?.tables) ? record.tables : [],
      background: record?.background ?? null,
      zones: Array.isArray(record?.zones) ? record.zones : [],
      canvasView: record?.canvasView ?? null,
    });
  } catch (err: any) {
    console.error("❌ Load seating tables error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Server error",
      },
      { status: 500 }
    );
  }
}