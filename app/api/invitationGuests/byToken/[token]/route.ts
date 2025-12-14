import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params; // ✅ לא Promise!

  try {
    await db();

    const guest = await InvitationGuest.findOne({ token });

    if (!guest) {
      return NextResponse.json(
        { success: false, error: "Guest not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, guest });
  } catch (err) {
    console.error("❌ Error loading guest by token:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
