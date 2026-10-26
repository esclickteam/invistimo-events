/**
 * Produce unique public marketing stills + dedicated guide videos.
 * - Copies generated atmosphere images into public/ (one asset per use)
 * - Captures distinct /try module screens (different routes + UI states)
 * - Ken Burns videos from unique stills for planning topics
 * - Playwright recordings for product modules
 *
 * Scope: public marketing assets only. Uses isolated /try demo.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { createHash } from 'crypto';

const BASE = 'http://127.0.0.1:3000';
const IMG_OUT = '/workspace/public/images/marketing-captures/unique';
const ATM_OUT = '/workspace/public/images/rsvp/guides/unique-atmosphere';
const VID_OUT = '/workspace/public/videos/marketing-captures';
const ART = '/opt/cursor/artifacts/assets';
const ART_SHOTS = '/opt/cursor/artifacts/screenshots/public-audit';
const TMP = '/tmp/unique-media-prod';

for (const d of [IMG_OUT, ATM_OUT, VID_OUT, ART_SHOTS, TMP, '/tmp/pw-videos']) {
  fs.mkdirSync(d, { recursive: true });
}

const HIDE_CSS = `
  [class*="Issue"], [class*="issue"], #axe-force-color, .axe-force-color,
  iframe[title*="accessibility" i], button[aria-label*="נגישות"],
  a[href*="wa.me"], [data-demo-banner], .demo-banner, footer, [class*="DemoBanner"]
  { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }
`;

function md5(file) {
  return createHash('md5').update(fs.readFileSync(file)).digest('hex');
}

function toWebp(pngPath, webpPath) {
  try {
    execFileSync('cwebp', ['-q', '84', pngPath, '-o', webpPath], { stdio: 'ignore' });
    return webpPath;
  } catch {
    fs.copyFileSync(pngPath, webpPath.replace(/\.webp$/, '.png'));
    return webpPath.replace(/\.webp$/, '.png');
  }
}

function copyAtm(srcName, destName) {
  const src = path.join(ART, srcName);
  const dest = path.join(ATM_OUT, destName);
  if (!fs.existsSync(src)) {
    console.warn('missing atmosphere source', srcName);
    return null;
  }
  fs.copyFileSync(src, dest);
  fs.copyFileSync(src, path.join(ART_SHOTS, destName));
  console.log('atm', destName, md5(dest));
  return `/images/rsvp/guides/unique-atmosphere/${destName}`;
}

/** Ken Burns webm from still image */
function kenBurns(stillPath, outName, seconds = 7) {
  const webm = path.join(VID_OUT, `${outName}.webm`);
  const poster = path.join(VID_OUT, `${outName}-poster.jpg`);
  const vf = `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.0008,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(seconds * 25)}:s=1280x720:fps=25`;
  execFileSync(
    'ffmpeg',
    ['-y', '-loop', '1', '-i', stillPath, '-t', String(seconds), '-vf', vf, '-an', '-c:v', 'libvpx-vp9', '-b:v', '1.2M', '-pix_fmt', 'yuv420p', webm],
    { stdio: 'ignore' },
  );
  execFileSync('ffmpeg', ['-y', '-i', webm, '-ss', '0.5', '-frames:v', '1', poster], { stdio: 'ignore' });
  console.log('video', outName, md5(webm));
  return { webm: `/videos/marketing-captures/${outName}.webm`, poster: `/videos/marketing-captures/${outName}-poster.jpg` };
}

async function startDemo(page) {
  await page.goto(`${BASE}/try`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(async () => {
    await fetch('/api/demo/interactive', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'free', restart: true }),
    });
  });
  await page.waitForTimeout(800);
}

async function prepPage(page) {
  await page.addStyleTag({ content: HIDE_CSS });
  await page.evaluate(() => {
    document.querySelectorAll('body *').forEach((el) => {
      const t = (el.textContent || '').trim();
      if (!t || t.length > 140) return;
      if (/דמו מבודד|מצב דמו|Issues|Issue/.test(t) && el.children.length === 0) {
        el.style.visibility = 'hidden';
      }
    });
  });
}

async function saveShot(page, name) {
  const png = path.join(TMP, `${name}.png`);
  const webp = path.join(IMG_OUT, `${name}.webp`);
  await page.screenshot({ path: png, type: 'png' });
  const finalPath = toWebp(png, webp);
  fs.copyFileSync(finalPath, path.join(ART_SHOTS, path.basename(finalPath)));
  console.log('shot', name, md5(finalPath));
  return `/images/marketing-captures/unique/${path.basename(finalPath)}`;
}

