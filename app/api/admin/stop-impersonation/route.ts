import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST() {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // ❌ לא במצב התחזות
    if (!decoded.impersonatedByAdmin || !decoded.adminId) {
      return NextResponse.json(
        { error: "Not impersonating" },
        { status: 400 }
      );
    }

    const admin = await User.findById(decoded.adminId);
    if (!admin || admin.role !== "admin") {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    // 🔑 JWT חדש לאדמין
    const adminToken = jwt.sign(
      {
        userId: admin._id,
        role: "admin",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    const res = NextResponse.json({ success: true });

    res.cookies.set("authToken", adminToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("❌ Stop impersonation error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
