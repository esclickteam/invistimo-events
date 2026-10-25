import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { adminNotificationOwnerId } from "@/lib/customerNotifications/adminCenter";
import {
  countUnreadAdminNotifications,
  listAdminCenterNotifications,
} from "@/lib/customerNotifications/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getUserIdFromRequest(request);
  const adminId = adminNotificationOwnerId(auth);
  if (!adminId) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  await dbConnect();
  const [notifications, unreadCount] = await Promise.all([
    listAdminCenterNotifications(adminId),
    countUnreadAdminNotifications(adminId),
  ]);
  return NextResponse.json({
    success: true,
    showBell: true,
    unreadCount,
    notifications,
  });
}
