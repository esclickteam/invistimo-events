import crypto from "crypto";
import User from "@/models/User";
import { sendEmail } from "@/lib/sendEmail";
import { sendSMS } from "@/lib/sendSMS";

export type PasswordSetupDelivery = {
  link: string;
  email: string;
  phone: string;
  emailSent: boolean;
  smsSent: boolean;
  emailError?: string;
  smsError?: string;
};

/* =========================================================
   SEND PASSWORD SETUP EMAIL (+ optional SMS backup)
========================================================= */
export async function sendPasswordSetupMail(
  userId: string,
  options?: { alsoSms?: boolean },
): Promise<PasswordSetupDelivery> {
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
    { new: true },
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
  const email = String(user.email || "").trim().toLowerCase();
  const phone = String(user.phone || "").trim();
  const name = String(user.name || "").trim() || "לקוח/ה";

  const result: PasswordSetupDelivery = {
    link,
    email,
    phone,
    emailSent: false,
    smsSent: false,
  };

  /* ===== SEND EMAIL ===== */
  try {
    await sendEmail({
      to: email,
      subject: "הגדרת סיסמה למערכת Invistimo",
      html: `
      <div style="font-family:Arial;direction:rtl;text-align:right">
        <h2>שלום ${name},</h2>

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
      text: `שלום ${name},\n\nהחשבון שלך נוצר בהצלחה.\nכדי להגדיר סיסמה היכנסו לקישור:\n${link}\n\nהקישור תקף ל־24 שעות.\nצוות Invistimo`,
    });
    result.emailSent = true;
  } catch (mailError) {
    result.emailError =
      mailError instanceof Error ? mailError.message : String(mailError);
    console.error("SEND PASSWORD SETUP MAIL FAILED:", mailError);
  }

  /* ===== SMS BACKUP ===== */
  const shouldSms = options?.alsoSms !== false && Boolean(phone);
  if (shouldSms) {
    try {
      await sendSMS({
        to: phone,
        message: `Invistimo: להגדרת סיסמה לחשבון לחצו כאן: ${link}`,
      });
      result.smsSent = true;
    } catch (smsError) {
      result.smsError =
        smsError instanceof Error ? smsError.message : String(smsError);
      console.error("SEND PASSWORD SETUP SMS FAILED:", smsError);
    }
  }

  if (!result.emailSent && !result.smsSent) {
    throw new Error(
      result.emailError ||
        result.smsError ||
        "PASSWORD_SETUP_DELIVERY_FAILED",
    );
  }

  return result;
}
