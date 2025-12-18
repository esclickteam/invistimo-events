import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export async function POST(req: Request) {
  await dbConnect();

  const { guestId, tableId, tableName, seatIndex } = await req.json();

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
        tableName,
        seatIndex,
      },
    }
  );

  return NextResponse.json({ success: true });
}
