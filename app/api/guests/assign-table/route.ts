import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export async function POST(req: Request) {
  await dbConnect();

  const { guestId, tableId, seatIndex } = await req.json();

  if (!guestId || !tableId) {
    return NextResponse.json(
      { success: false, error: "MISSING_PARAMS" },
      { status: 400 }
    );
  }

  await InvitationGuest.updateOne(
    { _id: guestId },
    {
      $set: {
        tableId,
        seatIndex,
      },
      // ניקוי יזום – כדי שלא יחזרו נתונים ישנים
      $unset: {
        tableName: "",
        tableNumber: "",
      },
    }
  );

  return NextResponse.json({ success: true });
}
