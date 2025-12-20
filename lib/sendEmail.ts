import nodemailer from "nodemailer";

type SendEmailProps = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailProps) {
  if (
    !process.env.EMAIL_HOST ||
    !process.env.EMAIL_PORT ||
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS
  ) {
    throw new Error("❌ Missing EMAIL SMTP environment variables");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT), // 465
    secure: true, // ✅ חובה בפורט 465
    auth: {
      user: process.env.EMAIL_USER, // support@invistimo.com
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Invistimo" <noreply@invistimo.com>`, // 👈 מה שהלקוח רואה
    to,
    subject,
    html,
    replyTo: "support@invistimo.com", // אופציונלי ומומלץ
  });
}
