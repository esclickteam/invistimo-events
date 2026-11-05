import assert from "node:assert/strict";
import test from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

/**
 * Runs the contact route in APP_ENV=staging against an isolated
 * invistimo_staging database. Resend and GA4 are intercepted on this
 * machine. Nothing is posted to staging.invistimo.com.
 */

const PERSON = {
  name: "בדיקת סטייג",
  email: "staging-trace@invistimo.test",
  phone: "0500000001",
  message: "הודעת בדיקה בלבד",
};
const PII = [PERSON.name, PERSON.email, PERSON.phone, PERSON.message];

let mongod: MongoMemoryServer;
let logs: string[] = [];
let calls: Array<{ url: string; body: string }> = [];
let originalInfo: typeof console.info;
let originalFetch: typeof fetch;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri("invistimo_staging");
  process.env.APP_ENV = "staging";
  process.env.MONGO_ENV_LABEL = "staging";
  process.env.MONGO_URI = uri;
  process.env.MONGODB_URI = uri;
  process.env.NEXT_PUBLIC_SITE_URL = "https://staging.invistimo.com";
  process.env.RESEND_API_KEY = "re_test_local_only";
  process.env.RESEND_BASE_URL = "http://127.0.0.1:9";
  process.env.SUPPORT_EMAIL = "support-staging@invistimo.test";
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-FFTCP1VN4Y";
  process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET = "ga-test-secret";
  process.env.EXTERNAL_SENDS_MODE = "disabled";
  process.env.CONTACT_TRACE_SINK = "http://127.0.0.1:9/trace";

  originalInfo = console.info;
  console.info = (...args: unknown[]) => {
    logs.push(args.map((part) => String(part)).join(" "));
  };
  originalFetch = globalThis.fetch;
  await mongoose.connect(uri);
  const User = (await import("../../models/User")).default;
  await User.create({
    name: "Staging owner",
    email: "staging-owner@invistimo.test",
    password: "not-a-real-password",
    role: "staff",
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push({ url, body });
    if (url.includes("127.0.0.1:9") || url.includes("api.resend.com")) {
      return new Response(JSON.stringify({ id: "email_test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("google-analytics.com")) {
      return new Response(null, { status: 204 });
    }
    throw new Error(`outbound request blocked: ${url}`);
  }) as typeof fetch;
});

test.after(async () => {
  console.info = originalInfo;
  globalThis.fetch = originalFetch;
  await mongoose.disconnect();
  await mongod.stop();
});

function contactRequest(body: Record<string, unknown>, referer?: string) {
  return new Request("https://staging.invistimo.com/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(referer ? { referer } : {}),
    },
    body: JSON.stringify(body),
  });
}

function submissionLogs() {
  return logs
    .map((line) => {
      try {
        return JSON.parse(line) as { event?: string; submissionId?: string };
      } catch {
        return null;
      }
    })
    .filter((entry): entry is { event: string; submissionId: string; result?: string; pageLocation?: string } =>
      Boolean(entry && entry.event === "contact_submission" && entry.submissionId)
    );
}

test("staging safety blocks the email and GA4, and still stores the server id", async () => {
  const { POST } = await import("../../app/api/contact/route");
  const CustomerFile = (await import("../../models/CustomerFile")).default;

  const before = calls.length;
  const response = await POST(
    contactRequest({
      name: PERSON.name,
      email: PERSON.email,
      phone: "0520000002",
      subject: "בדיקה",
      message: PERSON.message,
      inquiryClient: "contact_page",
      pagePath: "/contact",
    })
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.blocked, true);
  assert.match(String(body.submissionId), /^[0-9a-f-]{36}$/i);

  const saved = await CustomerFile.findOne({ phone: "0520000002" }).lean<{
    submissionId?: string;
  }>();
  assert.equal(saved?.submissionId, body.submissionId);
  const log = submissionLogs().find((entry) => entry?.submissionId === body.submissionId);
  assert.equal(log?.result, "blocked");
  assert.equal(
    calls.slice(before).some(
      (call) => call.url.includes("api.resend.com") || call.url.endsWith("/emails")
    ),
    false
  );
  assert.equal(
    calls.slice(before).some((call) => call.url.includes("google-analytics.com")),
    false
  );
  const sink = calls.slice(before).find((call) => call.url.includes("/trace"));
  assert.ok(sink, "the blocked email and measurement stayed on the local sink");
  const captured = JSON.parse(sink.body) as {
    submissionId: string;
    email: { html: string; to: string[]; bcc: string[] };
    measurement: { events: Array<{ params: { submission_id?: string; page_location?: string } }> };
  };
  assert.equal(captured.submissionId, body.submissionId);
  assert.match(captured.email.html, new RegExp(String(body.submissionId)));
  assert.deepEqual(captured.email.to, ["support-staging@invistimo.test"]);
  assert.deepEqual(captured.email.bcc, ["invistimo9@gmail.com"]);
  assert.equal(captured.measurement.events[0].params.submission_id, body.submissionId);
  assert.equal(
    captured.measurement.events[0].params.page_location,
    "https://staging.invistimo.com/contact"
  );
  const blockedLog = submissionLogs().find((entry) => entry?.submissionId === body.submissionId);
  assert.equal(blockedLog?.pageLocation, "https://staging.invistimo.com/contact");
});

