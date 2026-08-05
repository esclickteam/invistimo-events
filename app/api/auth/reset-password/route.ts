import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: "MISSING_PARAMS" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "PASSWORD_TOO_SHORT" },
        { status: 400 },
      );
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).select("_id email phone");

    if (!user) {
      return NextResponse.json(
        { success: false, error: "TOKEN_INVALID_OR_EXPIRED" },
        { status: 400 },
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    // updateOne avoids mongoose undefined-not-unsetting token fields,
    // and always clears needsPasswordSetup so login works afterwards.
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashed,
          needsPasswordSetup: false,
        },
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpires: "",
        },
      },
    );

    try {
      const { revokeTelnyxWebRtcForUser } = await import(
        "@/lib/telnyx/webrtcCredentials"
      );
      await revokeTelnyxWebRtcForUser(String(user._id), "password_changed");
    } catch {
      console.error("TELNYX WEBRTC REVOKE ON RESET PASSWORD FAILED");
    }

    return NextResponse.json({
      success: true,
      email: user.email || "",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
