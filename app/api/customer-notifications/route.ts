import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { canExposeCustomerNotificationFeed } from "@/lib/customerNotifications/visibility";

export const dynamic = "force-dynamic";

const hiddenFeed = {
  success: true,
  showBell: false,
  unreadCount: 0,
  notifications: [] as [],
};

export async function GET(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  if (!canExposeCustomerNotificationFeed(auth)) {
    return NextResponse.json(hiddenFeed);
  }

  return NextResponse.json(hiddenFeed);
}
