import nodemailer from "nodemailer";

type SendEmailProps = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Password setup / reset / staff invites — Box/cPanel SMTP only.
 * Contact form and admin purchase alerts use Resend separately.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailProps) {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 465);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error("❌ Missing EMAIL SMTP environment variables");
  }

  // From must match the authenticated mailbox on Box/cPanel.
  // Using noreply@ while auth is support@ gets rejected/dropped.
  const fromAddress = user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user,
      pass,
    },
  });

  const info = await transporter.sendMail({
    from: `"Invistimo" <${fromAddress}>`,
    to,
    subject,
    html,
    text:
      text ||
      html
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    replyTo: fromAddress,
  });

  console.log("📧 SMTP sendEmail ok", {
    to,
    subject,
    from: fromAddress,
    messageId: info.messageId || null,
    response: info.response || null,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
  });

  return info;
}
