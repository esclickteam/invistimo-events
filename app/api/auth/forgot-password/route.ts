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
    // 🔒 לא מגלים אם האימייל קיים
    return NextResponse.json({ success: true });
  }

  const token = nanoid(32);
  user.resetPasswordToken = token;
  user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30); // 30 דקות
  await user.save();

  const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password/${token}`;

  /* ============================================================
     HTML RTL למייל (יישור לימין)
  ============================================================ */
  const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
  </head>
  <body style="
    margin: 0;
    padding: 0;
    background-color: #f7f3ee;
    font-family: Arial, Helvetica, sans-serif;
    direction: rtl;
    text-align: right;
  ">
    <div style="
      max-width: 520px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      padding: 24px 28px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    ">
      <h2 style="margin-top: 0; color: #5c4632;">
        איפוס סיסמה
      </h2>

      <p style="color: #444; line-height: 1.6;">
        כדי לאפס את הסיסמה שלך, לחצי על הכפתור הבא:
      </p>

      <div style="margin: 24px 0; text-align: right;">
        <a
          href="${resetLink}"
          style="
            background: #cbb39a;
            color: #ffffff;
            padding: 12px 20px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: bold;
            display: inline-block;
          "
        >
          איפוס סיסמה
        </a>
      </div>

      <p style="font-size: 14px; color: #555;">
        הקישור תקף ל־30 דקות.
      </p>

      <p style="font-size: 13px; color: #777;">
        אם לא ביקשת איפוס סיסמה – ניתן להתעלם מהמייל.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

      <p style="font-size: 12px; color: #999;">
        Invistimo · הודעה אוטומטית · אין להשיב למייל זה
      </p>
    </div>
  </body>
</html>
`;

  try {
    await sendEmail({
      to: email,
      subject: "איפוס סיסמה – Invistimo",
      html,
      text: `איפוס סיסמה\n\nכדי לאפס את הסיסמה היכנסו לקישור:\n${resetLink}\n\nהקישור תקף ל־30 דקות.\nאם לא ביקשתם איפוס – התעלמו מהודעה זו.\nצוות Invistimo`,
    });
  } catch (mailError) {
    console.error("FORGOT PASSWORD MAIL FAILED:", mailError);
    return NextResponse.json(
      { success: false, error: "MAIL_SEND_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
