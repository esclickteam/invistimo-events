import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  countUnreadCustomerNotifications,
  markCustomerNotificationRead,
} from "@/lib/customerNotifications/service";

export const dynamic = "force-dynamic";

function customerId(auth: { userId: string; adminManagingUserId?: string | null }) {
  return auth.adminManagingUserId || auth.userId;
}

export async function POST(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  await dbConnect();
  const userId = customerId(auth);
  const result = await markCustomerNotificationRead({
    userId,
    notificationId: body?.id ? String(body.id) : null,
    all: Boolean(body?.all),
    audience: "customer",
  });
  const unreadCount = await countUnreadCustomerNotifications(userId);

  return NextResponse.json({
    success: true,
    updated: result.updated,
    unreadCount,
  });
}
