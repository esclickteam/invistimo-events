import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ shareId: string }> } // 👈 חובה Promise
) {
  try {
    await db();

    const { shareId } = await context.params; // 👈 חובה await

    console.log("📌 SHARE ID:", shareId);

    if (!shareId) {
      return NextResponse.json(
        { error: "Missing shareId in URL" },
        { status: 400 }
      );
    }

    const invitation = await Invitation.findOne({ shareId }).populate("guests");

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, invitation: JSON.parse(JSON.stringify(invitation)) },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ API ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
