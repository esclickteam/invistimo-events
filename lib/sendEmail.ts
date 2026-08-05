import { Resend } from "resend";

type SendEmailProps = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Transactional mail for password setup / reset / staff invites.
 * Uses Resend (same provider as contact + admin purchase alerts).
 * SMTP was unreliable in production and failures were easy to miss.
 */
export async function sendEmail({ to, subject, html }: SendEmailProps) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("❌ Missing RESEND_API_KEY");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const result = await resend.emails.send({
    from: "Invistimo <support@invistimo.com>",
    to,
    subject,
    html,
    replyTo: "support@invistimo.com",
  });

  if (result.error) {
    throw new Error(
      `Resend send failed: ${result.error.message || JSON.stringify(result.error)}`,
    );
  }

  return result.data;
}
