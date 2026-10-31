import assert from "node:assert/strict";
import test from "node:test";

import {
  Ga4MeasurementHttpError,
  Ga4MeasurementNetworkError,
  buildGenerateLeadPayload,
  createAnonymousClientId,
  decideClaim,
  measureContactPageInquiry,
  measurementDenied,
  parseGaClientId,
  parseGaSessionId,
  summarizeInquiryMeasurements,
  type GenerateLeadPayload,
  type InquiryMeasurementStore,
  type MeasurementRecord,
} from "../../lib/analytics/contactInquiryMeasurement";
import { sendGa4GenerateLead } from "../../lib/analytics/ga4MeasurementProtocol";
import { readFileSync } from "node:fs";

const SUBMISSION = "6f1c2b7e-1a4d-4e3a-8c9b-0a1b2c3d4e5f";
const MEASUREMENT_ID = "G-FFTCP1VN4Y";
const SECRET = "test-secret";
const PII = ["דנה לוי", "dana@example.com", "0501234567", "אשמח לפרטים"];

function memoryStore(): InquiryMeasurementStore & { records: MeasurementRecord[] } {
  const rows = new Map<string, MeasurementRecord>();
  return {
    get records() {
      return [...rows.values()];
    },
    async get(submissionId) {
      const row = rows.get(submissionId);
      return row ? { ...row } : null;
    },
    async insert(record) {
      if (rows.has(record.submissionId)) return "duplicate";
      rows.set(record.submissionId, { ...record });
      return "ok";
    },
    async update(submissionId, patch) {
      const row = rows.get(submissionId);
      if (!row) throw new Error("missing");
      rows.set(submissionId, { ...row, ...patch });
    },
    async compareAndSet(submissionId, expected, patch) {
      const row = rows.get(submissionId);
      if (!row || row.status !== expected.status || row.attempts !== expected.attempts) {
        return false;
      }
      rows.set(submissionId, { ...row, ...patch });
      return true;
    },
  };
}

function allowedInput(
  store: InquiryMeasurementStore,
  overrides: Partial<Parameters<typeof measureContactPageInquiry>[0]> = {}
) {
  return {
    contactPage: true,
    submissionId: SUBMISSION,
    gpc: null,
    dnt: null,
    consentCookie: null,
    gaCookie: "GA1.1.1234567890.1690000000",
    sessionCookie: "GS1.1.1690001111.1.1.1690002222.0.0.0",
    measurementId: MEASUREMENT_ID,
    apiSecret: SECRET,
    now: 1_700_000_000_000,
    store,
    send: async () => {},
    createClientId: () => "999.1700000000",
    ...overrides,
  };
}

