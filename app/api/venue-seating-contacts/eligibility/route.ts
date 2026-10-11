import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  customerBellEligibility,
  getHallSeatingContactState,
} from "@/lib/venueSeatingContacts/service";

export const dynamic = "force-dynamic";

function customerId(auth: { userId: string; adminManagingUserId?: string | null }) {
  return auth.adminManagingUserId || auth.userId;
}

export async function GET(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  await dbConnect();
  const userId = customerId(auth);
  const eventId = new URL(request.url).searchParams.get("eventId") || "";
  const bell = await customerBellEligibility(userId);

  if (!eventId) {
    return NextResponse.json({
      success: true,
      showBell: bell.showBell,
      showTab: false,
    });
  }

  const state = await getHallSeatingContactState({ userId, eventId });
  return NextResponse.json({
    success: true,
    showBell: bell.showBell,
    showTab: Boolean(state.found && state.access.showTab),
    eventId,
  });
}
