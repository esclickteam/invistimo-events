import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const MAX_TEST_SMS = 10;

export async function GET() {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const used = user.testSmsUsed ?? 0;
    const remaining = Math.max(0, MAX_TEST_SMS - used);

    return NextResponse.json({
      max: MAX_TEST_SMS,
      used,
      remaining,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "FAILED" },
      { status: 500 }
    );
  }
}
