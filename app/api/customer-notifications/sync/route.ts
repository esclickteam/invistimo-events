import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { customerNotificationsEnabled } from "@/lib/customerNotifications/featureFlag";
import { countUnreadCustomerNotifications } from "@/lib/customerNotifications/service";
import { processVenueSeatingRemindersForUser } from "@/lib/venueSeatingContacts/service";

export const dynamic = "force-dynamic";

function customerId(auth: { userId: string; adminManagingUserId?: string | null }) {
  return auth.adminManagingUserId || auth.userId;
}

export async function POST(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  if (!customerNotificationsEnabled()) {
    return NextResponse.json({
      success: true,
      showBell: false,
      unreadCount: 0,
    });
  }

  await dbConnect();
  const userId = customerId(auth);
  await processVenueSeatingRemindersForUser(userId);
  const unreadCount = await countUnreadCustomerNotifications(userId);

  return NextResponse.json({
    success: true,
    showBell: true,
    unreadCount,
  });
}
