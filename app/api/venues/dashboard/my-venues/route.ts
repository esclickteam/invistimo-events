import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { listUserVenueMemberships } from "@/lib/venues/requireVenueAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * List halls the authenticated user can access (multi-venue switcher).
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const venues = await listUserVenueMemberships(auth.userId);

    return NextResponse.json({
      success: true,
      venues,
      count: venues.length,
    });
  } catch (error) {
    console.error("GET my-venues failed:", error);
    return NextResponse.json(
      { success: false, message: "טעינת אולמות נכשלה" },
      { status: 500 }
    );
  }
}
