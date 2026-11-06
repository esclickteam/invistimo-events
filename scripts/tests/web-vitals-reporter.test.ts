import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { buildWebVitalEvent, claimWebVitalReport } from "../../lib/seo/analytics";

const root = path.resolve(process.cwd());

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("final web vital values keep the standard units and a public path", () => {
  assert.deepEqual(
    buildWebVitalEvent({
      name: "LCP",
      value: 2534.4,
      rating: "needs-improvement",
      pagePath: "https://www.invistimo.com/rsvp?email=person@example.com&phone=0501234567#form",
    }),
    {
      metric_name: "LCP",
      metric_rating: "needs-improvement",
      page_path: "/rsvp",
      metric_value: 2534,
    }
  );

  assert.deepEqual(
    buildWebVitalEvent({
      name: "INP",
      value: 180.2,
      rating: "good",
      pagePath: "/wedding-website",
    }),
    {
      metric_name: "INP",
      metric_rating: "good",
      page_path: "/wedding-website",
      metric_value: 180,
    }
  );

  const cls = buildWebVitalEvent({
    name: "CLS",
    value: 0.2534,
    rating: "poor",
    pagePath: "/contact?utm_source=ads",
  });
  assert.equal(cls?.metric_value, 0.253);
  assert.equal(cls?.page_path, "/contact");
  assert.equal(typeof cls?.metric_value, "number");
});

test("web vital events drop private pages, other metrics, and bad values", () => {
  assert.equal(
    buildWebVitalEvent({ name: "LCP", value: 1200, rating: "good", pagePath: "/dashboard" }),
    null
  );
  assert.equal(
    buildWebVitalEvent({ name: "FCP", value: 1200, rating: "good", pagePath: "/" }),
    null
  );
  assert.equal(
    buildWebVitalEvent({ name: "CLS", value: 0.04, rating: "unknown", pagePath: "/pricing" }),
    null
  );
  assert.equal(
    buildWebVitalEvent({ name: "INP", value: Number.NaN, rating: "good", pagePath: "/pricing" }),
    null
  );
  assert.equal(
    buildWebVitalEvent({
      name: "LCP",
      value: 900,
      rating: "good",
      pagePath: "https://example.com/pricing",
    }),
    null
  );
});

test("the same metric instance is sent once", () => {
  const reported = new Set<string>();
  assert.equal(claimWebVitalReport(reported, "v1-123"), true);
  assert.equal(claimWebVitalReport(reported, "v1-123"), false);
  assert.equal(claimWebVitalReport(reported, "v2-456"), true);
  assert.equal(claimWebVitalReport(reported, ""), false);
});

test("the reporter uses the official library for the final values only", () => {
  const source = read("components/seo/WebVitalsReporter.tsx");
  assert.match(source, /import\("web-vitals"\)/);
  assert.match(source, /onLCP\(reportFinalMetric/);
  assert.match(source, /onINP\(reportFinalMetric/);
  assert.match(source, /onCLS\(reportFinalMetric/);
  assert.match(source, /reportAllChanges: false/);
  assert.doesNotMatch(source, /web-vitals\/attribution/);
  assert.doesNotMatch(source, /durationThreshold/);
  assert.doesNotMatch(source, /layout-shift/);
  assert.doesNotMatch(source, /largest-contentful-paint/);
  assert.doesNotMatch(source, /trackPublicEvent/);

  const analytics = read("lib/seo/analytics.ts");
  const sender = analytics.slice(analytics.indexOf("export function trackWebVital"));
  assert.match(sender, /gtag\("event", "web_vital", hit\)/);
  assert.doesNotMatch(sender, /GA4_MEASUREMENT_PROTOCOL|API_SECRET|client_secret/);
});
