import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

export async function POST(req: Request) {
  await dbConnect();

  const { tableId, tableNumber, tableName } = await req.json();

  if (!tableId) {
    return NextResponse.json(
      { success: false, error: "MISSING_TABLE_ID" },
      { status: 400 }
    );
  }

  // 1️⃣ עדכון השולחן עצמו
  await SeatingTable.updateOne(
    { "tables.id": tableId },
    {
      $set: {
        "tables.$.tableNumber": tableNumber,
        "tables.$.tableName": tableName,
      },
    }
  );

  // 2️⃣ 🔥 סנכרון כל האורחים שיושבים עליו
  await InvitationGuest.updateMany(
    { tableId },
    {
      $set: {
        tableNumber,
        tableName,
      },
    }
  );

  return NextResponse.json({ success: true });
}
