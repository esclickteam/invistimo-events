import fs from "node:fs";

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    const out = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        q = !q;
        continue;
      }
      if (c === "," && !q) {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += c;
    }
    out.push(cur);
    rows.push(out);
  }
  return rows;
}

const kwPath = "docs/seo/monitoring/keyword-tracking-baseline-2026-11-02.csv";
const [header, ...kwRows] = parseCsv(fs.readFileSync(kwPath, "utf8"));
const keywords = kwRows.map((cols) =>
  Object.fromEntries(header.map((h, i) => [h, cols[i] ?? ""]))
);

function opportunityScore(r) {
  const imp = Number(r.gsc_impressions) || 0;
  const clk = Number(r.gsc_clicks) || 0;
  const pos = Number(r.gsc_avg_position) || 99;
  const ctr = parseFloat(String(r.gsc_ctr).replace("%", "")) || 0;
  const posGap = Math.max(0, pos - 8);
  const ctrGap = Math.max(0, 10 - ctr);
  // Prefer commercial high + impressions + room to climb
  const priorityBoost = r.commercial_priority === "high" ? 1.25 : 1;
  return priorityBoost * (imp * 0.55 + posGap * imp * 0.09 + ctrGap * imp * 0.12 + clk * 3);
}

const commercial = keywords.filter(
  (r) => r.intent === "commercial" || r.commercial_priority === "high"
);
const withGsc = commercial
  .filter((r) => r.data_basis === "gsc_export_verified" && Number(r.gsc_impressions) > 0)
  .map((r) => ({ ...r, score: opportunityScore(r) }))
  .sort((a, b) => b.score - a.score);

console.log(
  JSON.stringify(
    {
      commercialTotal: commercial.length,
      withGscRows: withGsc.length,
      top10FromMap: withGsc.slice(0, 10).map((r, i) => ({
        rank: i + 1,
        query: r.query,
        impressions: Number(r.gsc_impressions),
        clicks: Number(r.gsc_clicks),
        ctr: r.gsc_ctr,
        avgPosition: Number(r.gsc_avg_position),
        primaryPath: r.primaryPath,
        score: Math.round(r.score),
      })),
    },
    null,
    2
  )
);

const q28 = parseCsv(
  fs.readFileSync("docs/seo/monitoring/exports/gsc-queries-28d-2026-11-02.csv", "utf8")
).slice(1);
const brandRe = /invistimo|אינוויסטימו|אינבסטימו|invist/i;
const nonBrand = q28
  .map((c) => ({
    query: c[0],
    clicks: Number(c[1]) || 0,
    impressions: Number(c[2]) || 0,
    ctr: c[3],
    avgPosition: Number(c[4]) || 99,
  }))
  .filter((r) => r.query && !brandRe.test(r.query))
  .map((r) => ({
    ...r,
    score:
      r.impressions * 0.55 +
      Math.max(0, r.avgPosition - 8) * r.impressions * 0.09 +
      Math.max(0, 10 - (parseFloat(String(r.ctr).replace("%", "")) || 0)) *
        r.impressions *
        0.12 +
      r.clicks * 3,
  }))
  .sort((a, b) => b.score - a.score);

console.log(
  JSON.stringify(
    {
      nonBrandTop20ByOpportunity: nonBrand.slice(0, 20),
      nonBrandTopByImpressions: [...nonBrand]
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 15),
    },
    null,
    2
  )
);
