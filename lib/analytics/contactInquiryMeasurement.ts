import { isGaMeasurementId } from "@/lib/seo/analytics";

/** A contact-page success is counted once. GA4 is a separate, optional send. */
export const CLAIM_STALE_MS = 60_000;
export const MAX_GA_ATTEMPTS = 3;
/** Bound the visitor's wait. A silent Google endpoint must not hold the form. */
export const GA4_MP_TIMEOUT_MS = 2_000;
export const CONTACT_PAGE_CLIENT = "contact_page";
export const ANALYTICS_CONSENT_COOKIE = "invistimo_analytics";
export const CONTACT_PAGE_LOCATION = "https://www.invistimo.com/contact";

const SUBMISSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLIENT_ID = /^\d{1,20}\.\d{1,20}$/;
const SESSION_ID = /^\d{8,16}$/;

export type InquiryMeasurementStatus =
  | "pending"
  | "sent"
  | "skipped_consent"
  | "skipped_config"
  | "failed"
  | "failed_unconfirmed"
  | "timed_out";

export type MeasurementRecord = {
  submissionId: string;
  status: InquiryMeasurementStatus;
  attempts: number;
  claimedAt: number;
  hadClientId: boolean;
  hadSessionId: boolean;
  skipReason: string;
};

export type InquiryMeasurementStore = {
  get(submissionId: string): Promise<MeasurementRecord | null>;
  insert(record: MeasurementRecord): Promise<"ok" | "duplicate">;
  update(submissionId: string, patch: Partial<MeasurementRecord>): Promise<void>;
  compareAndSet(
    submissionId: string,
    expected: { status: InquiryMeasurementStatus; attempts: number },
    patch: Partial<MeasurementRecord>
  ): Promise<boolean>;
};

export type GenerateLeadPayload = {
  client_id: string;
  events: [
    {
      name: "generate_lead";
      params: {
        method: "contact";
        engagement_time_msec: number;
        page_location: string;
        session_id?: string;
      };
    },
  ];
};

export class Ga4MeasurementHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("GA4_MP_HTTP");
    this.name = "Ga4MeasurementHttpError";
    this.status = status;
  }
}

export class Ga4MeasurementNetworkError extends Error {
  constructor() {
    super("GA4_MP_NETWORK");
    this.name = "Ga4MeasurementNetworkError";
  }
}

export class Ga4MeasurementTimeoutError extends Error {
  constructor() {
    super("GA4_MP_TIMEOUT");
    this.name = "Ga4MeasurementTimeoutError";
  }
}

export function isContactSubmissionId(value: unknown): value is string {
  return typeof value === "string" && SUBMISSION_ID.test(value);
}

export function gaSessionCookieName(measurementId: string) {
  if (!isGaMeasurementId(measurementId)) return "";
  return `_ga_${measurementId.slice(2)}`;
}

export function readCookie(header: string | null, name: string) {
  if (!header || !name) return "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    try {
      return decodeURIComponent(trimmed.slice(eq + 1));
    } catch {
      return "";
    }
  }
  return "";
}

/** GA cookie value only. Anything else, including an email or phone, is dropped. */
export function parseGaClientId(cookieValue: string) {
  const parts = String(cookieValue || "").split(".").filter(Boolean);
  if (parts.length < 4) return "";
  const clientId = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  return CLIENT_ID.test(clientId) ? clientId : "";
}

export function parseGaSessionId(cookieValue: string) {
  const value = String(cookieValue || "");
  const gs2 = value.match(/(?:^|[.$])s(\d{8,16})(?:$|[.$])/);
  if (gs2 && SESSION_ID.test(gs2[1])) return gs2[1];
  const gs1 = value.match(/^GS1\.1\.(\d{8,16})\./);
  if (gs1 && SESSION_ID.test(gs1[1])) return gs1[1];
  return "";
}

/**
 * Opt-out only. Missing consent is not a denial: this site has no consent
 * banner, and an ad blocker is not one of these signals.
 */
export function measurementDenied(input: {
  gpc: string | null;
  dnt: string | null;
  consentCookie: string | null;
}) {
  if (String(input.gpc || "").trim() === "1") {
    return { denied: true, reason: "gpc" };
  }
  if (String(input.dnt || "").trim() === "1") {
    return { denied: true, reason: "dnt" };
  }
  const consent = String(input.consentCookie || "").trim().toLowerCase();
  if (consent === "denied" || consent === "0" || consent === "false") {
    return { denied: true, reason: "consent_cookie" };
  }
  return { denied: false, reason: "" };
}

export function createAnonymousClientId(random = Math.random, now = Date.now()) {
  const prefix = Math.floor(random() * 1_000_000_000);
  const suffix = Math.floor(now / 1000);
  return `${prefix}.${suffix}`;
}

export function buildGenerateLeadPayload(input: {
  clientId: string;
  sessionId?: string;
}): GenerateLeadPayload {
  if (!CLIENT_ID.test(input.clientId)) {
    throw new Error("INVALID_CLIENT_ID");
  }
  const params: GenerateLeadPayload["events"][0]["params"] = {
    method: "contact",
    engagement_time_msec: 1,
    page_location: CONTACT_PAGE_LOCATION,
  };
  if (input.sessionId && SESSION_ID.test(input.sessionId)) {
    params.session_id = input.sessionId;
  }
  return {
    client_id: input.clientId,
    events: [{ name: "generate_lead", params }],
  };
}

