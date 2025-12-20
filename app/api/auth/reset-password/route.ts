import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  await dbConnect();

  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json(
      { success: false, error: "MISSING_PARAMS" },
      { status: 400 }
    );
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, error: "TOKEN_INVALID_OR_EXPIRED" },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(password, 10);

  user.password = hashed;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  return NextResponse.json({ success: true });
}
