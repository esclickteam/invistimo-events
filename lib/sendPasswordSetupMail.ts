import crypto from "crypto";
import User from "@/models/User";
import { sendEmail } from "@/lib/sendEmail";

/* =========================================================
   SEND PASSWORD SETUP EMAIL
========================================================= */
export async function sendPasswordSetupMail(userId: string) {
  /* ===== TOKEN ===== */
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 שעות

  /* ===== UPDATE USER ===== */
  const user = await User.findByIdAndUpdate(
    userId,
    {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
      needsPasswordSetup: true,
    },
    { new: true }
  );

  if (!user) {
    throw new Error("USER_NOT_FOUND_FOR_PASSWORD_MAIL");
  }

  /* ===== LINK ===== */
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!baseUrl) {
    throw new Error("MISSING_NEXT_PUBLIC_SITE_URL");
  }

  const link = `${baseUrl}/set-password?token=${token}`;

  /* ===== SEND EMAIL ===== */
  await sendEmail({
    to: user.email,
    subject: "הגדרת סיסמה למערכת Invistimo",
    html: `
      <div style="font-family:Arial;direction:rtl;text-align:right">
        <h2>שלום ${user.name},</h2>

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
