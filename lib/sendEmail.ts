import { Resend } from "resend";

type SendEmailProps = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Transactional mail for password setup / reset / staff invites.
 * Uses Resend (same provider as contact + admin purchase alerts).
 */
export async function sendEmail({ to, subject, html, text }: SendEmailProps) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("❌ Missing RESEND_API_KEY");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const result = await resend.emails.send({
    from: "Invistimo <support@invistimo.com>",
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
    replyTo: "support@invistimo.com",
  });

  if (result.error) {
    throw new Error(
      `Resend send failed: ${result.error.message || JSON.stringify(result.error)}`,
    );
  }

  console.log("📧 sendEmail ok", {
    to,
    subject,
    id: result.data?.id || null,
  });

  return result.data;
}
