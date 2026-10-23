import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'https://booking-around-circulation-welding.trycloudflare.com';
const OUTPUT_DIR = '/opt/cursor/artifacts/screenshots';

const results = [];

async function captureScreenshot(browser, path, filename, viewport, scrollAmount = 0) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();
  const url = `${BASE_URL}${path}`;
  const outputPath = `${OUTPUT_DIR}/${filename}`;
  
  try {
    console.log(`\nCapturing: ${url}`);
    
    const response = await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    
    const status = response?.status() || 0;
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Try to dismiss cookie banner if present
    try {
      const cookieSelectors = [
        'button:has-text("קבל")',
        'button:has-text("אישור")',
        'button:has-text("Accept")',
        'button:has-text("OK")',
        '[aria-label*="close"]',
        '.cookie-banner button',
        '#cookie-banner button'
      ];
      
      for (const selector of cookieSelectors) {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          console.log(`  Dismissed cookie banner`);
          await page.waitForTimeout(500);
          break;
        }
      }
    } catch (e) {
      // No cookie banner found or couldn't dismiss - that's fine
    }
    
    // Scroll if needed to capture product visuals
    if (scrollAmount > 0) {
      await page.evaluate((amount) => {
        window.scrollBy(0, amount);
      }, scrollAmount);
      await page.waitForTimeout(1000);
    }
    
    await page.screenshot({ 
      path: outputPath, 
      fullPage: false,
      type: 'png'
    });
    
    results.push({
      path,
      url,
      filename,
      outputPath,
      status,
      success: true,
      viewport: `${viewport.width}x${viewport.height}`
    });
    
    console.log(`  ✓ Saved: ${outputPath}`);
    console.log(`  Status: ${status}`);
    
  } catch (error) {
    results.push({
      path,
      url,
      filename,
      outputPath,
      status: 0,
      success: false,
      error: error.message,
      viewport: `${viewport.width}x${viewport.height}`
    });
    console.log(`  ✗ Failed: ${error.message.substring(0, 100)}`);
  }
  
  await context.close();
}

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const desktopViewport = { width: 1440, height: 900 };
  const mobileViewport = { width: 390, height: 844 };
  
  console.log('=== CAPTURING INVISTIMO SEO SCREENSHOTS ===');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);
  
  // Desktop screenshots with slight scroll to show product visuals
  const pages = [
    { path: '/rsvp', filename: 'seo-rsvp-flagship.png', scroll: 300 },
    { path: '/seating-explained', filename: 'seo-seating-flagship.png', scroll: 300 },
    { path: '/wedding-website', filename: 'seo-wedding-website.png', scroll: 300 },
    { path: '/', filename: 'seo-home.png', scroll: 200 },
    { path: '/for/bar-mitzvah', filename: 'seo-for-bar-mitzvah.png', scroll: 300 },
    { path: '/for/corporate', filename: 'seo-for-corporate.png', scroll: 300 },
    { path: '/info/demo', filename: 'seo-info-demo.png', scroll: 200 },
  ];
  
  for (const { path, filename, scroll } of pages) {
    await captureScreenshot(browser, path, filename, desktopViewport, scroll);
  }
  
  // Mobile screenshot of /rsvp
  console.log('\n--- Mobile Screenshot ---');
  await captureScreenshot(browser, '/rsvp', 'seo-rsvp-mobile.png', mobileViewport, 150);
  
  await browser.close();
  
  console.log('\n=== SUMMARY ===\n');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Total: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}\n`);
  
  console.log('=== SAVED FILES ===\n');
  successful.forEach(r => {
    console.log(`✓ ${r.filename}`);
    console.log(`  Path: ${r.outputPath}`);
    console.log(`  URL: ${r.url}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  Viewport: ${r.viewport}\n`);
  });
  
  if (failed.length > 0) {
    console.log('=== FAILED ===\n');
    failed.forEach(r => {
      console.log(`✗ ${r.filename}`);
      console.log(`  URL: ${r.url}`);
      console.log(`  Error: ${r.error}\n`);
    });
  }
  
  // Write detailed report
  fs.writeFileSync(
    '/opt/cursor/artifacts/screenshots/seo-screenshot-report.json',
    JSON.stringify(results, null, 2)
  );
  console.log('Report saved: /opt/cursor/artifacts/screenshots/seo-screenshot-report.json');
}

main().catch(console.error);
