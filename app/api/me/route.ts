import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  try {
    await connectDB();

    const cookieStore = await cookies(); // ⭐ חובה await ב-Next.js 16
    const token = cookieStore.get("authToken")?.value;

    if (!token) return NextResponse.json({ user: null });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // ⭐ תיקון קריטי: decoded.userId ולא decoded.id
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
