import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  await db();
  const { token } = params;

  const guest = await InvitationGuest.findOne({ token });

  if (!guest) {
    return NextResponse.json(
      { success: false, error: "Guest not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, guest });
}
