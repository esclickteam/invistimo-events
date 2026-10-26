import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = "/workspace/public/images/event-management/product";
const ART = "/opt/cursor/artifacts/screenshots/event-mgmt-product";
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(ART, { recursive: true });

const shots = [
  { tab: "overview", file: "overview-dashboard" },
  { tab: "planning", file: "planning-concept" },
  { tab: "suppliers", file: "suppliers-budget" },
  { tab: "calendar", file: "calendar-schedule" },
  { tab: "logistics", file: "logistics-timeline" },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/local/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.25,
  locale: "he-IL",
});

const page = await context.newPage();
page.setDefaultNavigationTimeout(45000);

for (const shot of shots) {
  const url = `http://127.0.0.1:3000/try/event-management?tab=${shot.tab}`;
  console.log("capturing", url);
  await page.goto(url, { waitUntil: "commit" });
  await page.waitForSelector("main", { timeout: 30000 });
  await page.waitForTimeout(2500);
  const outPath = path.join(OUT, `${shot.file}.png`);
  const artPath = path.join(ART, `${shot.file}.png`);
  await page.locator("main").screenshot({ path: outPath, type: "png" });
  fs.copyFileSync(outPath, artPath);
  console.log("saved", outPath, fs.statSync(outPath).size);
}

// Reuse existing high-quality RSVP/seating product shots as complementary modules
const copies = [
  [
    "/workspace/public/images/rsvp/chatuna/dashboard-guests.jpg",
    "guests-list.jpg",
  ],
  [
    "/workspace/public/images/rsvp/chatuna/dashboard-seating.jpg",
    "seating-map.jpg",
  ],
];
for (const [src, name] of copies) {
  if (!fs.existsSync(src)) continue;
  fs.copyFileSync(src, path.join(OUT, name));
  fs.copyFileSync(src, path.join(ART, name));
  console.log("copied", name);
}

await browser.close();
console.log("done");
