import crypto from "crypto";
import User from "@/models/User";
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
   SEND PASSWORD SETUP SMS (email disabled)
========================================================= */
export async function sendPasswordSetupMail(
  userId: string,
  _options?: { alsoSms?: boolean },
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
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://invistimo.com";

  const link = `${baseUrl.replace(/\/$/, "")}/set-password?token=${token}`;
  const email = String(user.email || "").trim().toLowerCase();
  const phone = String(user.phone || "").trim();

  const result: PasswordSetupDelivery = {
    link,
    email,
    phone,
    emailSent: false,
    smsSent: false,
  };

  /*
    The reset token is already saved on the user. Missing phone or SMS
    gateway errors must not fail account creation — callers can still
    share the setup link manually.
  */
  if (!phone) {
    result.smsError = "MISSING_PHONE_FOR_PASSWORD_SMS";
    console.error("SEND PASSWORD SETUP SMS FAILED: missing phone", {
      userId,
      email,
    });
    return result;
  }

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

  return result;
}
