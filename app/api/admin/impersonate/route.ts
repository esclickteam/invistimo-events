import { NextResponse } from "next/server";
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 🎭 טוקן התחזות
    const impersonationToken = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        impersonatedByAdmin: true,
        adminId: decoded.userId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "30m" }
    );

    const res = NextResponse.json({ success: true });

    res.cookies.set("authToken", impersonationToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("❌ Impersonation error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
