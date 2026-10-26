import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const outDir = '/workspace/public/images/marketing-captures/demo';
const artDir = '/opt/cursor/artifacts/screenshots/public-audit';
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(artDir, { recursive: true });

const HIDE_CSS = `
  [class*="Issue"], [class*="issue"], #axe-force-color, .axe-force-color,
  iframe[title*="accessibility" i], button[aria-label*="נגישות"],
  a[href*="whatsapp"], a[href*="wa.me"],
  [data-demo-banner], .demo-banner, footer, [class*="DemoBanner"]
  { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }
`;

const shots = [];

function toWebp(pngPath) {
  const webp = pngPath.replace(/\.png$/, '.webp');
  try {
    execFileSync('cwebp', ['-q', '82', pngPath, '-o', webp], { stdio: 'ignore' });
    return webp;
  } catch {
    return pngPath;
  }
}

async function shot(page, name) {
  const png = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: png, type: 'png' });
  const finalPath = toWebp(png);
  fs.copyFileSync(finalPath, path.join(artDir, path.basename(finalPath)));
  shots.push({ name, path: finalPath });
  console.log('saved', finalPath);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function withViewport(size, label) {
  const context = await browser.newContext({ viewport: size, locale: 'he-IL', deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/try', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(async () => {
    await fetch('/api/demo/interactive', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'free', restart: true }),
    });
  });

  const routes = [
    ['/try/dashboard', 'dashboard-guests'],
    ['/try/dashboard/seating', 'seating'],
    ['/try/event-management', 'event-management'],
    ['/try/dashboard/check-in', 'check-in'],
    ['/try/dashboard/messages/new', 'messages'],
  ];

  for (const [route, name] of routes) {
    try {
      await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(2200);
      await page.addStyleTag({ content: HIDE_CSS });
      // hide text nodes that scream demo if present as banners
      await page.evaluate(() => {
        document.querySelectorAll('body *').forEach((el) => {
          const t = (el.textContent || '').trim();
          if (!t || t.length > 120) return;
          if (/דמו מבודד|מצב דמו|Issues|Issue/.test(t) && el.children.length === 0) {
            el.style.visibility = 'hidden';
          }
        });
      });
      await shot(page, `${label}-${name}`);
    } catch (e) {
      console.log('skip', route, e.message);
    }
  }
  await context.close();
}

await withViewport({ width: 1440, height: 900 }, 'desktop');
await withViewport({ width: 390, height: 844 }, 'mobile');
await browser.close();
console.log(JSON.stringify(shots, null, 2));
