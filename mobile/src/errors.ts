const GENERIC: Record<string, string> = {
  UNAUTHORIZED: "יש להתחבר מחדש",
  INVALID_SESSION: "ההתחברות פגה. התחברו שוב.",
  FORBIDDEN: "אין הרשאה לפעולה הזו",
  NOT_FOUND: "הפריט לא נמצא",
  SERVER_ERROR: "השירות לא זמין כרגע. נסו שוב בעוד רגע.",
  NETWORK: "אין חיבור לאינטרנט",
  TIMEOUT: "החיבור איטי מהרגיל. נסו שוב.",
  RATE_LIMIT: "יותר מדי בקשות. נסו שוב מאוחר יותר.",
  MAINTENANCE: "השירות בתחזוקה כרגע. נסו שוב בעוד כמה דקות.",
};

function looksSensitive(raw: string) {
  if (/eyJ[A-Za-z0-9_-]+\./.test(raw)) return true;
  if (/token/i.test(raw) && raw.length > 40) return true;
  if (/mongo|stack|at\s+\S+\s+\(/i.test(raw)) return true;
  return false;
}

export function customerError(
  status?: number,
  data?: unknown,
  fallback = "משהו השתבש. נסו שוב."
) {
  if (status === 401) return GENERIC.UNAUTHORIZED;
  if (status === 403) return GENERIC.FORBIDDEN;
  if (status === 404) return GENERIC.NOT_FOUND;
  if (status === 429) return GENERIC.RATE_LIMIT;
  if (status === 503) return GENERIC.MAINTENANCE;
  if (status && status >= 500) return GENERIC.SERVER_ERROR;

  if (!data || typeof data !== "object") return fallback;
  const body = data as Record<string, unknown>;
  const raw = String(body.message || body.error || "").trim();
  if (!raw) return fallback;
  if (GENERIC[raw]) return GENERIC[raw];
  if (looksSensitive(raw) || /^[A-Z0-9_]+$/.test(raw)) return fallback;
  return raw;
}

export const networkErrorMessage = GENERIC.NETWORK;
export const timeoutErrorMessage = GENERIC.TIMEOUT;
export const invalidSessionMessage = GENERIC.INVALID_SESSION;
