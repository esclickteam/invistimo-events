import fs from "node:fs";

function parseCols(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const files = [
  "docs/seo/monitoring/url-tracking-baseline-2026-11-02.csv",
  "docs/seo/monitoring/keyword-tracking-baseline-2026-11-02.csv",
  "docs/seo/monitoring/ai-monitor-questions-baseline-2026-11-02.csv",
  "docs/seo/monitoring/exports/gsc-url-inspection-2026-11-02.csv",
];

for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").trim().split(/\r?\n/);
  const cols = parseCols(lines[0]).length;
  let bad = 0;
  for (const l of lines.slice(1)) {
    if (parseCols(l).length !== cols) bad++;
  }
  console.log(JSON.stringify({ file: f, rows: lines.length - 1, cols, badRows: bad }));
}

JSON.parse(fs.readFileSync("docs/seo/monitoring/baseline-summary-2026-11-02.json", "utf8"));
console.log("baseline-summary json ok");
