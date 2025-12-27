import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

type NotifyAdminPurchaseProps = {
  email: string;
  amount: number;
  currency: string;
  type: string;
  details?: string;
};

export async function notifyAdminPurchase({
  email,
  amount,
  currency,
  type,
  details,
}: NotifyAdminPurchaseProps) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("❌ Missing RESEND_API_KEY");
  }

  if (!process.env.ALERT_EMAIL) {
    throw new Error("❌ Missing ALERT_EMAIL (admin notification email)");
  }

   await resend.emails.send({
    from: "Invistimo <onboarding@resend.dev>",
    // 🔒 בפרודקשן מומלץ:
    // Invistimo <noreply@invistimo.com>

    to: [process.env.ALERT_EMAIL], // 👉 invistimo9@gmail.com

    subject: `💰 רכישה חדשה – ${amount} ${currency.toUpperCase()}`,

    html: `
      <div style="font-family: Arial, sans-serif; direction: rtl">
        <h2>🎉 בוצעה רכישה חדשה</h2>

        <p><b>אימייל לקוח:</b> ${email}</p>
        <p><b>סוג רכישה:</b> ${type}</p>
        <p><b>סכום:</b> ${amount} ${currency.toUpperCase()}</p>

        ${
          details
            ? `<p><b>פרטים נוספים:</b> ${details}</p>`
            : ""
        }

        <hr />

        <p style="color:#666;font-size:12px">
          נשלח אוטומטית מ־Stripe Webhook
        </p>
      </div>
    `,
  });
}
