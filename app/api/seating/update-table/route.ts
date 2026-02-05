import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

type Body = {
  invitationId?: string;
  tableId?: string;      // מומלץ מאוד
  oldTableName?: string; // fallback אם אין tableId
  newNumber?: number;
};

function isValidObjectId(id?: string) {
  return !!id && mongoose.Types.ObjectId.isValid(id);
}

function normalizeHebrewTableName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

function buildPossibleOldNames(oldTableName?: string, newNumber?: number) {
  const names = new Set<string>();

  if (oldTableName) {
    const n = normalizeHebrewTableName(oldTableName);
    names.add(n);

    // אם oldTableName כולל מספר, נוסיף וריאציות
    const m = n.match(/\d+/);
    if (m) {
      const num = Number(m[0]);
      if (Number.isFinite(num)) {
        names.add(`שולחן ${num}`);
        names.add(`${num} שולחן`);
      }
    }
  }

  if (typeof newNumber === "number") {
    names.add(`שולחן ${newNumber}`);
    names.add(`${newNumber} שולחן`);
    names.add(String(newNumber));
  }

  return Array.from(names).filter(Boolean);
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const { invitationId, tableId, oldTableName, newNumber } =
      (await req.json()) as Body;

    // ===== Validation =====
    if (!invitationId || !isValidObjectId(invitationId) || typeof newNumber !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_PARAMS",
          required: ["invitationId", "newNumber(number)"],
          optional: ["tableId", "oldTableName"],
        },
        { status: 400 }
      );
    }

    if (!tableId && !oldTableName) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_TABLE_IDENTIFIER",
          message: "Send tableId (preferred) or oldTableName",
        },
        { status: 400 }
      );
    }

    const newTableName = `שולחן ${newNumber}`;

    // ===== Build filter (STRICT by invitationId) =====
    const baseFilter: Record<string, unknown> = {
      invitationId: new mongoose.Types.ObjectId(invitationId),
    };

    // עדיפות ראשונה tableId
    let tableMatch: Record<string, unknown>;
    if (tableId) {
      tableMatch = { tableId };
    } else {
      const oldNames = buildPossibleOldNames(oldTableName, newNumber);
      tableMatch = {
        $or: [
          { tableName: { $in: oldNames } },
          { tableNumber: newNumber },
        ],
      };
    }

    const filter = {
      ...baseFilter,
      ...tableMatch,
    };

    const update: Record<string, unknown> = {
      $set: {
        tableNumber: newNumber,
        tableName: newTableName,
      },
    };

    // אם יש tableId, נוודא שגם נשמר אצל כל האורחים
    if (tableId) {
      (update.$set as Record<string, unknown>).tableId = tableId;
    }

    const res = await InvitationGuest.updateMany(filter, update);

    return NextResponse.json({
      success: true,
      matched: res.matchedCount,
      modified: res.modifiedCount,
      applied: {
        invitationId,
        tableId: tableId ?? null,
        oldTableName: oldTableName ?? null,
        newTableName,
        newNumber,
      },
    });
  } catch (err: any) {
    console.error("update-table route error:", err);
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
