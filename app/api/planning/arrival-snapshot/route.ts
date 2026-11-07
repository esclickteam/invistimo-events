import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { findManagedPrimaryInvitation } from "@/lib/findManagedPrimaryInvitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { summarizeArrivalRows } from "@/lib/planning/arrivalSnapshot";
import Group from "@/models/Group";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId) {
    return NextResponse.json({ signedIn: false }, { status: 401, headers: noStore });
  }

  if (new URL(req.url).searchParams.get("probe") === "1") {
    return NextResponse.json({ signedIn: true }, { headers: noStore });
  }

  try {
    await connectDB();
    const invitation = await findManagedPrimaryInvitation(auth);
    if (!invitation?._id) {
      return NextResponse.json({ signedIn: true, found: false }, { headers: noStore });
    }

    const rows = await InvitationGuest.find({ invitationId: invitation._id })
      .select("rsvp status guestsCount arrivedCount groupId")
      .lean();

    const eventId = invitation.eventId;
    const groups = eventId ? await Group.find({ eventId }).select("name").lean() : [];
    const names = new Map(groups.map((group) => [String(group._id), String(group.name || "")]));
    const eventDate = invitation.eventDate ? new Date(invitation.eventDate) : null;
    const summary = summarizeArrivalRows(rows, names, eventDate);

    return NextResponse.json({ signedIn: true, found: true, ...summary }, { headers: noStore });
  } catch {
    console.error("arrival snapshot failed");
    return NextResponse.json(
      { signedIn: true, found: false, error: "unavailable" },
      { status: 503, headers: noStore }
    );
  }
}
