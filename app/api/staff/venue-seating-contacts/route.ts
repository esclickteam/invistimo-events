import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { listStaffVisibleContacts } from "@/lib/venueSeatingContacts/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });

  const seatingTeam =
    auth.role === "admin" ||
    auth.impersonatedByAdmin ||
    auth.staffType === "seating_staff";
  if (!seatingTeam) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  await dbConnect();
  let customerIds: string[] = [];
  if (auth.role === "admin" || auth.impersonatedByAdmin) {
    const requested = new URL(request.url).searchParams.get("userId") || "";
    customerIds = requested ? [requested] : [];
  } else {
    const staff = await User.findById(auth.userId)
      .select("assignedClientIds")
      .lean<{ assignedClientIds?: unknown[] } | null>();
    customerIds = (staff?.assignedClientIds || []).map((id) => String(id));
  }

  const events = await listStaffVisibleContacts({ customerIds });
  return NextResponse.json({ success: true, events });
}
