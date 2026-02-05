// app/api/seating/update-table/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

export async function POST(req: Request) {
  await dbConnect();

  const { tableId, newNumber } = await req.json();

  if (!tableId || typeof newNumber !== "number") {
    return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
  }

  const table = await SeatingTable.findById(tableId);
  if (!table) {
    return NextResponse.json({ error: "TABLE_NOT_FOUND" }, { status: 404 });
  }

  const newTableName = `שולחן ${newNumber}`;

  // 1️⃣ עדכון השולחן
  await SeatingTable.updateOne(
    { _id: tableId },
    { $set: { number: newNumber, name: newTableName } }
  );

  // 2️⃣ 🔥 עדכון כל האורחים שיושבים בו
  await InvitationGuest.updateMany(
    { tableNumber: table.number }, // לפי מספר ישן
    {
      $set: {
        tableNumber: newNumber,
        tableName: newTableName,
      },
    }
  );

  return NextResponse.json({ success: true });
}
