import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildGenerateLeadPayload } from "../../lib/analytics/contactInquiryMeasurement";
import { buildContactLeadPayload } from "../../lib/contact/contactPhone";
import {
  buildContactSubmissionLog,
  createContactSubmissionId,
  readContactAttribution,
  renderContactTraceHtml,
} from "../../lib/contact/submissionTrace";
import { sanitizeEventParams } from "../../lib/seo/analytics";

const ID = "6f1c2b7e-1a4d-4e3a-8c9b-0a1b2c3d4e5f";
const PII = ["דנה לוי", "dana@example.com", "0501234567", "אשמח לפרטים"];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

test("one server submission id matches the lead, the log, GA4, and the email", () => {
  const attribution = readContactAttribution({
    referer: "https://news.example/story?utm_source=newsletter",
    body: {
      pagePath: "/contact",
      utmSource: "facebook",
      utmMedium: "cpc",
      utmCampaign: "spring",
    },
  });
  const lead = buildContactLeadPayload({
    name: PII[0],
    email: PII[1],
    phone: PII[2],
    subject: "אירוע",
    message: PII[3],
    submissionId: ID,
    pagePath: attribution.pagePath,
    referrerHost: attribution.referrerHost,
    utmSource: attribution.utmSource,
    utmMedium: attribution.utmMedium,
    utmCampaign: attribution.utmCampaign,
  });
  const log = buildContactSubmissionLog({
    submissionId: ID,
    at: "2026-11-05T20:11:00.000Z",
    status: 200,
    result: "sent",
    leadSaved: true,
    attribution,
  });
  const ga = buildGenerateLeadPayload({
    clientId: "1234567890.1690000000",
    submissionId: ID,
  });
  const email = renderContactTraceHtml(ID, attribution, escapeHtml);

  assert.equal(lead.submissionId, ID);
  assert.equal(log.submissionId, ID);
  assert.equal(ga.events[0].params.submission_id, ID);
  assert.match(email, new RegExp(ID));
  assert.match(lead.notes, new RegExp(`מזהה פנייה: ${ID}`));
  assert.equal(lead.inquiryPagePath, "/contact");
  assert.equal(log.pagePath, "/contact");
  assert.equal(log.path, "/api/contact");
  assert.equal(log.result, "sent");
  assert.equal(lead.utmSource, "facebook");
  assert.equal(log.utmSource, "facebook");
  assert.match(email, /utm_source/);
  assert.match(email, /facebook/);
});

test("the structured log and GA event carry the id without personal details", () => {
  const previousEnv = process.env.APP_ENV;
  process.env.APP_ENV = "development";
  const attribution = readContactAttribution({
    body: {
      pagePath: "/contact?email=dana@example.com",
      referrer: "https://evil.example/dana@example.com",
      utmSource: "dana@example.com",
      utmCampaign: "0501234567",
      utmMedium: "cpc",
    },
  });
  const log = buildContactSubmissionLog({
    submissionId: ID,
    at: "2026-11-05T20:11:00.000Z",
    status: 200,
    result: "sent",
    leadSaved: true,
    attribution,
  });
  const encoded = JSON.stringify(log);
  for (const secret of PII) {
    assert.equal(encoded.includes(secret), false);
  }
  assert.equal(log.pagePath, "");
  assert.equal(log.utmSource, "");
  assert.equal(log.utmCampaign, "");
  assert.equal(log.utmMedium, "cpc");
  assert.equal(log.referrerHost, "evil.example");
  assert.equal(encoded.includes("https://evil.example"), false);
  assert.equal(log.pageLocation.includes("www.invistimo.com"), false);
  if (previousEnv === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = previousEnv;

  const ga = JSON.stringify(
    buildGenerateLeadPayload({
      clientId: "1234567890.1690000000",
      submissionId: ID,
    })
  );
  for (const secret of PII) {
    assert.equal(ga.includes(secret), false);
  }
  const safe = sanitizeEventParams({
    method: "event_management_fit",
    page_path: "/event-management",
    submission_id: ID,
    email: PII[1],
    phone: PII[2],
  });
  assert.equal(safe.submission_id, ID);
  assert.equal("email" in safe, false);
  assert.equal("phone" in safe, false);
});

test("the contact route keeps the current recipients and writes the server id everywhere", () => {
  const route = readFileSync("app/api/contact/route.ts", "utf8");
  const lead = readFileSync("lib/contact/openContactLead.ts", "utf8");
  const model = readFileSync("models/CustomerFile.ts", "utf8");

  assert.match(route, /to: recipients/);
  assert.match(route, /bcc: \["invistimo9@gmail.com"\]/);
  assert.match(route, /from: "Invistimo <support@invistimo.com>"/);
  assert.match(route, /process\.env\.SUPPORT_EMAIL/);
  assert.match(route, /createContactSubmissionId\(\)/);
  assert.doesNotMatch(route, /submissionId: body\?\.submissionId/);
  assert.match(route, /renderContactTraceHtml\(submissionId, attribution, escapeHtml\)/);
  assert.match(route, /result: "sent"/);
  assert.match(route, /result: "blocked"/);
  assert.match(route, /result: "lead_failed"/);
  assert.match(route, /submissionId,/);
  assert.match(lead, /submissionId: payload\.submissionId/);
  assert.match(model, /submissionId: \{/);

  const contact = readFileSync("app/contact/page.tsx", "utf8");
  assert.doesNotMatch(contact, /generate_lead/);
  assert.doesNotMatch(contact, /trackPublicEvent/);
  assert.match(contact, /name: name\.trim\(\)/);
  assert.match(contact, /inquiryClient: "contact_page"/);
});

test("createContactSubmissionId returns a unique uuid", () => {
  const first = createContactSubmissionId();
  const second = createContactSubmissionId();
  assert.notEqual(first, second);
  assert.match(
    first,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
});
