import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const cookieStore = await cookies();
const token = cookieStore.get("authToken")?.value;


    if (!token) {
      return Response.json({ success: false, message: "No token" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // ✅ חייב להיות עובד
    if (decoded.role !== "staff") {
      return Response.json({ success: false, message: "Not staff" }, { status: 403 });
    }

    const staff = await User.findById(decoded.userId).lean();
    if (!staff) {
      return Response.json({ success: false, message: "Staff not found" }, { status: 403 });
    }

    // ✅ חייב להיות עובד מפיק (לפי DB!)
    if (staff.staffType !== "producer_staff") {
      return Response.json({ success: false, message: "Not producer staff" }, { status: 403 });
    }

    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return Response.json({ success: false, message: "Missing targetUserId" }, { status: 400 });
    }

    // ✅ בדיקה שהמשתמש הוקצה לעובד
    const assignedIds = (staff.assignedClientIds || []).map(String);
    if (!assignedIds.includes(String(targetUserId))) {
      return Response.json({ success: false, message: "User not assigned" }, { status: 403 });
    }

    const targetUser = await User.findById(targetUserId).lean();
    if (!targetUser) {
      return Response.json({ success: false, message: "Target not found" }, { status: 404 });
    }

    // 🔒 לא מאפשרים התחזות לאדמין / מפיק
    if (targetUser.role === "admin" || targetUser.role === "producer") {
      return Response.json({ success: false, message: "Forbidden role" }, { status: 403 });
    }

    // ✅ יצירת טוקן התחזות
    const impersonationToken = jwt.sign(
      {
        userId: targetUser._id,
        role: targetUser.role, // client | user
        impersonated: true,
        impersonatedBy: staff._id,
        impersonationRole: "producer_staff",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "8h" }
    );

    cookieStore.set("authToken", impersonationToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return Response.json({
      success: true,
      role: targetUser.role,
      eventId: targetUser.event ?? null,
    });
  } catch (err) {
    console.error("producer-staff impersonate error:", err);
    return Response.json({ success: false }, { status: 500 });
  }
}
