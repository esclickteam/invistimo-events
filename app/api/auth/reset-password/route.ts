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

  try {
    const { revokeTelnyxWebRtcForUser } = await import(
      "@/lib/telnyx/webrtcCredentials"
    );
    await revokeTelnyxWebRtcForUser(String(user._id), "password_changed");
  } catch {
    console.error("TELNYX WEBRTC REVOKE ON RESET PASSWORD FAILED");
  }

  return NextResponse.json({ success: true });
}
