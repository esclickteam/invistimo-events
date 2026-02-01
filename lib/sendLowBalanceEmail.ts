// lib/sendLowBalanceEmail.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLowBalanceEmail(balance: number) {
  return resend.emails.send({
    from: "Invistimo Alerts <alerts@invistimo.com>",
    to: process.env.ALERT_EMAIL!,
    subject: "⚠️ יתרת SMS נמוכה",
    html: `
      <h2>התראת יתרה נמוכה</h2>
      <p>יתרת ההודעות ירדה מתחת ל־2000.</p>
      <p><strong>יתרה נוכחית:</strong> ${balance}</p>
      <p>מומלץ לבצע טעינה בהקדם.</p>
    `,
  });
}
