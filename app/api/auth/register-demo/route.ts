import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return NextResponse.json(
        { error: "USER_EXISTS" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      name: name || "משתמש דמו",
      email,
      password: hashedPassword,

      isTrial: true,
      trialStartedAt: now,
      trialExpiresAt: expiresAt,

      role: "user",

      // לא צריך להגדיר plan ידנית – ה-pre save עושה את זה
    });

    return NextResponse.json({
      success: true,
      message: "TRIAL_CREATED",
    });
  } catch (err) {
    console.error("CREATE TRIAL ERROR:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
