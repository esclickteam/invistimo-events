import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params; // ✅ נשתמש ב־await לפי הציפייה של Next

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