async function recordRoute(browser, route, name, ms, interact) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'he-IL',
    recordVideo: { dir: '/tmp/pw-videos', size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();
  await startDemo(page);
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await prepPage(page);
  if (interact) await interact(page);
  await page.waitForTimeout(ms);
  const vid = page.video();
  await context.close();
  const raw = await vid.path();
  const webm = path.join(VID_OUT, `${name}.webm`);
  const poster = path.join(VID_OUT, `${name}-poster.jpg`);
  execFileSync(
    'ffmpeg',
    ['-y', '-i', raw, '-an', '-c:v', 'libvpx-vp9', '-b:v', '1.2M', '-vf', 'scale=1280:-2', webm],
    { stdio: 'ignore' },
  );
  execFileSync('ffmpeg', ['-y', '-i', webm, '-ss', '1', '-frames:v', '1', poster], { stdio: 'ignore' });
  console.log('record', name, md5(webm));
  return { webm: `/videos/marketing-captures/${name}.webm`, poster: `/videos/marketing-captures/${name}-poster.jpg` };
}

console.log('=== 1) Atmosphere stills ===');
const atmMap = {
  'wedding-planning-hero.jpg': 'wp-hero-reception-unique.jpg',
  'wedding-planning-venue.jpg': 'wp-venue-unique.jpg',
  'wedding-planning-hall.jpg': 'wp-hall-tables-unique.jpg',
  'event-day-reception.jpg': 'atm-reception-evening.jpg',
  'event-day-venue.jpg': 'atm-garden-venue.jpg',
  'event-mgmt-vs-prod-hero.jpg': 'atm-event-production-stage.jpg',
  'event-mgmt-vs-prod-venue.jpg': 'atm-ballroom-aisle.jpg',
  'choose-company-hero.jpg': 'atm-wedding-planner-desk.jpg',
  'seating-plan-hall.jpg': 'atm-hall-round-tables.jpg',
  'table-number-hall.jpg': 'atm-table-number-card.jpg',
  'whatsapp-vs-sms-hero.jpg': 'atm-whatsapp-sms-compare.jpg',
  'bit-paybox-hero.jpg': 'atm-bit-paybox-concept.jpg',
  'credit-gifts-hero.jpg': 'atm-digital-gift-envelope.jpg',
  'alcohol-hero.jpg': 'atm-wedding-bar-setup.jpg',
  'calls-concept.jpg': 'atm-rsvp-phone-call.jpg',
  'bar-mitzvah-video-still.jpg': 'atm-bar-mitzvah-evening.jpg',
  'bat-mitzvah-video-still.jpg': 'atm-bat-mitzvah-corner.jpg',
  'brit-video-still.jpg': 'atm-brit-celebration.jpg',
  'venue-guarantee-hall.jpg': 'atm-ballroom-aisle.jpg',
  'event-day-morning.jpg': 'atm-event-day-morning.jpg',
};

// venue-guarantee and event-mgmt both wanted ballroom — regenerate uniqueness by also using garden for one
atmMap['venue-guarantee-hall.jpg'] = 'atm-garden-venue.jpg';

const atmPaths = {};
for (const [dest, src] of Object.entries(atmMap)) {
  atmPaths[dest] = copyAtm(src, dest);
}

console.log('=== 2) Ken Burns dedicated videos ===');
const videos = {};
videos.barBat = kenBurns(path.join(ATM_OUT, 'bar-mitzvah-video-still.jpg'), 'guide-bar-bat-mitzvah', 8);
videos.brit = kenBurns(path.join(ATM_OUT, 'brit-video-still.jpg'), 'guide-brit-brita', 8);
videos.calls = kenBurns(path.join(ATM_OUT, 'calls-concept.jpg'), 'guide-rsvp-calls', 8);
videos.gifts = kenBurns(path.join(ATM_OUT, 'credit-gifts-hero.jpg'), 'guide-credit-gifts', 8);
videos.alcohol = kenBurns(path.join(ATM_OUT, 'alcohol-hero.jpg'), 'guide-alcohol', 8);
videos.waSms = kenBurns(path.join(ATM_OUT, 'whatsapp-vs-sms-hero.jpg'), 'guide-whatsapp-vs-sms', 8);
videos.bitPaybox = kenBurns(path.join(ATM_OUT, 'bit-paybox-hero.jpg'), 'guide-bit-paybox', 8);

console.log('=== 3) Unique /try captures + product recordings ===');
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'he-IL',
  deviceScaleFactor: 1,
});
const page = await context.newPage();
await startDemo(page);

const shots = {};

async function gotoTry(route) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  await prepPage(page);
}

// Guests dashboard — overview
await gotoTry('/try/dashboard');
shots.guestsOverview = await saveShot(page, 'module-guests-overview');

// Guests — scroll mid list
await page.evaluate(() => window.scrollBy(0, 420));
await page.waitForTimeout(600);
shots.guestsScrolled = await saveShot(page, 'module-guests-scrolled');

