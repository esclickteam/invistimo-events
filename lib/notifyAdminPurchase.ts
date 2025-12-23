import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function notifyAdminPurchase({
  email,
  amount,
  currency,
  type,
  details,
}: {
  email: string;
  amount: number;
  currency: string;
  type: string;
  details?: string;
}) {
  await resend.emails.send({
    from: "Invistimo <onboarding@resend.dev>",
    to: [process.env.ALERT_EMAIL!],
    subject: "💳 רכישה חדשה במערכת",
    html: `
      <h2>רכישה חדשה</h2>
      <p><b>לקוח:</b> ${email}</p>
      <p><b>סוג:</b> ${type}</p>
      <p><b>סכום:</b> ${amount} ${currency.toUpperCase()}</p>
      ${details ? `<p><b>פרטים:</b> ${details}</p>` : ""}
      <hr />
      <p>Stripe webhook</p>
    `,
  });
}
