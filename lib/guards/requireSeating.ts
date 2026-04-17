import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function requireSeating() {
  await db();

  const auth = await getUserIdFromRequest();

  // 🔐 לא מחובר
  if (!auth?.userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  const userId = auth.userId;
  const user = await User.findById(userId).lean();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      ),
    };
  }

  /**
   * ⭐ התחזות – תמיד מותר
   */
  if (user.impersonated === true) {
    return { ok: true, userId };
  }

  /**
   * ⭐ מפיק / אדמין – תמיד מותר
   * לא בודקים להם plan של המשתמש המחובר
   */
  if (auth.role === "producer" || auth.role === "admin") {
    return { ok: true, userId };
  }

  /**
   * ⭐ לקוח רגיל – בדיקת הרשאת הושבה
   * - פרימיום תמיד כולל הושבה
   * - add-on עתידי דרך planLimits
   */
  const hasSeating =
    user.plan === "premium" ||
    user.planLimits?.seatingEnabled === true;

  if (!hasSeating) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Seating is not included in your plan",
          code: "SEATING_NOT_ALLOWED",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId };
}