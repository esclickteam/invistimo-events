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

const [header, ...body] = parseCsv(
  fs.readFileSync("docs/seo/monitoring/url-tracking-baseline-2026-11-02.csv", "utf8")
);
const rows = body.map((cols) => Object.fromEntries(header.map((h, i) => [h, cols[i] ?? ""])));
const byStatus = {};
for (const r of rows) {
  byStatus[r.gsc_index_status] = (byStatus[r.gsc_index_status] || 0) + 1;
}
console.log(
  JSON.stringify(
    {
      total: rows.length,
      byStatus,
      indexedPaths: rows
        .filter((r) => r.gsc_index_status === "indexed_url_inspection")
        .map((r) => r.path),
      unknownPaths: rows
        .filter((r) => /unknown|not_indexed/i.test(r.gsc_index_status))
        .map((r) => ({ path: r.path, priority: r.priority_watch })),
      impressionsOnly: rows.filter((r) =>
        /impressions_in_gsc/i.test(r.gsc_index_status)
      ).length,
      unverified: rows.filter((r) => /not_verified/i.test(r.gsc_index_status))
        .length,
    },
    null,
    2
  )
);