test("the contact route records a lead only after a successful send and without personal arguments", () => {
  const route = readFileSync("app/api/contact/route.ts", "utf8");
  const recorder = readFileSync("lib/analytics/recordContactPageLead.ts", "utf8");
  assert.match(route, /await recordContactPageLead\(req, \{/);
  assert.match(route, /inquiryClient: body\?\.inquiryClient/);
  assert.match(route, /submissionId: body\?\.submissionId/);
  assert.doesNotMatch(recorder, /body\.(name|email|phone|message|subject)/);
  assert.match(recorder, /inquiryClient/);
  assert.match(recorder, /submissionId/);
  assert.doesNotMatch(recorder, /openContactFormLead/);
});

test("GA cookies are parsed and personal-looking values are dropped", () => {
  assert.equal(parseGaClientId("GA1.1.1234567890.1690000000"), "1234567890.1690000000");
  assert.equal(parseGaClientId("GA1.1.dana@example.com.169"), "");
  assert.equal(parseGaClientId("GA1.1.0501234567"), "");
  assert.equal(parseGaSessionId("GS1.1.1690001111.1.1.1690002222.0.0.0"), "1690001111");
  assert.equal(
    parseGaSessionId("GS2.1.s1741234567$o1$g1$t1741234590$j60$l0$h0"),
    "1741234567"
  );
  assert.equal(parseGaSessionId("0501234567"), "");
});

test("opt-out signals deny measurement and a missing banner does not", () => {
  assert.equal(measurementDenied({ gpc: "1", dnt: null, consentCookie: null }).reason, "gpc");
  assert.equal(measurementDenied({ gpc: null, dnt: "1", consentCookie: null }).reason, "dnt");
  assert.equal(
    measurementDenied({ gpc: null, dnt: null, consentCookie: "denied" }).reason,
    "consent_cookie"
  );
  assert.equal(measurementDenied({ gpc: null, dnt: null, consentCookie: null }).denied, false);
});

test("a successful contact inquiry sends one generate_lead without personal data", async () => {
  const store = memoryStore();
  const sent: GenerateLeadPayload[] = [];
  const result = await measureContactPageInquiry(
    allowedInput(store, {
      send: async (payload) => {
        sent.push(payload);
      },
    })
  );

  assert.equal(result.outcome, "sent");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].client_id, "1234567890.1690000000");
  assert.equal(sent[0].events[0].name, "generate_lead");
  assert.equal(sent[0].events[0].params.method, "contact");
  assert.equal(sent[0].events[0].params.session_id, "1690001111");
  assert.equal(sent[0].events[0].params.page_location, "https://www.invistimo.com/contact");
  const body = JSON.stringify(sent[0]);
  for (const secret of [...PII, SECRET]) {
    assert.equal(body.includes(secret), false);
  }
  assert.deepEqual(summarizeInquiryMeasurements(store.records), {
    inquiries: 1,
    sentToGa4: 1,
    skippedConsent: 0,
    skippedConfig: 0,
    failed: 0,
    failedUnconfirmed: 0,
  });
});

test("a repeated submission id does not send a second event", async () => {
  const store = memoryStore();
  let sends = 0;
  const input = allowedInput(store, {
    send: async () => {
      sends += 1;
    },
  });
  assert.equal((await measureContactPageInquiry(input)).outcome, "sent");
  assert.equal((await measureContactPageInquiry({ ...input, now: input.now! + 5_000 })).outcome, "deduped");
  assert.equal(sends, 1);
  assert.equal(store.records.length, 1);
});

test("an in-flight send blocks a parallel retry", async () => {
  const store = memoryStore();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let sends = 0;
  const input = allowedInput(store, {
    send: async () => {
      sends += 1;
      await gate;
    },
  });
  const first = measureContactPageInquiry(input);
  await new Promise((resolve) => setTimeout(resolve, 20));
  const second = await measureContactPageInquiry({ ...input, now: input.now! + 1_000 });
  assert.equal(second.outcome, "deduped");
  release();
  assert.equal((await first).outcome, "sent");
  assert.equal(sends, 1);
});

test("a confirmed GA4 HTTP failure can be retried once, then stops", async () => {
  const store = memoryStore();
  let sends = 0;
  const input = allowedInput(store, {
    send: async () => {
      sends += 1;
      if (sends === 1) throw new Ga4MeasurementHttpError(503);
    },
  });
  assert.equal((await measureContactPageInquiry(input)).outcome, "failed");
  assert.equal(
    (await measureContactPageInquiry({ ...input, now: input.now! + 1_000 })).outcome,
    "sent"
  );
  assert.equal(
    (await measureContactPageInquiry({ ...input, now: input.now! + 2_000 })).outcome,
    "deduped"
  );
  assert.equal(sends, 2);
});

test("a network failure is not retried, because the hit may already have arrived", async () => {
  const store = memoryStore();
  let sends = 0;
  const input = allowedInput(store, {
    send: async () => {
      sends += 1;
      throw new Ga4MeasurementNetworkError();
    },
  });
  assert.equal((await measureContactPageInquiry(input)).outcome, "failed_unconfirmed");
  assert.equal(
    (await measureContactPageInquiry({ ...input, now: input.now! + CLAIM_GAP })).outcome,
    "deduped"
  );
  assert.equal(sends, 1);
  assert.equal(summarizeInquiryMeasurements(store.records).inquiries, 1);
  assert.equal(summarizeInquiryMeasurements(store.records).sentToGa4, 0);
});

