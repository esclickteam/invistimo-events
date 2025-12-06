import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";

export async function GET(req: Request, context: any) {
  try {
    await db();

    const id = context?.params?.id;
    if (!id) {
      return NextResponse.json(
        { error: "Missing invitation id" },
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

    return NextResponse.json(invitation, { status: 200 });
  } catch (err) {
    console.error("❌ Error in GET /api/invitations/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
