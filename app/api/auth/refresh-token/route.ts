import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body?.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ Missing JWT_SECRET");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    await connectDB();

    const user = await User.findById(userId).lean();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    /* ======================================================
       יצירת JWT חדש (כולל hasPaid)
    ====================================================== */
    const payload = {
      userId: String(user._id),
      role: user.role,
      hasPaid: user.hasPaid === true,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const res = NextResponse.json({ success: true });

    /* ======================================================
       Cookie – חייב להיות זהה לקיים
    ====================================================== */
    res.cookies.set("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 ימים
    });

    return res;
  } catch (err) {
    console.error("❌ refresh-token error", err);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
