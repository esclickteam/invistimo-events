import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

export async function POST(req: Request) {
  await dbConnect();

  const { tableId, newNumber, newName } = await req.json();

  if (!tableId || typeof newNumber !== "number") {
    return NextResponse.json(
      { success: false, error: "MISSING_PARAMS" },
      { status: 400 }
    );
  }

  // 1️⃣ שליפת השולחן הקיים (כדי לדעת את המספר הישן)
  const existingTable = await SeatingTable.findById(tableId);
  if (!existingTable) {
    return NextResponse.json(
      { success: false, error: "TABLE_NOT_FOUND" },
      { status: 404 }
    );
  }

  const oldNumber = existingTable.number;

  // 2️⃣ עדכון השולחן עצמו
  const table = await SeatingTable.findByIdAndUpdate(
    tableId,
    {
      number: newNumber,
      name: newName || `שולחן ${newNumber}`,
    },
    { new: true }
  );

  // 3️⃣ סנכרון כל האורחים שהיו על המספר הישן
  await InvitationGuest.updateMany(
    { tableNumber: oldNumber },
    {
      $set: {
        tableNumber: table.number,
        tableName: table.name,
      },
    }
  );

  return NextResponse.json({ success: true });
}
