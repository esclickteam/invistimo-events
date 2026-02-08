import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    /* =========================
       Auth
    ========================= */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return Response.json({ success: false }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // ✅ חייב להיות עובד
    if (decoded.role !== "staff") {
      return Response.json({ success: false }, { status: 403 });
    }

    const staff = await User.findById(decoded.userId);
    if (!staff) {
      return Response.json({ success: false }, { status: 403 });
    }

    // ✅ חייב להיות עובד מפיק
    if (staff.staffType !== "producer") {
      return Response.json({ success: false }, { status: 403 });
    }

    /* =========================
       Body
    ========================= */
    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return Response.json({ success: false }, { status: 400 });
    }

    // ✅ בדיקה שהמשתמש הוקצה לעובד
    const assignedIds = (staff.assignedClientIds || []).map(String);
    if (!assignedIds.includes(String(targetUserId))) {
      return Response.json({ success: false }, { status: 403 });
    }

    /* =========================
       Load target user
    ========================= */
    const targetUser = await User.findById(targetUserId).populate("event");
    if (!targetUser) {
      return Response.json({ success: false }, { status: 404 });
    }

    // 🔒 הגנה – לא מאפשרים התחזות למפיק/אדמין
    if (targetUser.role === "producer" || targetUser.role === "admin") {
      return Response.json({ success: false }, { status: 403 });
    }

    /* =========================
       Create impersonation token
       (role נשאר של המשתמש המקורי)
    ========================= */
    const impersonationToken = jwt.sign(
      {
        userId: targetUser._id,
        role: targetUser.role, // client OR user

        impersonated: true,
        impersonatedBy: staff._id,
        impersonationRole: "staff_producer",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "8h" }
    );

    cookieStore.set("authToken", impersonationToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });

    return Response.json({
      success: true,
      role: targetUser.role,
      eventId: targetUser.event?._id ?? null,
    });
  } catch (err) {
    console.error("producer staff impersonate error:", err);
    return Response.json({ success: false }, { status: 500 });
  }
}
