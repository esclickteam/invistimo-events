import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

export async function POST(req: Request) {
  await dbConnect();

  const { tableId, newNumber } = await req.json();

  if (!tableId || typeof newNumber !== "number") {
    return NextResponse.json(
      { success: false, error: "MISSING_PARAMS" },
      { status: 400 }
    );
  }

  // 1️⃣ שליפת השולחן הקיים
  const existingTable = await SeatingTable.findById(tableId);
  if (!existingTable) {
    return NextResponse.json(
      { success: false, error: "TABLE_NOT_FOUND" },
      { status: 404 }
    );
  }

  const oldTableName = existingTable.name;          // 🔴 זה הקריטי
  const newTableName = `שולחן ${newNumber}`;

  // 2️⃣ עדכון השולחן עצמו
  await SeatingTable.findByIdAndUpdate(tableId, {
    number: newNumber,
    name: newTableName,
  });

  // 3️⃣ סנכרון כל האורחים לפי tableName הישן
  await InvitationGuest.updateMany(
    { tableName: oldTableName },
    {
      $set: {
        tableName: newTableName,
      },
    }
  );

  return NextResponse.json({ success: true });
}
