export const PASSWORD_SMS_COOLDOWN_MS = 60 * 1000;
export const PASSWORD_SMS_DAILY_LIMIT = 5;
export const PASSWORD_SMS_DAY_MS = 24 * 60 * 60 * 1000;

export type PasswordSmsState = {
  status?: string | null;
  error?: string | null;
  sentAt?: Date | string | null;
  lastAttemptAt?: Date | string | null;
  attempts?: Array<Date | string> | null;
};

export function buildProducerClientPasswordSms(link: string) {
  return `שלום, נפתח עבורך חשבון במערכת Invistimo לניהול האירוע שלך. להגדרת סיסמה וכניסה למערכת: ${link}`;
}

export function shouldRateLimitProducerPasswordSms(user: {
  billingSource?: string | null;
  producerBilling?: {
    grantAccessBeforePayment?: boolean | null;
    payerProducerId?: unknown;
  } | null;
}) {
  if (String(user?.billingSource || "") === "producer") return true;
  if (user?.producerBilling?.grantAccessBeforePayment === true) return true;
  if (user?.producerBilling?.payerProducerId) return true;
  return false;
}

export function evaluatePasswordSmsRateLimit(
  state: PasswordSmsState | null | undefined,
  now: Date = new Date(),
) {
  const attempts = (state?.attempts || [])
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));
  const dayAgo = now.getTime() - PASSWORD_SMS_DAY_MS;
  const inDay = attempts.filter((value) => value.getTime() >= dayAgo);

  if (inDay.length >= PASSWORD_SMS_DAILY_LIMIT) {
    return { ok: false as const, code: "PASSWORD_SMS_DAILY_LIMIT" };
  }

  const last = state?.lastAttemptAt ? new Date(state.lastAttemptAt) : null;
  if (
    last &&
    !Number.isNaN(last.getTime()) &&
    now.getTime() - last.getTime() < PASSWORD_SMS_COOLDOWN_MS
  ) {
    return { ok: false as const, code: "PASSWORD_SMS_COOLDOWN" };
  }

  return { ok: true as const, code: "OK" };
}

export function passwordSmsStatusPatch(input: {
  status: "sent" | "failed" | "missing_phone";
  error?: string | null;
  now?: Date;
  countAttempt?: boolean;
}) {
  const now = input.now || new Date();
  const patch: Record<string, unknown> = {
    "producerBilling.passwordSms.status": input.status,
    "producerBilling.passwordSms.error": input.error || null,
    "producerBilling.passwordSms.lastAttemptAt": now,
  };

  if (input.status === "sent") {
    patch["producerBilling.passwordSms.sentAt"] = now;
  }

  const update: { $set: Record<string, unknown>; $push?: Record<string, unknown> } = {
    $set: patch,
  };

  if (input.countAttempt !== false && input.status === "sent") {
    update.$push = {
      "producerBilling.passwordSms.attempts": now,
    };
  }

  return update;
}
