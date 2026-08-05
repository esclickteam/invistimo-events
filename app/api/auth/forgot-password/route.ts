import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { nanoid } from "nanoid";
import { sendSMS } from "@/lib/sendSMS";

export async function POST(req: Request) {
  await dbConnect();

  const { email } = await req.json();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return NextResponse.json({ success: true });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    // 🔒 לא מגלים אם האימייל קיים
    return NextResponse.json({ success: true });
  }

  const phone = String(user.phone || "").trim();
  if (!phone) {
    console.error("FORGOT PASSWORD SMS FAILED: missing phone", {
      email: normalizedEmail,
      userId: String(user._id),
    });
    return NextResponse.json(
      { success: false, error: "SMS_SEND_FAILED" },
      { status: 500 },
    );
  }

  const token = nanoid(32);
  user.resetPasswordToken = token;
  user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30); // 30 דקות
  await user.save();

  const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password/${token}`;

  try {
    await sendSMS({
      to: phone,
      message: `Invistimo: לאיפוס סיסמה לחצו כאן: ${resetLink}`,
    });
  } catch (smsError) {
    console.error("FORGOT PASSWORD SMS FAILED:", smsError);
    return NextResponse.json(
      { success: false, error: "SMS_SEND_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
