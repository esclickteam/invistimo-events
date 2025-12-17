import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function requireSeating() {
  await db();

  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await User.findById(userId).lean();

  if (!user?.planLimits?.seatingEnabled) {
    return NextResponse.json(
      {
        success: false,
        error: "Seating is not included in your plan",
        code: "SEATING_NOT_ALLOWED",
      },
      { status: 403 }
    );
  }

  return { userId };
}
