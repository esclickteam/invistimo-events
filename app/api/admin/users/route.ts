import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  try {
    await connectDB();

    const cookieStore = await cookies(); // ✅ חובה await
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.role !== "admin") {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const users = await User.find({})
      .select(
        "email name role plan includeCalls callsRounds createdAt"
      )
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, users });
  } catch (err) {
    console.error("ADMIN USERS ERROR:", err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
