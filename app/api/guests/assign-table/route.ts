import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import SeatingTable from "@/models/SeatingTable";

type Body = {
  guestId?: string;
  invitationId?: string; // מומלץ לשלוח מהלקוח
  tableId?: string;      // tables[].id (uuid/string) מתוך SeatingTable
  tableName?: string;    // אופציונלי - אם לא נשלח ניקח מהשולחן עצמו
  tableNumber?: number;  // אופציונלי - אם לא נשלח ננסה לגזור מהשם
  seatIndex?: number | null; // אם null - ננקה
};

function isValidObjectId(id?: string) {
  return !!id && mongoose.Types.ObjectId.isValid(id);
}

function normalizeTableNumber(input: unknown): number | undefined {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  return undefined;
}

function extractNumberFromName(name?: string): number | undefined {
  if (!name) return undefined;
  const m = name.match(/\d+/);
  if (!m) return undefined;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : undefined;
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = (await req.json()) as Body;
    const {
      guestId,
      invitationId,
      tableId,
      tableName: incomingTableName,
      tableNumber: incomingTableNumber,
      seatIndex,
    } = body;

    // ===== חובה מינימלית =====
    if (!guestId || !tableId) {
      return NextResponse.json(
        { success: false, error: "MISSING_PARAMS", required: ["guestId", "tableId"] },
        { status: 400 }
      );
    }

    if (!isValidObjectId(guestId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_GUEST_ID" },
        { status: 400 }
      );
    }

    if (invitationId && !isValidObjectId(invitationId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_INVITATION_ID" },
        { status: 400 }
      );
    }

    // ===== שליפת אורח + ולידציה שייכות =====
    const guestFilter: Record<string, unknown> = { _id: guestId };
    if (invitationId) guestFilter.invitationId = new mongoose.Types.ObjectId(invitationId);

    const guest = await InvitationGuest.findOne(guestFilter).lean();
    if (!guest) {
      return NextResponse.json(
        { success: false, error: "GUEST_NOT_FOUND" },
        { status: 404 }
      );
    }

    // ===== מציאת מסמך ההושבה הנכון =====
    // עדיפות: invitationId שהגיע בבקשה, אחרת invitationId של האורח
    const effectiveInvitationId =
      invitationId ??
      (guest.invitationId ? String(guest.invitationId) : undefined);

    if (!effectiveInvitationId || !isValidObjectId(effectiveInvitationId)) {
      return NextResponse.json(
        { success: false, error: "MISSING_INVITATION_CONTEXT" },
        { status: 400 }
      );
    }

    const seatingDoc = await SeatingTable.findOne({
      invitationId: new mongoose.Types.ObjectId(effectiveInvitationId),
      "tables.id": tableId,
    }).lean();

    if (!seatingDoc) {
      return NextResponse.json(
        { success: false, error: "TABLE_NOT_FOUND_IN_INVITATION" },
        { status: 404 }
      );
    }

    const foundTable = seatingDoc.tables?.find((t: any) => t?.id === tableId);
    if (!foundTable) {
      return NextResponse.json(
        { success: false, error: "TABLE_NOT_FOUND" },
        { status: 404 }
      );
    }

    // ===== Source of truth מהשולחן =====
    const finalTableName =
      (typeof foundTable.name === "string" && foundTable.name.trim()) ||
      (incomingTableName?.trim() || "");

    const finalTableNumber =
      normalizeTableNumber(incomingTableNumber) ??
      normalizeTableNumber(foundTable.tableNumber) ??
      extractNumberFromName(finalTableName);

    const updateSet: Record<string, unknown> = {
      tableId, // ⭐ העיקר
      tableName: finalTableName,
    };

    if (typeof finalTableNumber === "number") {
      updateSet.tableNumber = finalTableNumber;
    }

    if (typeof seatIndex === "number" && Number.isInteger(seatIndex) && seatIndex >= 0) {
      updateSet.seatIndex = seatIndex;
    }

    const updateUnset: Record<string, 1> = {};
    if (seatIndex === null) {
      updateUnset.seatIndex = 1; // מאפשר "ניקוי מושב"
    }

    const updateQuery: Record<string, unknown> = { $set: updateSet };
    if (Object.keys(updateUnset).length > 0) {
      updateQuery.$unset = updateUnset;
    }

    const result = await InvitationGuest.updateOne(
      { _id: new mongoose.Types.ObjectId(guestId) },
      updateQuery
    );

    return NextResponse.json({
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      guestId,
      tableId,
      tableName: finalTableName,
      ...(typeof finalTableNumber === "number" ? { tableNumber: finalTableNumber } : {}),
      ...(typeof seatIndex === "number" ? { seatIndex } : {}),
      ...(seatIndex === null ? { seatIndexCleared: true } : {}),
    });
  } catch (err: any) {
    console.error("assign guest to table error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
