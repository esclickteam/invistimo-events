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
   * ⭐ מפיק / אדמין / התחזות – תמיד מותר
   * לא בודקים להם plan של המשתמש המחובר
   */
  const isPrivilegedActor =
    auth.role === "producer" ||
    auth.role === "admin" ||
    auth.impersonationRole === "admin" ||
    auth.impersonationRole === "producer" ||
    auth.impersonatedByAdmin === true ||
    Boolean(auth.impersonatedBy);

  if (isPrivilegedActor) {
    return { ok: true, userId };
  }

  /**
   * ⭐ לקוח רגיל – בדיקת הרשאת הושבה
   * - פרימיום תמיד כולל הושבה
   * - add-on עתידי דרך planLimits
   * - לקוח אולם (venue client) שקיבל חבילת הושבה מהאולם
   */
  const u = user as any;
  const isVenueClientWithSeating =
    u.venueClientSource === true ||
    u.includeSeating === true ||
    u.includeDigitalSeating === true ||
    u.accessModules?.rsvpSeating === true ||
    u.accessModules?.digitalSeating === true ||
    u.accessModules?.seatingTemplates === true ||
    ["seating_only", "rsvp_seating", "rsvp_and_seating", "full"].includes(
      String(u.venueClientPackageType || u.plan || "")
    ) ||
    Boolean(u.venueSeatingTemplateId) ||
    Boolean(u.venueHallId || u.venueClientHallId);

  const hasSeating =
    user.plan === "premium" ||
    user.planLimits?.seatingEnabled === true ||
    isVenueClientWithSeating;

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