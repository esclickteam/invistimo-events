import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Safe Cloudinary env presence check for authorized venue owners/admins.
 * Never returns secret values — only EXISTS / MISSING.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const user = await User.findById(auth.userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "משתמש לא נמצא" },
        { status: 404 }
      );
    }

    const role = String((user as any).role || "");
    const allowed =
      role === "admin" ||
      role === "venue_owner" ||
      Boolean((user as any).venueUser);

    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "אין הרשאה" },
        { status: 403 }
      );
    }

    const service =
      process.env.VERCEL_ENV ||
      process.env.NODE_ENV ||
      "unknown";

    const variables = [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
      "CLOUDINARY_URL",
    ].map((name) => ({
      name,
      status: process.env[name] ? "EXISTS" : "MISSING",
      service,
    }));

    const requiredOk =
      (Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
        Boolean(process.env.CLOUDINARY_API_KEY) &&
        Boolean(process.env.CLOUDINARY_API_SECRET)) ||
      Boolean(process.env.CLOUDINARY_URL);

    return NextResponse.json({
      success: true,
      ok: requiredOk,
      service,
      variables,
    });
  } catch (err) {
    console.error("cloudinary-status failed:", err);
    return NextResponse.json(
      { success: false, message: "בדיקה נכשלה" },
      { status: 500 }
    );
  }
}
