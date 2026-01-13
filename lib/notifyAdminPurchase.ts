import { Resend } from "resend";

/* ============================================================
   INIT
============================================================ */
if (!process.env.RESEND_API_KEY) {
  throw new Error("❌ Missing RESEND_API_KEY");
}

const resend = new Resend(process.env.RESEND_API_KEY);

/* ============================================================
   TYPES
============================================================ */
type NotifyAdminPurchaseProps = {
  email: string;
  amount: number;
  currency: string;
  type: string;
  details?: string;
};

/* ============================================================
   MAIN
============================================================ */
export async function notifyAdminPurchase({
  email,
  amount,
  currency,
  type,
  details,
}: NotifyAdminPurchaseProps) {
  /* ================= ENV VALIDATION ================= */
  if (!process.env.ALERT_EMAIL) {
    console.error("❌ Missing ALERT_EMAIL");
    return;
  }

  const recipients = process.env.ALERT_EMAIL
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (!recipients.length) {
    console.error("❌ ALERT_EMAIL is empty");
    return;
  }

  /* ================= LOG ================= */
  console.log("📧 notifyAdminPurchase called", {
    email,
    amount,
    currency,
    type,
    details,
    recipients,
  });

  /* ================= SEND ================= */
  try {
    const result = await resend.emails.send({
      from: "Invistimo <support@invistimo.com>",
      to: recipients,
      subject: `רכישה חדשה במערכת – ${amount} ${currency.toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; line-height:1.6">
          <h2>בוצעה רכישה חדשה 🎉</h2>

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
            הודעה אוטומטית ממערכת Invistimo<br />
            מקור: Stripe Webhook
          </p>
        </div>
      `,
    });

    /* ================= HANDLE RESULT ================= */
    if (result.error) {
      console.error("❌ Resend returned error", {
        error: result.error,
        email,
        amount,
        currency,
        type,
      });
      return;
    }

    console.log("✅ Admin purchase email sent", {
      id: result.data?.id,
      recipients,
    });
  } catch (error: any) {
    console.error("❌ Failed to send admin purchase email", {
      message: error?.message,
      stack: error?.stack,
      email,
      amount,
      currency,
      type,
    });
  }
}
