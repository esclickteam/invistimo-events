import { contactMeasurementPageLocation } from "@/lib/analytics/contactInquiryMeasurement";
import type { GenerateLeadPayload } from "@/lib/analytics/contactInquiryMeasurement";
import { resolveAppEnv } from "@/lib/env/appEnv";

const SUBMISSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UTM_FIELDS = [
  ["utm_source", "utmSource"],
  ["utm_medium", "utmMedium"],
  ["utm_campaign", "utmCampaign"],
  ["utm_content", "utmContent"],
  ["utm_term", "utmTerm"],
] as const;

export type ContactUtmField = (typeof UTM_FIELDS)[number][1];

export type ContactAttribution = {
  pagePath: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
};

export type ContactSubmissionResult = "sent" | "blocked" | "lead_failed" | "error";

export type ContactSubmissionLog = {
  event: "contact_submission";
  submissionId: string;
  path: "/api/contact";
  at: string;
  status: number;
  result: ContactSubmissionResult;
  leadSaved: boolean;
  pagePath: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  pageLocation: string;
};

export function createContactSubmissionId(
  randomUUID: () => string = () => crypto.randomUUID()
) {
  const id = randomUUID();
  if (!isContactSubmissionId(id)) {
    throw new Error("INVALID_SUBMISSION_ID");
  }
  return id;
}

export function isContactSubmissionId(value: unknown) {
  return SUBMISSION_ID.test(String(value || "").trim());
}

function cleanLabel(value: unknown) {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f]+/g, " ")
    .trim()
    .slice(0, 120);
  if (!text || text.includes("@") || /\d{8,}/.test(text)) return "";
  return text;
}

function pagePathFrom(value: unknown) {
  const raw = String(value ?? "").trim();
  if (
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("?") ||
    raw.includes("#") ||
    raw.includes("@") ||
    raw.length > 160
  ) {
    return "";
  }
  return raw;
}

function refererUrl(value: unknown) {
  try {
    return new URL(String(value || ""));
  } catch {
    return null;
  }
}

function hostFrom(value: unknown) {
  const url = refererUrl(value);
  if (!url) return "";
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!host || host.length > 120 || host.includes("@")) return "";
  return host;
}

function utmFromSearch(url: URL | null) {
  const result: Record<ContactUtmField, string> = {
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: "",
  };
  if (!url) return result;
  for (const [queryKey, field] of UTM_FIELDS) {
    result[field] = cleanLabel(url.searchParams.get(queryKey));
  }
  return result;
}

export function readContactAttribution(input: {
  referer?: string | null;
  body?: unknown;
}): ContactAttribution {
  const body =
    input.body && typeof input.body === "object"
      ? (input.body as Record<string, unknown>)
      : {};
  const headerUrl = refererUrl(input.referer);
  const bodyReferrerUrl = refererUrl(body.referrer);
  const headerHost = hostFrom(input.referer);
  const pagePath =
    pagePathFrom(body.pagePath) ||
    (headerHost === "invistimo.com" ? pagePathFrom(headerUrl?.pathname) : "");

  const fromBody = utmFromSearch(null);
  for (const [, field] of UTM_FIELDS) {
    fromBody[field] = cleanLabel(body[field]);
  }
  const fromReferrer = utmFromSearch(bodyReferrerUrl);
  const fromHeader = utmFromSearch(headerUrl);

  const utm = { ...fromHeader, ...fromReferrer };
  for (const key of Object.keys(utm) as ContactUtmField[]) {
    if (fromBody[key]) utm[key] = fromBody[key];
  }

  return {
    pagePath,
    referrerHost: hostFrom(body.referrer) || headerHost,
    ...utm,
  };
}

export function buildContactSubmissionLog(input: {
  submissionId: string;
  at: string;
  status: number;
  result: ContactSubmissionResult;
  leadSaved: boolean;
  attribution: ContactAttribution;
}): ContactSubmissionLog {
  return {
    event: "contact_submission",
    submissionId: input.submissionId,
    path: "/api/contact",
    at: input.at,
    status: input.status,
    result: input.result,
    leadSaved: input.leadSaved,
    pagePath: input.attribution.pagePath,
    referrerHost: input.attribution.referrerHost,
    utmSource: input.attribution.utmSource,
    utmMedium: input.attribution.utmMedium,
    utmCampaign: input.attribution.utmCampaign,
    utmContent: input.attribution.utmContent,
    utmTerm: input.attribution.utmTerm,
    pageLocation: contactMeasurementPageLocation(input.attribution.pagePath),
  };
}

const LOCAL_SINK = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/;

/** Staging and preview can keep the email and measurement on this machine. Production never uses the sink. */
export async function deliverStagingTraceSink(input: {
  submissionId: string;
  email: {
    from: string;
    to: string[];
    bcc: string[];
    subject: string;
    html: string;
  };
  measurement: GenerateLeadPayload | null;
}) {
  if (resolveAppEnv() === "production") return;
  const sink = String(process.env.CONTACT_TRACE_SINK || "").trim();
  if (!LOCAL_SINK.test(sink)) return;
  await fetch(sink, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function renderContactTraceHtml(
  submissionId: string,
  attribution: ContactAttribution,
  escapeHtml: (value: string) => string
) {
  const rows: Array<[string, string]> = [
    ["מזהה פנייה", submissionId],
    ["עמוד", attribution.pagePath],
    ["מקור", attribution.referrerHost],
    ["utm_source", attribution.utmSource],
    ["utm_medium", attribution.utmMedium],
    ["utm_campaign", attribution.utmCampaign],
    ["utm_content", attribution.utmContent],
    ["utm_term", attribution.utmTerm],
  ];

  return rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`
    )
    .join("\n");
}
