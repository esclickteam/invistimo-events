import { sendSMS } from "@/lib/sendSMS";

function toAbsoluteUrl(url: string) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://invistimo.com"
  ).replace(/\/+$/, "");

  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}

export async function sendSignedAgreementThanksSms({
  phone,
  agreementUrl,
}: {
  phone?: string | null;
  agreementUrl?: string | null;
}) {
  const to = String(phone || "").trim();
  const link = toAbsoluteUrl(String(agreementUrl || ""));

  if (!to || !link) {
    return { sent: false, reason: "MISSING_PHONE_OR_AGREEMENT_URL" as const };
  }

  await sendSMS({
    to,
    message: `תודה שבחרת ב-Invistimo לתת לך את השירות. מצורף ההסכם לצפייה: ${link}`,
  });

  return { sent: true as const };
}
