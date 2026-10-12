import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { describeTestPushResult } from "@/lib/customerNotifications/adminCenter";
import { createCustomerNotification } from "@/lib/customerNotifications/service";
import { deliverWebPushTest, isWebPushConfigured } from "@/lib/push/webPush";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth || auth.role !== "admin" || auth.impersonated) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  await dbConnect();
  const stamp = new Date().toISOString();
  await createCustomerNotification({
    userId: auth.userId,
    audience: "admin",
    type: "admin.push.test",
    category: "admin_info",
    severity: "info",
    title: "התראת בדיקה",
    body: "נשלחה התראת בדיקה למכשיר הזה.",
    actionHref: "/admin/notification-settings",
    dedupeKey: `admin-test:${auth.userId}:${stamp}`,
    skipPush: true,
    meta: { incidentKey: `admin-test:${auth.userId}:${stamp}`, eventTitle: "" },
  });
  const configured = isWebPushConfigured();
  const result = configured
    ? await deliverWebPushTest(auth.userId)
    : { sent: 0, attempted: 0 };
  const described = describeTestPushResult({
    configured,
    attempted: result.attempted,
    sent: result.sent,
  });
  return NextResponse.json({
    success: true,
    ...described,
    attempted: result.attempted,
    accepted: result.sent,
  });
}
