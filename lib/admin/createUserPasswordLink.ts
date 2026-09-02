import crypto from "crypto";

import User from "@/models/User";
import { shortenUrl } from "@/lib/shortenUrl";

export type PasswordLinkPurpose = "setup" | "reset";

const SETUP_TTL_MS = 1000 * 60 * 60 * 24;
const RESET_TTL_MS = 1000 * 60 * 30;

export function getPasswordLinkBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://invistimo.com"
  ).replace(/\/$/, "");
}

export function buildPasswordTargetUrl(
  purpose: PasswordLinkPurpose,
  token: string,
) {
  const baseUrl = getPasswordLinkBaseUrl();
  if (purpose === "setup") {
    return `${baseUrl}/set-password?token=${token}`;
  }
  return `${baseUrl}/reset-password/${token}`;
}

export function buildPasswordSmsMessage(
  purpose: PasswordLinkPurpose,
  link: string,
) {
  if (purpose === "setup") {
    return `Invistimo: להגדרת סיסמה לחשבון לחצו כאן: ${link}`;
  }
  return `Invistimo: לאיפוס סיסמה לחצו כאן: ${link}`;
}

export async function createUserPasswordLink(params: {
  userId: string;
  purpose: PasswordLinkPurpose;
}) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(
    Date.now() + (params.purpose === "setup" ? SETUP_TTL_MS : RESET_TTL_MS),
  );

  const update: Record<string, unknown> = {
    resetPasswordToken: token,
    resetPasswordExpires: expires,
  };

  if (params.purpose === "setup") {
    update.needsPasswordSetup = true;
  }

  const user = await User.findByIdAndUpdate(params.userId, update, {
    new: true,
  }).select("email phone name");

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const longLink = buildPasswordTargetUrl(params.purpose, token);
  const shortLink = await shortenUrl(longLink);

  return {
    purpose: params.purpose,
    longLink,
    shortLink,
    expiresAt: expires.toISOString(),
    email: String(user.email || "").trim().toLowerCase(),
    phone: String(user.phone || "").trim(),
    name: String(user.name || "").trim(),
  };
}
