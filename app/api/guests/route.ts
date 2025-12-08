import { NextResponse } from "next/server";
import db from "@/lib/db";
import Guest from "@/models/Guest";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db();

    const userId = await getUserIdFromRequest();
    if (!userId) return NextResponse.json({ guests: [] });

    const invitations = await Invitation.find({ ownerId: userId }).select("_id");
    const ids = invitations.map((i) => i._id);

    const guests = await Guest.find({
      invitationId: { $in: ids }
    }).sort({ createdAt: -1 });

    return NextResponse.json({ guests });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ guests: [] });
  }
}
