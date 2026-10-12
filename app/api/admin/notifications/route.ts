import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  countUnreadAdminNotifications,
  listAdminCenterNotifications,
} from "@/lib/customerNotifications/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth || auth.role !== "admin" || auth.impersonated) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  await dbConnect();
  const [notifications, unreadCount] = await Promise.all([
    listAdminCenterNotifications(auth.userId),
    countUnreadAdminNotifications(auth.userId),
  ]);
  return NextResponse.json({
    success: true,
    showBell: true,
    unreadCount,
    notifications,
  });
}