// Try click a status filter if present
await page.evaluate(() => window.scrollTo(0, 0));
const filterClicked = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button, [role="tab"], a')];
  const hit = buttons.find((b) => /ממתין|לא ענה|טרם|ממתנים|לא אישר/.test(b.textContent || ''));
  if (hit) {
    hit.click();
    return (hit.textContent || '').trim().slice(0, 40);
  }
  return null;
});
await page.waitForTimeout(1200);
await prepPage(page);
shots.guestsPending = await saveShot(page, 'module-guests-pending-filter');
console.log('filter', filterClicked);

// Seating — full map
await gotoTry('/try/dashboard/seating');
shots.seatingFull = await saveShot(page, 'module-seating-full');

// Seating — click a table if possible
await page.evaluate(() => {
  const cand = [...document.querySelectorAll('[class*="table"], [data-table], button, div')]
    .find((el) => /^שולחן\s*\d+$/.test((el.textContent || '').trim()) || /שולחן/.test(el.getAttribute?.('aria-label') || ''));
  cand?.click?.();
});
await page.waitForTimeout(900);
shots.seatingSelected = await saveShot(page, 'module-seating-table-selected');

// Seating — zoom / pan via wheel
await page.mouse.wheel(0, -400);
await page.waitForTimeout(500);
shots.seatingZoom = await saveShot(page, 'module-seating-zoom');

// Messages compose
await gotoTry('/try/dashboard/messages/new');
shots.messagesCompose = await saveShot(page, 'module-messages-compose');
// Click WhatsApp / SMS tab if exists
await page.evaluate(() => {
  const tabs = [...document.querySelectorAll('button, [role="tab"]')];
  const sms = tabs.find((t) => /SMS|סמס|WhatsApp|וואטסאפ/.test(t.textContent || ''));
  sms?.click();
});
await page.waitForTimeout(900);
await prepPage(page);
shots.messagesChannel = await saveShot(page, 'module-messages-channel');

// Check-in
await gotoTry('/try/dashboard/check-in');
shots.checkIn = await saveShot(page, 'module-check-in');

// Event management
await gotoTry('/try/event-management');
shots.eventMgmt = await saveShot(page, 'module-event-management');
await page.evaluate(() => window.scrollBy(0, 500));
await page.waitForTimeout(700);
shots.eventMgmtTasks = await saveShot(page, 'module-event-management-tasks');

// Recorded calls
await gotoTry('/try/dashboard/recorded-calls');
shots.recordedCalls = await saveShot(page, 'module-recorded-calls');

await context.close();

// Product screen recordings (dedicated)
videos.productGuests = await recordRoute(browser, '/try/dashboard', 'product-guests-dashboard', 6500, async (p) => {
  await p.evaluate(() => window.scrollBy(0, 300));
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.scrollBy(0, 300));
});
videos.productSeating = await recordRoute(browser, '/try/dashboard/seating', 'product-seating-map', 8000, async (p) => {
  await p.mouse.wheel(0, -200);
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    const cand = [...document.querySelectorAll('button, div')].find((el) => /שולחן/.test(el.textContent || ''));
    cand?.click?.();
  });
  await p.waitForTimeout(2000);
});
videos.productMessages = await recordRoute(browser, '/try/dashboard/messages/new', 'product-messages', 7000, async (p) => {
  await p.evaluate(() => {
    const tabs = [...document.querySelectorAll('button, [role="tab"]')];
    tabs.find((t) => /SMS|סמס/.test(t.textContent || ''))?.click();
  });
  await p.waitForTimeout(2000);
  await p.evaluate(() => {
    const tabs = [...document.querySelectorAll('button, [role="tab"]')];
    tabs.find((t) => /WhatsApp|וואטסאפ/.test(t.textContent || ''))?.click();
  });
});
videos.productCalls = await recordRoute(browser, '/try/dashboard/recorded-calls', 'product-recorded-calls', 7000);
videos.productCheckIn = await recordRoute(browser, '/try/dashboard/check-in', 'product-check-in', 5500);
videos.productEventMgmt = await recordRoute(browser, '/try/event-management', 'product-event-management', 7000, async (p) => {
  await p.evaluate(() => window.scrollBy(0, 400));
  await p.waitForTimeout(2000);
});

await browser.close();

const manifest = { atmPaths, shots, videos, generatedAt: new Date().toISOString() };
fs.writeFileSync(path.join(IMG_OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync('/opt/cursor/artifacts/unique-media-manifest.json', JSON.stringify(manifest, null, 2));

// Dedup report
const hashes = {};
for (const f of fs.readdirSync(IMG_OUT).filter((x) => x.endsWith('.webp') || x.endsWith('.jpg') || x.endsWith('.png'))) {
  const h = md5(path.join(IMG_OUT, f));
  hashes[h] = hashes[h] || [];
  hashes[h].push(f);
}
const dups = Object.entries(hashes).filter(([, files]) => files.length > 1);
console.log('=== DUP CHECK unique shots ===', dups.length ? dups : 'none');
console.log(JSON.stringify(manifest, null, 2));
