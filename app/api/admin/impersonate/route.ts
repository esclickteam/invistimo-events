import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    /* ======================================================
       🔐 אימות אדמין קיים
    ====================================================== */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ======================================================
       📥 קלט
    ====================================================== */
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    /* ======================================================
       🎭 JWT התחזות (משתמש אמיתי)
    ====================================================== */
    const impersonationToken = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,               // ⬅️ role של המשתמש!
        impersonatedByAdmin: true,
        adminId: decoded.userId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "30m" }
    );

    const res = NextResponse.json({ success: true });

    /* ======================================================
       🍪 Cookies – קריטי למידלוור
    ====================================================== */
    const baseCookie = {
      path: "/",
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    };

    // 🔐 Auth token (HttpOnly)
    res.cookies.set("authToken", impersonationToken, {
      ...baseCookie,
      httpOnly: true,
    });

    // 👤 role של המשתמש (לא admin!)
    res.cookies.set("role", user.role, {
      ...baseCookie,
      httpOnly: false,
    });

    // 🎭 דגל התחזות – מה שהמידלוור בודק
    res.cookies.set("impersonating", "true", {
      ...baseCookie,
      httpOnly: false,
    });

    return res;
  } catch (err) {
    console.error("❌ Impersonation error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
