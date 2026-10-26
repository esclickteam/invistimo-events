import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const outDir = '/workspace/public/videos/marketing-captures';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function record(route, name, ms = 8000) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'he-IL',
    recordVideo: { dir: '/tmp/pw-videos', size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/try', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await fetch('/api/demo/interactive', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'free', restart: true }),
    });
  });
  await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(ms);
  const vid = page.video();
  await context.close();
  const raw = await vid.path();
  const webm = path.join(outDir, `${name}.webm`);
  // re-encode shorter muted loop-friendly
  execFileSync('ffmpeg', ['-y', '-i', raw, '-an', '-c:v', 'libvpx-vp9', '-b:v', '1M', '-vf', 'scale=1280:-2', webm], { stdio: 'inherit' });
  // poster
  const poster = path.join(outDir, `${name}-poster.jpg`);
  execFileSync('ffmpeg', ['-y', '-i', webm, '-ss', '1', '-frames:v', '1', poster], { stdio: 'inherit' });
  console.log('video', webm, poster);
}

fs.mkdirSync('/tmp/pw-videos', { recursive: true });
await record('/try/dashboard', 'demo-guests-dashboard', 7000);
await record('/try/dashboard/seating', 'demo-seating-map', 9000);
await record('/try/dashboard/check-in', 'demo-check-in', 6000);
await browser.close();