export function decideClaim(
  existing: MeasurementRecord | null,
  now: number
): "insert" | "send_retry" | "skip" {
  if (!existing) return "insert";
  if (
    existing.status === "sent" ||
    existing.status === "skipped_consent" ||
    existing.status === "skipped_config" ||
    existing.status === "failed_unconfirmed" ||
    existing.status === "timed_out"
  ) {
    return "skip";
  }
  if (
    existing.status === "pending" &&
    now - existing.claimedAt < CLAIM_STALE_MS
  ) {
    return "skip";
  }
  if (existing.attempts >= MAX_GA_ATTEMPTS) return "skip";
  if (existing.status === "failed" || existing.status === "pending") {
    return "send_retry";
  }
  return "skip";
}

export function summarizeInquiryMeasurements(records: MeasurementRecord[]) {
  return {
    inquiries: records.length,
    sentToGa4: records.filter((record) => record.status === "sent").length,
    skippedConsent: records.filter((record) => record.status === "skipped_consent")
      .length,
    skippedConfig: records.filter((record) => record.status === "skipped_config")
      .length,
    failed: records.filter((record) => record.status === "failed").length,
    failedUnconfirmed: records.filter(
      (record) => record.status === "failed_unconfirmed"
    ).length,
    timedOut: records.filter((record) => record.status === "timed_out").length,
  };
}

async function rememberSkip(
  store: InquiryMeasurementStore,
  submissionId: string,
  status: "skipped_consent" | "skipped_config",
  reason: string,
  now: number
) {
  const existing = await store.get(submissionId);
  if (!existing) {
    await store.insert({
      submissionId,
      status,
      attempts: 0,
      claimedAt: now,
      hadClientId: false,
      hadSessionId: false,
      skipReason: reason,
    });
    return status;
  }
  if (
    existing.status === "sent" ||
    existing.status === "skipped_consent" ||
    existing.status === "skipped_config" ||
    existing.status === "failed_unconfirmed" ||
    existing.status === "timed_out"
  ) {
    return existing.status;
  }
  await store.update(submissionId, { status, skipReason: reason });
  return status;
}

export async function measureContactPageInquiry(input: {
  contactPage: boolean;
  submissionId: unknown;
  gpc: string | null;
  dnt: string | null;
  consentCookie: string | null;
  gaCookie: string | null;
  sessionCookie: string | null;
  measurementId: string;
  apiSecret: string;
  now?: number;
  store: InquiryMeasurementStore;
  send: (payload: GenerateLeadPayload) => Promise<void>;
  createClientId?: () => string;
}) {
  if (!input.contactPage || !isContactSubmissionId(input.submissionId)) {
    return { outcome: "ignored" as const };
  }

  const submissionId = input.submissionId;
  const now = input.now ?? Date.now();
  const privacy = measurementDenied(input);
  if (privacy.denied) {
    const status = await rememberSkip(
      input.store,
      submissionId,
      "skipped_consent",
      privacy.reason,
      now
    );
    return { outcome: status };
  }

  const measurementId = input.measurementId.trim();
  const apiSecret = input.apiSecret.trim();
  if (!isGaMeasurementId(measurementId) || !apiSecret) {
    const status = await rememberSkip(
      input.store,
      submissionId,
      "skipped_config",
      !isGaMeasurementId(measurementId) ? "measurement_id" : "api_secret",
      now
    );
    return { outcome: status };
  }

  const existing = await input.store.get(submissionId);
  const decision = decideClaim(existing, now);
  if (decision === "skip") {
    return { outcome: "deduped" as const, status: existing?.status };
  }

  if (decision === "insert") {
    const inserted = await input.store.insert({
      submissionId,
      status: "pending",
      attempts: 1,
      claimedAt: now,
      hadClientId: false,
      hadSessionId: false,
      skipReason: "",
    });
    if (inserted === "duplicate") {
      const raced = await input.store.get(submissionId);
      if (!raced || decideClaim(raced, now) !== "send_retry") {
        return { outcome: "deduped" as const, status: raced?.status };
      }
      const claimed = await input.store.compareAndSet(
        submissionId,
        { status: raced.status, attempts: raced.attempts },
        {
          status: "pending",
          attempts: raced.attempts + 1,
          claimedAt: now,
        }
      );
      if (!claimed) return { outcome: "deduped" as const, status: raced?.status };
    }
  } else if (existing) {
    const claimed = await input.store.compareAndSet(
      submissionId,
      { status: existing.status, attempts: existing.attempts },
      {
        status: "pending",
        attempts: existing.attempts + 1,
        claimedAt: now,
      }
    );
    if (!claimed) return { outcome: "deduped" as const, status: existing.status };
  }

  const clientIdFromCookie = parseGaClientId(input.gaCookie || "");
  const sessionId = parseGaSessionId(input.sessionCookie || "");
  const clientId =
    clientIdFromCookie ||
    (input.createClientId ? input.createClientId() : createAnonymousClientId());
  const hadClientId = Boolean(clientIdFromCookie);
  const hadSessionId = Boolean(sessionId);

  try {
    await input.send(
      buildGenerateLeadPayload({
        clientId,
        sessionId: hadSessionId ? sessionId : undefined,
      })
    );
    await input.store.update(submissionId, {
      status: "sent",
      hadClientId,
      hadSessionId,
      skipReason: "",
    });
    return { outcome: "sent" as const };
  } catch (error) {
    const status =
      error instanceof Ga4MeasurementHttpError
        ? "failed"
        : error instanceof Ga4MeasurementTimeoutError
          ? "timed_out"
          : "failed_unconfirmed";
    await input.store.update(submissionId, { status, hadClientId, hadSessionId });
    return { outcome: status };
  }
}
