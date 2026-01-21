import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/* =========================
   Cookie helper (TS-safe)
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

    /* ======================================================
       🔐 אימות אדמין
    ====================================================== */
    const cookieStore = await getCookieStore();

    const token =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    /* ======================================================
       📥 קלט
    ====================================================== */
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

    /* ======================================================
       🎭 JWT התחזות (מודל אחיד + תאימות לאחור)
    ====================================================== */
    const impersonationToken = jwt.sign(
      {
        userId: user._id.toString(),

        // 🔥 ROLE אחיד שהדשבורד מכיר
        role: "user",

        // 🧩 תאימות לאחור – לא מוחקים כלום
        legacyRole: "client",

        impersonated: true,
        impersonatedBy: decoded.userId,
        impersonationRole: "admin",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "30m" }
    );

    /* ======================================================
       🍪 Cookies
    ====================================================== */
    const res = NextResponse.json({ success: true });

    res.cookies.set("authToken", impersonationToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // תאימות לאחור (אם יש middleware שמחפש token)
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
