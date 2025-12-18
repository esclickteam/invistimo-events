import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export async function POST(req: Request) {
  await dbConnect();

  const { guestId } = await req.json();

  if (!guestId) {
    return NextResponse.json(
      { success: false, error: "MISSING_GUEST_ID" },
      { status: 400 }
    );
  }

  await InvitationGuest.updateOne(
    { _id: guestId },
    {
      $unset: {
        tableId: "",
        tableName: "",
        seatIndex: "",
      },
    }
  );

  return NextResponse.json({ success: true });
}
