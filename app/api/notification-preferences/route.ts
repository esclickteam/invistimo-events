import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  getPushPreferences,
  savePushPreferences,
} from "@/lib/customerNotifications/preferences";
import { isWebPushConfigured } from "@/lib/push/webPush";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  await dbConnect();
  const push = await getPushPreferences(auth.userId);
  return NextResponse.json({
    success: true,
    configured: isWebPushConfigured(),
    managingCustomer: Boolean(auth.adminManagingUserId),
    push,
  });
}

export async function PUT(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const body = await request.json().catch(() => null);
  await dbConnect();
  const push = await savePushPreferences(auth.userId, {
    rsvp: Boolean(body?.push?.rsvp),
    failures: Boolean(body?.push?.failures),
    eventManagement: Boolean(body?.push?.eventManagement),
    reminders: Boolean(body?.push?.reminders),
  });
  return NextResponse.json({ success: true, push });
}
