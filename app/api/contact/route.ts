import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }

    if (!process.env.SUPPORT_EMAIL) {
      throw new Error("Missing SUPPORT_EMAIL");
    }

    const body = await req.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    // ✅ ניקוי רווחים – קריטי לשליחה לכמה נמענים
    const recipients = process.env.SUPPORT_EMAIL
      .split(",")
      .map((addr) => addr.trim())
      .filter(Boolean);

    await resend.emails.send({
      // ✅ שולח מדומיין מאומת
      from: "Invistimo <support@invistimo.com>",

      // ✅ Outlook + Gmail (בלי רווחים)
      to: recipients,

      // ✅ תשובה חוזרת ללקוח
      replyTo: email,

      subject: subject
        ? `פנייה חדשה: ${subject}`
        : "פנייה חדשה מטופס יצירת קשר – Invistimo",

      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; line-height:1.6">
          <h2>פנייה חדשה מהאתר</h2>

          <p><strong>שם:</strong> ${name}</p>
          <p><strong>אימייל:</strong> ${email}</p>

          <p><strong>הודעה:</strong></p>
          <p>${message.replace(/\n/g, "<br />")}</p>

          <hr />

          <p style="font-size:12px;color:#666">
            נשלח אוטומטית מטופס יצירת קשר באתר Invistimo
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CONTACT FORM ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
