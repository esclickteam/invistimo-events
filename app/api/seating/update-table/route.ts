import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

export async function POST(req: Request) {
  await dbConnect();

  const { oldTableName, newNumber } = await req.json();

  if (!oldTableName || typeof newNumber !== "number") {
    return NextResponse.json(
      { success: false, error: "MISSING_PARAMS" },
      { status: 400 }
    );
  }

  const newTableName = `שולחן ${newNumber}`;

  // 1️⃣ עדכון השולחן עצמו
  await SeatingTable.updateOne(
    { name: oldTableName },
    {
      $set: {
        number: newNumber,
        name: newTableName,
      },
    }
  );

  // 2️⃣ סנכרון כל האורחים שיושבים עליו
  await InvitationGuest.updateMany(
    { tableName: oldTableName },
    {
      $set: {
        tableNumber: newNumber,
        tableName: newTableName,
      },
    }
  );

  return NextResponse.json({ success: true });
}
