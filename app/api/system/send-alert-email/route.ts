import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { balance } = await req.json();

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: true, // 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Invistimo System" <${process.env.EMAIL_USER}>`,
      to: process.env.ALERT_EMAIL,
      subject: "⚠️ יתרת SMS נמוכה במערכת Invistimo",
      html: `
        <div style="font-family: Arial; direction: rtl">
          <h2>⚠️ התראת מערכת</h2>
          <p>יתרת ה-SMS של המערכת ירדה מתחת לסף.</p>
          <p><strong>📩 יתרה נוכחית:</strong> ${balance}</p>
          <p><strong>⏱ זמן:</strong> ${new Date().toLocaleString("he-IL")}</p>
          <hr />
          <p style="color:#666">Invistimo</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: "Mail failed" },
      { status: 500 }
    );
  }
}
