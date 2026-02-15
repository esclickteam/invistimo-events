import { sendEmail } from "@/lib/sendEmail";

/* =========================================================
   SEND PASSWORD SETUP EMAIL
========================================================= */
export async function sendPasswordSetupMail(
  email: string,
  token: string
) {
  /* ===== BASE URL ===== */
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!baseUrl) {
    throw new Error("MISSING_NEXT_PUBLIC_SITE_URL");
  }

  /* ===== LINK ===== */
  const link = `${baseUrl}/set-password?token=${token}`;

  /* ===== SEND EMAIL ===== */
  await sendEmail({
    to: email,
    subject: "הגדרת סיסמה למערכת Invistimo",
    html: `
      <div style="font-family:Arial;direction:rtl;text-align:right">
        <h2>שלום,</h2>

        <p>החשבון שלך נוצר בהצלחה 🎉</p>

        <p>כדי להתחיל להשתמש במערכת, יש להגדיר סיסמה:</p>

        <p>
          <a
            href="${link}"
            style="
              display:inline-block;
              padding:12px 20px;
              background:#3A2B23;
              color:#ffffff;
              border-radius:8px;
              text-decoration:none;
              font-weight:bold;
            "
            target="_blank"
          >
            להגדרת סיסמה
          </a>
        </p>

        <p style="margin-top:20px;font-size:12px;color:#666">
          הקישור תקף ל־24 שעות.
          <br />
          אם לא ביקשת ליצור חשבון – ניתן להתעלם מהמייל.
        </p>

        <p style="margin-top:30px">
          צוות Invistimo
        </p>
      </div>
    `,
  });
}
