/**
 * Visual/behavioral QA for public pages with videos.
 * Viewports: desktop 1440, tablet 768, mobile 390.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:3000';
const OUT = '/opt/cursor/artifacts/screenshots/public-video-qa';
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  '/',
  '/rsvp',
  '/rsvp/chatuna',
  '/rsvp/hina',
  '/rsvp/bar-bat-mitzvah',
  '/rsvp/brit-brita',
  '/rsvp/whatsapp',
  '/rsvp/calls',
  '/rsvp/save-the-date',
  '/invitations/chatuna',
  '/seating-explained',
  '/event-management',
  '/credit-gifts',
  '/wedding-website',
  '/info/guides/seating-plan',
  '/info/guides/guests-who-dont-reply',
  '/info/guides/whatsapp-vs-sms-rsvp',
  '/info/guides/bit-paybox-wedding-invitation',
  '/info/guides/wedding-alcohol-calculator',
  '/info/guides/event-day-checklist',
  '/info/guides/event-management-vs-production',
  '/info/guides/save-the-date-vs-invitation',
  '/info/guides/send-digital-invitation',
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const results = [];

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
});

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    locale: 'he-IL',
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();

  for (const route of PAGES) {
    const entry = {
      route,
      viewport: vp.name,
      status: 'PASS',
      videos: 0,
      issues: [],
      shot: null,
    };
    try {
      const res = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (!res || res.status() >= 400) {
        entry.status = 'FAIL';
        entry.issues.push(`HTTP ${res?.status()}`);
      }
      await page.waitForTimeout(2500);

      // Scroll to load lazy videos
      await page.evaluate(async () => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        for (let y = 0; y < document.body.scrollHeight; y += Math.max(400, window.innerHeight * 0.7)) {
          window.scrollTo(0, y);
          await sleep(350);
        }
        window.scrollTo(0, 0);
        await sleep(400);
      });
      await page.waitForTimeout(1500);

      const videoReport = await page.evaluate(() => {
        const vids = [...document.querySelectorAll('video')];
        return vids.map((v, i) => {
          const cs = getComputedStyle(v);
          const parent = v.closest('[class*="rounded"], section, div');
          const rect = v.getBoundingClientRect();
          const objectFit = cs.objectFit;
          const issues = [];
          if (objectFit && objectFit !== 'contain' && objectFit !== 'none') {
            // allow cover only if not our public policy videos
            if (v.hasAttribute('data-public-autoplay') || v.closest('[data-public-video]')) {
              issues.push(`object-fit=${objectFit}`);
            }
          }
          if (rect.width < 40 || rect.height < 40) issues.push('tiny-or-hidden');
          return {
            i,
            src: v.currentSrc || v.getAttribute('src') || (v.querySelector('source')?.src ?? ''),
            paused: v.paused,
            muted: v.muted,
            loop: v.loop,
            playsInline: v.playsInline,
            readyState: v.readyState,
            videoWidth: v.videoWidth,
            videoHeight: v.videoHeight,
            objectFit,
            rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
            aria: v.getAttribute('aria-label') || v.getAttribute('title') || '',
            hasControlsNearby: !!document.querySelector('button[aria-label*="השהי"], button[aria-label*="ניגון"], button[aria-label*="pause" i], button[aria-label*="play" i]'),
            issues,
          };
        });
      });

      entry.videos = videoReport.length;
      if (videoReport.length === 0 && !['/info/guides/wedding-alcohol-calculator','/credit-gifts','/rsvp/bar-bat-mitzvah','/rsvp/brit-brita','/rsvp/calls','/info/guides/whatsapp-vs-sms-rsvp','/info/guides/bit-paybox-wedding-invitation','/info/guides/event-day-checklist','/info/guides/event-management-vs-production'].includes(route)) {
        // some pages always have videos; if zero after scroll, fail
        if (['/', '/rsvp', '/rsvp/chatuna', '/seating-explained', '/event-management'].includes(route)) {
          entry.status = 'FAIL';
          entry.issues.push('no videos found');
        }
      }

      for (const v of videoReport) {
        if (!v.loop) entry.issues.push(`video[${v.i}] not loop`);
        if (!v.muted) entry.issues.push(`video[${v.i}] not muted`);
        if (!v.playsInline) entry.issues.push(`video[${v.i}] no playsInline`);
        if (v.objectFit && v.objectFit !== 'contain') {
          // PublicAutoplayVideo sets contain via class; check computed
          entry.issues.push(`video[${v.i}] object-fit ${v.objectFit}`);
        }
        entry.issues.push(...v.issues.map((x) => `video[${v.i}] ${x}`));
      }

      // Try pause/play toggle if present
      const toggle = page.locator('button[aria-label*="השהי"], button[aria-label*="ניגון"]').first();
      if (await toggle.count()) {
        try {
          await toggle.click({ timeout: 2000 });
          await page.waitForTimeout(400);
          await toggle.click({ timeout: 2000 });
        } catch (e) {
          entry.issues.push(`toggle click: ${e.message}`);
        }
      }

      // SEO/AEO/GEO visible labels check
      const badLabels = await page.evaluate(() => {
        const text = document.body?.innerText || '';
        const hits = [];
        for (const lab of ['AEO:', 'GEO:', 'SEO label', '[AEO]', '[GEO]', 'internal-only']) {
          if (text.includes(lab)) hits.push(lab);
        }
        return hits;
      });
      if (badLabels.length) {
        entry.status = 'FAIL';
        entry.issues.push(`visible internal labels: ${badLabels.join(',')}`);
      }

      // Horizontal overflow
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 2;
      });
      if (overflow) entry.issues.push('horizontal-overflow');

      const shotName = `${vp.name}${route.replace(/\//g, '_') || '_home'}.png`;
      const shotPath = path.join(OUT, shotName);
      await page.screenshot({ path: shotPath, fullPage: false });
      entry.shot = shotPath;

      if (entry.issues.length) {
        // object-fit cover on non-policy may be noise; escalate only hard issues
        const hard = entry.issues.filter(
          (i) =>
            !i.includes('object-fit cover') &&
            !i.includes('object-fit fill'),
        );
        // For PublicAutoplay we expect contain — keep object-fit issues
        if (entry.issues.some((i) => /not loop|not muted|no playsInline|no videos|HTTP|labels|horizontal|tiny/.test(i))) {
          entry.status = 'FAIL';
        } else if (entry.issues.some((i) => i.includes('object-fit'))) {
          entry.status = 'FAIL';
        } else if (hard.length) {
          entry.status = 'FAIL';
        }
      }

      entry.videoDetails = videoReport;
      console.log(vp.name, route, entry.status, `videos=${entry.videos}`, entry.issues.slice(0, 3).join('; '));
    } catch (e) {
      entry.status = 'FAIL';
      entry.issues.push(e.message);
      console.log(vp.name, route, 'FAIL', e.message);
    }
    results.push(entry);
  }
  await context.close();
}

await browser.close();

const summary = {
  generatedAt: new Date().toISOString(),
  totals: {
    PASS: results.filter((r) => r.status === 'PASS').length,
    FAIL: results.filter((r) => r.status === 'FAIL').length,
  },
  byRoute: {},
};
for (const r of results) {
  summary.byRoute[r.route] = summary.byRoute[r.route] || {};
  summary.byRoute[r.route][r.viewport] = {
    status: r.status,
    videos: r.videos,
    issues: r.issues,
    shot: r.shot,
  };
}

fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify({ summary, results }, null, 2));
fs.writeFileSync('/workspace/docs/seo/public-video-policy/VIDEO-QA-RESULTS.json', JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify(summary.totals));
console.log('FAILS:');
for (const r of results.filter((x) => x.status === 'FAIL')) {
  console.log('-', r.viewport, r.route, r.issues.join(' | '));
}
