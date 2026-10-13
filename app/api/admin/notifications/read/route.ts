import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { adminNotificationOwnerId } from "@/lib/customerNotifications/adminCenter";
import {
  countUnreadAdminNotifications,
  markCustomerNotificationRead,
} from "@/lib/customerNotifications/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getUserIdFromRequest(request);
  const adminId = adminNotificationOwnerId(auth);
  if (!adminId) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  await dbConnect();
  const result = await markCustomerNotificationRead({
    userId: adminId,
    notificationId: body?.id ? String(body.id) : null,
    all: Boolean(body?.all),
    audience: "admin",
  });
  const unreadCount = await countUnreadAdminNotifications(auth.userId);
  return NextResponse.json({
    success: true,
    updated: result.updated,
    unreadCount,
  });
}
