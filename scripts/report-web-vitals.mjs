/**
 * Reads web_vital samples from the existing Invistimo GA4 property.
 * No new service. Uses an access token you already have:
 *   gcloud auth print-access-token
 * or GA4_ACCESS_TOKEN.
 *
 * The Data API returns counts, the average metric_value, and the share of
 * good / needs-improvement / poor. It does not return a percentile. p75 of
 * these events needs the raw rows, and BigQuery export can create charges,
 * so this script does not enable it.
 */
const PROPERTY = "properties/561016940";
const PAGES = ["/", "/rsvp", "/wedding-website", "/pricing", "/contact"];

function tokenFromEnv() {
  return (process.env.GA4_ACCESS_TOKEN || "").trim();
}

async function tokenFromGcloud() {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const exec = promisify(execFile);
  try {
    const { stdout } = await exec("gcloud", ["auth", "print-access-token"], { windowsHide: true });
    return stdout.trim();
  } catch {
    return "";
  }
}

function pct(part, total) {
  if (!total) return null;
  return Math.round((part / total) * 1000) / 10;
}

async function main() {
  const token = tokenFromEnv() || (await tokenFromGcloud());
  if (!token) {
    console.error(
      "No GA4 read token. Grant Viewer on the existing property, enable the Google Analytics Data API on its Cloud project, then run: gcloud auth login && gcloud auth print-access-token"
    );
    process.exit(2);
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/${PROPERTY}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [
        { name: "customEvent:page_path" },
        { name: "customEvent:metric_name" },
        { name: "customEvent:metric_rating" },
        { name: "deviceCategory" },
      ],
      metrics: [{ name: "eventCount" }, { name: "customEvent:metric_value" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: { matchType: "EXACT", value: "web_vital" },
        },
      },
      limit: 10000,
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    console.error(body.error?.message || `GA4 Data API HTTP ${response.status}`);
    process.exit(1);
  }

  const rows = body.rows || [];
  const grouped = new Map();
  for (const row of rows) {
    const [page, metric, rating, device] = row.dimensionValues.map((item) => item.value);
    if (!PAGES.includes(page)) continue;
    const count = Number(row.metricValues[0]?.value || 0);
    const sum = Number(row.metricValues[1]?.value || 0);
    const key = `${page}|${metric}|${device}`;
    const bucket = grouped.get(key) || {
      page,
      metric,
      device,
      count: 0,
      sum: 0,
      good: 0,
      needsImprovement: 0,
      poor: 0,
    };
    bucket.count += count;
    bucket.sum += sum;
    if (rating === "good") bucket.good += count;
    else if (rating === "needs-improvement") bucket.needsImprovement += count;
    else if (rating === "poor") bucket.poor += count;
    grouped.set(key, bucket);
  }

  const report = [...grouped.values()].map((bucket) => ({
    page: bucket.page,
    metric: bucket.metric,
    device: bucket.device,
    samples: bucket.count,
    average: bucket.count ? Math.round((bucket.sum / bucket.count) * 1000) / 1000 : null,
    goodPercent: pct(bucket.good, bucket.count),
    needsImprovementPercent: pct(bucket.needsImprovement, bucket.count),
    poorPercent: pct(bucket.poor, bucket.count),
    p75: null,
  }));

  console.log(
    JSON.stringify(
      {
        property: PROPERTY,
        rows: report,
        note: report.length
          ? "p75 is not available from the GA4 Data API without a raw export."
          : "No readable web_vital rows. Custom dimensions must exist before page_path and metric_name can be queried.",
      },
      null,
      2
    )
  );
}

main();
