import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: "Invistimo <onboarding@resend.dev>",
      to: ["support@invistimo.com"],
      replyTo: email,
      subject: "פנייה חדשה מטופס יצירת קשר – Invistimo",
      html: `
        <div style="font-family: Heebo, Arial; direction: rtl">
          <h2>פנייה חדשה מהאתר</h2>
          <p><strong>שם:</strong> ${name}</p>
          <p><strong>אימייל:</strong> ${email}</p>
          <p><strong>הודעה:</strong></p>
          <p>${message.replace(/\n/g, "<br />")}</p>
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
