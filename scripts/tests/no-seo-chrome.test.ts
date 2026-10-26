import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

const FORBIDDEN = [
  "התשובה הקצרה",
  "AEO ·",
  "GEO / AEO",
  "למנועי חיפוש ולתשובות AI",
  "aria-label=\"תשובה קצרה\"",
];

const SCAN_DIRS = [
  "app/(marketing)",
  "app/pricing",
  "app/faq",
  "app/event-management",
  "app/credit-gifts",
  "app/seating-explained",
  "components/marketing",
  "components/seo",
];

function walk(dir: string, out: string[] = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

test("public UI must not ship artificial SEO/AEO chrome boxes", () => {
  const files = SCAN_DIRS.flatMap((rel) => walk(path.join(root, rel)));
  assert.ok(files.length > 20, "expected marketing files to scan");
  const hits: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    // Allow documentation comments describing the removal.
    if (file.endsWith("AnswerFirst.tsx") && text.includes("return null")) continue;
    for (const needle of FORBIDDEN) {
      if (text.includes(needle)) hits.push(`${path.relative(root, file)} :: ${needle}`);
    }
  }
  assert.deepEqual(hits, [], hits.join("\n"));
});

test("pricing page leads with package selection UX", () => {
  const page = fs.readFileSync(path.join(root, "app/pricing/page.tsx"), "utf8");
  assert.match(page, /חבילות ומחירים/);
  assert.match(page, /בחרו את כמות הרשומות וגלו את החבילה המתאימה/);
  assert.match(page, /GuestRecordSlider/);
  assert.doesNotMatch(page, /איך נקבע המחיר של אישורי ההגעה\?/);
  assert.doesNotMatch(page, /pt-24 sm:px-8 lg:pt-28/);
  // Packages must come before addons so the first viewport centers package selection.
  const sliderIdx = page.indexOf("GuestRecordSlider");
  const packagesIdx = page.indexOf("בחרו חבילה");
  const addonsIdx = page.indexOf("תוספות אפשריות");
  assert.ok(sliderIdx > 0 && packagesIdx > sliderIdx, "packages follow the slider");
  assert.ok(addonsIdx > packagesIdx, "addons come after package cards");
  const layout = fs.readFileSync(path.join(root, "app/pricing/layout.tsx"), "utf8");
  assert.doesNotMatch(layout, /AnswerFirst/);
  const extras = fs.readFileSync(path.join(root, "components/marketing/PricingMarketingExtras.tsx"), "utf8");
  assert.match(extras, /מה כלול בכל חבילה\?/);
});