test("one intercepted staging-mode inquiry matches across the record, log, GA4, and email", async () => {
  process.env.EXTERNAL_SENDS_MODE = "enabled";
  const { POST } = await import("../../app/api/contact/route");
  const CustomerFile = (await import("../../models/CustomerFile")).default;
  const before = calls.length;

  const response = await POST(
    contactRequest(
      {
        name: PERSON.name,
        email: PERSON.email,
        phone: PERSON.phone,
        subject: "בדיקה",
        message: PERSON.message,
        inquiryClient: "contact_page",
        pagePath: "/contact?email=staging-trace@invistimo.test",
        referrer: "https://forged.example/landing",
        utmSource: PERSON.email,
        utmMedium: "cpc",
        utmCampaign: PERSON.phone,
        submissionId: "client-supplied-id",
      },
      "https://news.example/story?utm_source=newsletter"
    )
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.blocked, undefined);
  const id = String(body.submissionId);
  assert.notEqual(id, "client-supplied-id");

  const saved = await CustomerFile.findOne({ phone: PERSON.phone }).lean<{
    submissionId?: string;
    notes?: string;
    inquiryPagePath?: string;
    referrerHost?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }>();
  assert.equal(saved?.submissionId, id);
  assert.match(saved?.notes || "", new RegExp(id));
  assert.equal(saved?.inquiryPagePath, "");
  assert.equal(saved?.referrerHost, "forged.example");
  assert.equal(saved?.utmSource, "");
  assert.equal(saved?.utmMedium, "cpc");
  assert.equal(saved?.utmCampaign, "");

  const log = submissionLogs().find((entry) => entry?.submissionId === id);
  assert.equal(log?.result, "sent");
  assert.equal(log?.path, "/api/contact");
  const logText = JSON.stringify(log);
  for (const secret of PII) assert.equal(logText.includes(secret), false);
  assert.equal(log?.pageLocation, "https://staging.invistimo.com/contact");
  assert.equal(logText.includes("www.invistimo.com"), false);
  assert.equal(logText.includes("https://forged.example"), false);
  assert.equal(logText.includes("https://news.example"), false);

  const emailCall = calls
    .slice(before)
    .find((call) => call.url.endsWith("/emails") || call.url.includes("/emails"));
  assert.ok(emailCall, "the notification was built and intercepted");
  const email = JSON.parse(emailCall.body) as {
    to?: string[];
    bcc?: string[];
    html?: string;
    from?: string;
  };
  assert.deepEqual(email.to, ["support-staging@invistimo.test"]);
  assert.deepEqual(email.bcc, ["invistimo9@gmail.com"]);
  assert.equal(email.from, "Invistimo <support@invistimo.com>");
  assert.match(email.html || "", new RegExp(id));
  assert.match(email.html || "", /forged\.example/);
  assert.equal((email.html || "").includes(PERSON.email + ".example"), false);

  const gaCall = calls.slice(before).find((call) => call.url.includes("google-analytics.com/mp/collect"));
  assert.ok(gaCall, "GA4 Measurement Protocol was called");
  const ga = JSON.parse(gaCall.body) as {
    events: Array<{ name: string; params: Record<string, string> }>;
  };
  assert.equal(ga.events[0].name, "generate_lead");
  assert.equal(ga.events[0].params.submission_id, id);
  assert.equal(ga.events[0].params.method, "contact");
  const gaText = `${gaCall.url}\n${gaCall.body}`;
  for (const secret of PII) assert.equal(gaText.includes(secret), false);
  assert.equal(gaCall.body.includes("ga-test-secret"), false);
  assert.equal(ga.events[0].params.page_location, "https://staging.invistimo.com/contact");
  assert.equal(gaCall.url.includes("www.invistimo.com"), false);
});

test("a contact post without a name is still rejected", async () => {
  const { POST } = await import("../../app/api/contact/route");
  const response = await POST(
    contactRequest({
      email: PERSON.email,
      message: PERSON.message,
    })
  );
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, false);
});
