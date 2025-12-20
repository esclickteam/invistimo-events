import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { nanoid } from "nanoid";
import { sendEmail } from "@/lib/sendEmail";

export async function POST(req: Request) {
  await dbConnect();
  const { email } = await req.json();

  const user = await User.findOne({ email });
  if (!user) {
    // לא מגלים אם האימייל קיים
    return NextResponse.json({ success: true });
  }

  const token = nanoid(32);
  user.resetPasswordToken = token;
  user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30); // 30 דקות
  await user.save();

  const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password/${token}`;

  await sendEmail({
    to: email,
    subject: "איפוס סיסמה",
    html: `
      <p>לחצי על הקישור כדי לאפס סיסמה:</p>
      <a href="${resetLink}">${resetLink}</a>
    `,
  });

  return NextResponse.json({ success: true });
}
