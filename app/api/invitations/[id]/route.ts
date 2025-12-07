import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";

export async function GET(req: Request, context: any) {
  try {
    await db();

    // ⭐ תיקון Next.js — params יכול להיות Promise
    const params = await context.params;
    const id = params?.id;

    console.log("📌 GET INVITATION BY ID:", id);

    // ⭐ תיקון קריטי: מניעת CastError
    if (!id || id === "undefined" || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    const invitation = await Invitation.findById(id).populate("guests");

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // ⭐ ממירים ל־JSON נקי כדי למנוע undefined בדפדפן
    const cleanInvite = JSON.parse(JSON.stringify(invitation));

    return NextResponse.json(
      { success: true, invitation: cleanInvite },
      { status: 200 }
    );

  } catch (err) {
    console.error("❌ Error in GET /api/invitations/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
