import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/* =========================
   Cookie helper
========================= */
async function getCookieStore() {
  const store = cookies();
  return store instanceof Promise ? await store : store;
}

/* =========================
   POST /api/admin/impersonate
========================= */
export async function POST(req: Request) {
  try {
    await connectDB();

    const cookieStore = await getCookieStore();

    const adminToken =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    if (!adminToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(adminToken, process.env.JWT_SECRET!);

    if (decoded.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    /* =========================
       🎭 Impersonation Token
    ========================= */
    const impersonationToken = jwt.sign(
      {
        userId: user._id.toString(),
        role: "client", // ⚠️ נשאר כמו אצלך
        impersonated: true,
        impersonatedBy: decoded.userId,
        impersonationRole: "admin",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "30m" }
    );

    const res = NextResponse.json({ success: true });

    /* =========================
       🧠 שמירת טוקן אדמין
    ========================= */
    res.cookies.set("adminToken", adminToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    /* =========================
       🔁 החלפת authToken (כמו היום)
    ========================= */
    res.cookies.set("authToken", impersonationToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    res.cookies.set("token", impersonationToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (err) {
    console.error("❌ Admin impersonation error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
