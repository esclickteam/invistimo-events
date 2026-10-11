import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  countUnreadCustomerNotifications,
  listActiveCustomerNotifications,
} from "@/lib/customerNotifications/service";
import { customerBellEligibility } from "@/lib/venueSeatingContacts/service";

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
  const [notifications, unreadCount, bell] = await Promise.all([
    listActiveCustomerNotifications(userId),
    countUnreadCustomerNotifications(userId),
    customerBellEligibility(userId),
  ]);

  return NextResponse.json({
    success: true,
    showBell: bell.showBell,
    unreadCount,
    notifications,
  });
}
