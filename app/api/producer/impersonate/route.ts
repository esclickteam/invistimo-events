import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  await dbConnect();

  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Missing userId" },
      { status: 400 }
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 }
    );
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      role: "user",        // 👈 מתנהג כיוזר רגיל
      impersonated: true,  // 👈 סימון התחזות (לא חובה אבל מומלץ)
    },
    secret,
    { expiresIn: "7d" }
  );

  // 🔴 זה התיקון הקריטי
  const cookieStore = await cookies();
  cookieStore.set("token", token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  return NextResponse.json({ success: true });
}
