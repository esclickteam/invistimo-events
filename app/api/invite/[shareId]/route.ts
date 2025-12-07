import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic"; // מבטל Cache של Next.js

export async function GET(
  req: Request,
  context: { params: { shareId: string } }
) {
  try {
    await db();

    // ⛳ שליפת הפרמטר מתוך הנתיב
    const { shareId } = context.params;

    console.log("📌 SHARE ID:", shareId);

    if (!shareId) {
      return NextResponse.json(
        { error: "Missing shareId in URL" },
        { status: 400 }
      );
    }

    // 🧩 חיפוש ההזמנה לפי shareId
    const invitation = await Invitation.findOne({ shareId }).populate("guests");

    if (!invitation) {
      console.warn("⚠️ Invitation not found for shareId:", shareId);
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // 🧹 הפיכת Mongoose Document ל-JSON נקי
    const cleanInvite = JSON.parse(JSON.stringify(invitation));

    console.log("✅ Invitation found:", cleanInvite._id);

    return NextResponse.json(
      { success: true, invitation: cleanInvite },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error in GET /api/invite/[shareId]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
