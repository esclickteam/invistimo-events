import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeRole(value: unknown) {
  return cleanString(value).toLowerCase();
}

function isAssignableStaffUser(user: any) {
  const role = normalizeRole(user?.role);
  const status = normalizeRole(user?.status);

  const isStaffRole = role === "staff" || role === "employee";

  const isActive =
    user?.isActive !== false &&
    status !== "blocked" &&
    status !== "inactive" &&
    status !== "cancelled" &&
    status !== "deleted";

  return isStaffRole && isActive;
}

export async function GET(_req: NextRequest) {
  try {
    await db();

    /**
     * חשוב:
     * מחזירים רק עובדים אמיתיים לשיוך לידים.
     * לא מחזירים לקוחות, מפיקים, בעלי אולם, עסקים או משתמשים רגילים.
     */
    const users = await User.find({
      role: { $in: ["staff", "employee"] },
    })
      .select("_id name fullName email role staffType isActive status")
      .sort({ name: 1, fullName: 1, email: 1 })
      .lean();

    const staff = users
      .filter(isAssignableStaffUser)
      .map((user: any) => ({
        _id: String(user._id),
        name: cleanString(user.name || user.fullName),
        email: cleanString(user.email),
        role: cleanString(user.role),
        staffType: cleanString(user.staffType),
      }));

    return NextResponse.json(
      {
        success: true,
        staff,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("GET ADMIN STAFF ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בטעינת עובדים",
      },
      { status: 500 }
    );
  }
}