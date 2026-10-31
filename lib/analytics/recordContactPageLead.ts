import db from "@/lib/db";
import {
  ANALYTICS_CONSENT_COOKIE,
  measureContactPageInquiry,
  readCookie,
  gaSessionCookieName,
  type InquiryMeasurementStore,
  type MeasurementRecord,
} from "@/lib/analytics/contactInquiryMeasurement";
import { sendGa4GenerateLead } from "@/lib/analytics/ga4MeasurementProtocol";
import ContactInquiryMeasurement from "@/models/ContactInquiryMeasurement";

function asRecord(doc: {
  submissionId: string;
  status: MeasurementRecord["status"];
  attempts: number;
  claimedAt: Date;
  hadClientId?: boolean;
  hadSessionId?: boolean;
  skipReason?: string;
}): MeasurementRecord {
  return {
    submissionId: doc.submissionId,
    status: doc.status,
    attempts: doc.attempts,
    claimedAt: new Date(doc.claimedAt).getTime(),
    hadClientId: Boolean(doc.hadClientId),
    hadSessionId: Boolean(doc.hadSessionId),
    skipReason: doc.skipReason || "",
  };
}

function isDuplicateKey(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export const contactInquiryStore: InquiryMeasurementStore = {
  async get(submissionId) {
    const doc = await ContactInquiryMeasurement.findOne({ submissionId }).lean<{
      submissionId: string;
      status: MeasurementRecord["status"];
      attempts: number;
      claimedAt: Date;
      hadClientId?: boolean;
      hadSessionId?: boolean;
      skipReason?: string;
    } | null>();
    return doc ? asRecord(doc) : null;
  },

  async insert(record) {
    try {
      await ContactInquiryMeasurement.create({
        ...record,
        claimedAt: new Date(record.claimedAt),
      });
      return "ok";
    } catch (error) {
      if (isDuplicateKey(error)) return "duplicate";
      throw error;
    }
  },

  async update(submissionId, patch) {
    const next = { ...patch };
    if (typeof next.claimedAt === "number") {
      (next as { claimedAt: Date | number }).claimedAt = new Date(next.claimedAt);
    }
    await ContactInquiryMeasurement.updateOne({ submissionId }, { $set: next });
  },

  async compareAndSet(submissionId, expected, patch) {
    const next = { ...patch };
    if (typeof next.claimedAt === "number") {
      (next as { claimedAt: Date | number }).claimedAt = new Date(next.claimedAt);
    }
    const updated = await ContactInquiryMeasurement.findOneAndUpdate(
      {
        submissionId,
        status: expected.status,
        attempts: expected.attempts,
      },
      { $set: next }
    );
    return Boolean(updated);
  },
};

/**
 * Counts a successful /contact submission and, when allowed, sends one
 * generate_lead via Measurement Protocol. Never throws into the contact API.
 * Does not receive the visitor's name, phone, email, or message.
 */
export async function recordContactPageLead(req: Request, body: unknown) {
  const source =
    body && typeof body === "object"
      ? (body as { inquiryClient?: unknown; submissionId?: unknown })
      : {};

  try {
    await db();
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";
    const cookie = req.headers.get("cookie");
    await measureContactPageInquiry({
      contactPage: source.inquiryClient === "contact_page",
      submissionId: source.submissionId,
      gpc: req.headers.get("sec-gpc"),
      dnt: req.headers.get("dnt"),
      consentCookie: readCookie(cookie, ANALYTICS_CONSENT_COOKIE),
      gaCookie: readCookie(cookie, "_ga"),
      sessionCookie: readCookie(cookie, gaSessionCookieName(measurementId)),
      measurementId,
      apiSecret: process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET?.trim() || "",
      store: contactInquiryStore,
      send: (payload) =>
        sendGa4GenerateLead({
          measurementId,
          apiSecret: process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET?.trim() || "",
          payload,
        }),
    });
  } catch {
    console.error("CONTACT MEASUREMENT ERROR");
  }
}
