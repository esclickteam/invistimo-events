import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { customerNotificationsEnabled } from "@/lib/customerNotifications/featureFlag";
import {
  countUnreadCustomerNotifications,
  listActiveCustomerNotifications,
} from "@/lib/customerNotifications/service";

export const dynamic = "force-dynamic";

function customerId(auth: { userId: string; adminManagingUserId?: string | null }) {
  return auth.adminManagingUserId || auth.userId;
}

export async function GET(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  if (!customerNotificationsEnabled()) {
    return NextResponse.json({
      success: true,
      showBell: false,
      unreadCount: 0,
      notifications: [],
    });
  }

  await dbConnect();
  const userId = customerId(auth);
  const [notifications, unreadCount] = await Promise.all([
    listActiveCustomerNotifications(userId),
    countUnreadCustomerNotifications(userId),
  ]);

  return NextResponse.json({
    success: true,
    showBell: true,
    unreadCount,
    notifications,
  });
}
