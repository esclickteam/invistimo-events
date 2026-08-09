import {
  detectExternalSendsMode,
  evaluateEnvironmentSafety,
} from "@/lib/env/safetyGuards";
import { resolveAppEnv } from "@/lib/env/appEnv";

export type ExternalChannel = "email" | "sms" | "whatsapp";

function clean(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function parseAllowlist(envName: string) {
  return String(process.env[envName] || "")
    .split(/[,\s]+/)
    .map((v) => clean(v))
    .filter(Boolean);
}

/**
 * Gate for customer-facing sends.
 * Staging/preview default: blocked unless allowlisted.
 */
export function assertExternalSendAllowed(params: {
  channel: ExternalChannel;
  to: string;
}): { allowed: boolean; reason: string } {
  const mode = detectExternalSendsMode();
  const appEnv = resolveAppEnv();
  const to = clean(params.to);

  if (mode === "enabled") {
    return { allowed: true, reason: "enabled" };
  }

  if (mode === "disabled") {
    return {
      allowed: false,
      reason: `EXTERNAL_SENDS_DISABLED (${appEnv}/${params.channel})`,
    };
  }

  // allowlist
  const emailList = parseAllowlist("EXTERNAL_SENDS_EMAIL_ALLOWLIST");
  const phoneList = parseAllowlist("EXTERNAL_SENDS_PHONE_ALLOWLIST");

  if (params.channel === "email") {
    if (emailList.includes(to)) {
      return { allowed: true, reason: "allowlist-email" };
    }
    return {
      allowed: false,
      reason: "EMAIL_NOT_IN_EXTERNAL_SENDS_EMAIL_ALLOWLIST",
    };
  }

  const digits = to.replace(/\D/g, "");
  if (
    phoneList.some(
      (p) => digits.endsWith(p.replace(/\D/g, "")) || p.replace(/\D/g, "") === digits
    )
  ) {
    return { allowed: true, reason: "allowlist-phone" };
  }

  return {
    allowed: false,
    reason: "PHONE_NOT_IN_EXTERNAL_SENDS_PHONE_ALLOWLIST",
  };
}

export function getExternalSendSafetySnapshot() {
  const safety = evaluateEnvironmentSafety();
  return {
    appEnv: safety.appEnv,
    mode: safety.evidence.externalSends,
  };
}
