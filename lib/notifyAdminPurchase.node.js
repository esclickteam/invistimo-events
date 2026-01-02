const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function notifyAdminPurchase({
  email,
  amount,
  currency,
  type,
  details,
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("❌ Missing RESEND_API_KEY");
  }

  if (!process.env.ALERT_EMAIL) {
    throw new Error("❌ Missing ALERT_EMAIL");
  }

  await resend.emails.send({
    // ✅ שולח מדומיין מאומת – נכנס ל-Inbox
    from: "Invistimo <support@invistimo.com>",

    // ✅ אפשר כמה נמענים עם פסיק
    to: process.env.ALERT_EMAIL.split(","),

    // ✅ subject נקי (אנטי־ספאם)
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
          הודעה אוטומטית ממערכת Invistimo (Stripe Webhook)
        </p>
      </div>
    `,
  });
}

module.exports = { notifyAdminPurchase };
