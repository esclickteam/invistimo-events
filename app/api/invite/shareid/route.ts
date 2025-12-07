import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic"; // מבטל cache של Next.js

export async function GET(req: Request, context: any) {
  try {
    await db();

    // ⭐ context.params יכול להיות Promise, לכן נמתין
    const params = await context.params;
    const shareid = params?.shareid; // ✅ תואם בדיוק לשם התיקייה שלך [shareid]

    console.log("📌 SHARE ID:", shareid);

    if (!shareid) {
      return NextResponse.json(
        { error: "Missing shareid in URL" },
        { status: 400 }
      );
    }

    // 🧩 חיפוש ההזמנה לפי shareid
    const invitation = await Invitation.findOne({ shareId: shareid }).populate("guests");

    if (!invitation) {
      console.warn("⚠️ Invitation not found for shareid:", shareid);
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // 🧹 המרה ל-JSON נקי
    const cleanInvite = JSON.parse(JSON.stringify(invitation));

    console.log("✅ Invitation found:", cleanInvite._id);

    return NextResponse.json(
      { success: true, invitation: cleanInvite },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error in GET /api/invite/[shareid]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
