import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

export async function POST(req: Request) {
  await dbConnect();

  const { tableId, newNumber, newName } = await req.json();

  // 1️⃣ עדכון השולחן עצמו
  const table = await SeatingTable.findByIdAndUpdate(
    tableId,
    {
      number: newNumber,
      name: newName || `שולחן ${newNumber}`,
    },
    { new: true }
  );

  if (!table) {
    return NextResponse.json({ error: "TABLE_NOT_FOUND" }, { status: 404 });
  }

  // 2️⃣ סנכרון כל האורחים שיושבים עליו
  await InvitationGuest.updateMany(
    { tableNumber: table.number }, // או tableId אם היה
    {
      tableNumber: table.number,
      tableName: table.name,
    }
  );

  return NextResponse.json({ success: true });
}
