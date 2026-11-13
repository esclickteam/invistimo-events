import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { analyticsAllowed } from "../../lib/seo/analytics";
import { isAnalyticsBrowserCookie } from "../../lib/consent/policy";
import { createConsentRecord, parseConsent } from "../../lib/consent/storage";
import { CONTENT_SECURITY_POLICY, PUBLIC_CONTENT_SECURITY_POLICY } from "../../lib/security/responseHeaders";

const root = path.resolve(process.cwd());

test("stored consent expires when the policy version changes", () => {
  const current = createConsentRecord({ analytics: true, functional: false });
  assert.equal(parseConsent(JSON.stringify(current))?.choices.analytics, true);
  const stale = { ...current, version: "2020-01-01" };
  assert.equal(parseConsent(JSON.stringify(stale)), null);
  assert.equal(parseConsent("{"), null);
});

test("analytics cookie cleanup never matches the login or consent cookies", () => {
  assert.equal(isAnalyticsBrowserCookie("_ga"), true);
  assert.equal(isAnalyticsBrowserCookie("_ga_FFTCP1VN4Y"), true);
  assert.equal(isAnalyticsBrowserCookie("_gid"), true);
  assert.equal(isAnalyticsBrowserCookie("authToken"), false);
  assert.equal(isAnalyticsBrowserCookie("token"), false);
  assert.equal(isAnalyticsBrowserCookie("invistimo_consent"), false);
});

test("guest and app routes do not get the marketing consent banner", () => {
  assert.equal(analyticsAllowed("/"), true);
  assert.equal(analyticsAllowed("/contact"), true);
  assert.equal(analyticsAllowed("/cookies"), true);
  assert.equal(analyticsAllowed("/invite/guest-link"), false);
  assert.equal(analyticsAllowed("/e/share"), false);
  assert.equal(analyticsAllowed("/w/couple"), false);
  assert.equal(analyticsAllowed("/dashboard"), false);
  assert.equal(analyticsAllowed("/login"), false);
});

test("marketing analytics does not embed the GA script before consent", () => {
  const source = fs.readFileSync(path.join(root, "components/seo/MarketingAnalytics.tsx"), "utf8");
  assert.equal(source.includes("googletagmanager.com"), false);
  assert.match(source, /hasAnalyticsConsent/);
  const loader = fs.readFileSync(path.join(root, "lib/consent/googleConsent.ts"), "utf8");
  assert.match(loader, /analytics_storage: "denied"/);
  assert.match(loader, /ad_storage: "denied"/);
  assert.match(loader, /invistimo-ga4/);
  assert.match(loader, /setMeasurementTransportBlocked/);
  assert.match(loader, /google-analytics\.com/);
});

test("security headers cover the four report items without opening the frame", () => {
  assert.match(CONTENT_SECURITY_POLICY, /frame-ancestors 'self'/);
  assert.match(CONTENT_SECURITY_POLICY, /object-src 'none'/);
  assert.doesNotMatch(CONTENT_SECURITY_POLICY, /frame-ancestors \*/);
  assert.match(CONTENT_SECURITY_POLICY, /unsafe-eval/);
  assert.doesNotMatch(PUBLIC_CONTENT_SECURITY_POLICY, /unsafe-eval/);
  assert.match(PUBLIC_CONTENT_SECURITY_POLICY, /unsafe-inline/);
  const connect = PUBLIC_CONTENT_SECURITY_POLICY.split("; ").find((part) => part.startsWith("connect-src"));
  const connectTokens = connect?.split(" ") || [];
  assert.equal(connectTokens.includes("https:"), false);
  assert.equal(connectTokens.includes("wss:"), false);
});
