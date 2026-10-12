import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { listMyBriefings } from "@/lib/venueSeatingBriefing/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth?.userId) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const allowed =
    auth.role === "producer" ||
    (auth.role === "staff" && auth.staffType === "seating_staff");
  if (!allowed) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  await dbConnect();
  const events = await listMyBriefings(auth.userId);
  return NextResponse.json({ success: true, events });
}
