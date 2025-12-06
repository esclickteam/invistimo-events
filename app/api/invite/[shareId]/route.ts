import { NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";

export async function GET(_: Request, { params }: { params: { shareId: string } }) {
  try {
    await db();
    const invitation = await Invitation.findOne({ shareId: params.shareId }).populate("guests");

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    return NextResponse.json(invitation);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