test("consent, DNT, and GPC skip GA4 and still count the inquiry", async () => {
  for (const override of [
    { gpc: "1" },
    { dnt: "1" },
    { consentCookie: "denied" },
  ]) {
    const store = memoryStore();
    let sends = 0;
    const result = await measureContactPageInquiry(
      allowedInput(store, {
        ...override,
        send: async () => {
          sends += 1;
        },
      })
    );
    assert.equal(result.outcome, "skipped_consent");
    assert.equal(sends, 0);
    assert.equal(summarizeInquiryMeasurements(store.records).inquiries, 1);
    assert.equal(summarizeInquiryMeasurements(store.records).sentToGa4, 0);
  }
});

test("missing Measurement Protocol config counts the inquiry and does not call GA4", async () => {
  const store = memoryStore();
  let sends = 0;
  const result = await measureContactPageInquiry(
    allowedInput(store, {
      apiSecret: "",
      send: async () => {
        sends += 1;
      },
    })
  );
  assert.equal(result.outcome, "skipped_config");
  assert.equal(sends, 0);
  assert.equal(store.records[0]?.skipReason, "api_secret");
});

test("other forms and invalid ids are ignored, so a blocked caller is not measured here", async () => {
  const store = memoryStore();
  let sends = 0;
  const send = async () => {
    sends += 1;
  };
  assert.equal(
    (await measureContactPageInquiry(allowedInput(store, { contactPage: false, send }))).outcome,
    "ignored"
  );
  assert.equal(
    (await measureContactPageInquiry(allowedInput(store, { submissionId: "not-a-uuid", send })))
      .outcome,
    "ignored"
  );
  assert.equal(sends, 0);
  assert.equal(store.records.length, 0);
});

test("without GA cookies the event still counts, with an anonymous client id and no session", async () => {
  const store = memoryStore();
  const sent: GenerateLeadPayload[] = [];
  const result = await measureContactPageInquiry(
    allowedInput(store, {
      gaCookie: null,
      sessionCookie: null,
      send: async (payload) => {
        sent.push(payload);
      },
    })
  );
  assert.equal(result.outcome, "sent");
  assert.equal(sent[0].client_id, "999.1700000000");
  assert.equal(sent[0].events[0].params.session_id, undefined);
  assert.equal(store.records[0]?.hadClientId, false);
  assert.equal(store.records[0]?.hadSessionId, false);
});

test("the collect request keeps the secret out of the body", async () => {
  let capturedUrl = "";
  let capturedBody = "";
  await sendGa4GenerateLead({
    measurementId: MEASUREMENT_ID,
    apiSecret: SECRET,
    payload: buildGenerateLeadPayload({ clientId: "123.456" }),
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body || "");
      return new Response(null, { status: 204 });
    },
  });
  assert.equal(capturedUrl.includes("api_secret=test-secret"), true);
  assert.equal(capturedBody.includes(SECRET), false);
  assert.equal(capturedBody.includes("generate_lead"), true);
  for (const value of PII) assert.equal(capturedBody.includes(value), false);
});

test("claim decisions stop retries after a send, an uncertain failure, or three attempts", () => {
  const base: MeasurementRecord = {
    submissionId: SUBMISSION,
    status: "sent",
    attempts: 1,
    claimedAt: 100,
    hadClientId: true,
    hadSessionId: true,
    skipReason: "",
  };
  assert.equal(decideClaim(null, 100), "insert");
  assert.equal(decideClaim(base, 200), "skip");
  assert.equal(decideClaim({ ...base, status: "failed_unconfirmed" }, 10_000), "skip");
  assert.equal(
    decideClaim({ ...base, status: "pending", claimedAt: 90_000 }, 100_000),
    "skip"
  );
  assert.equal(
    decideClaim({ ...base, status: "failed", attempts: 3 }, 10_000),
    "skip"
  );
  assert.equal(
    decideClaim({ ...base, status: "failed", attempts: 1, claimedAt: 1 }, 10_000),
    "send_retry"
  );
});

test("anonymous client ids are not derived from a person", () => {
  const id = createAnonymousClientId(() => 0.123456789, 1_700_000_000_000);
  assert.equal(id, "123456789.1700000000");
  for (const value of PII) assert.equal(id.includes(value), false);
});

const CLAIM_GAP = 120_000;
