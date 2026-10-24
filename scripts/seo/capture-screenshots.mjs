import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const results = [];

async function captureScreenshot(browser, url, outputPath, viewport, fullPage = false) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();
  
  try {
    const response = await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    const status = response?.status() || 0;
    
    // Wait additional 2 seconds for iframes and dynamic content
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: outputPath, 
      fullPage: fullPage,
      type: 'png'
    });
    
    results.push({
      url,
      outputPath,
      status,
      success: true,
      viewport: `${viewport.width}x${viewport.height}`
    });
    
    console.log(`✓ Captured ${url} (${status}) -> ${path.basename(outputPath)}`);
    
  } catch (error) {
    results.push({
      url,
      outputPath,
      status: 0,
      success: false,
      error: error.message,
      viewport: `${viewport.width}x${viewport.height}`
    });
    console.log(`✗ Failed ${url}: ${error.message}`);
  }
  
  await context.close();
}

async function checkUrlStatus(page, url) {
  try {
    const response = await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    return response?.status() || 0;
  } catch (error) {
    return 0;
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  const desktopViewport = { width: 1440, height: 900 };
  const mobileViewport = { width: 390, height: 844 };
  
  console.log('\n=== CAPTURING BEFORE SCREENSHOTS (Production) ===\n');
  
  const beforeUrls = [
    { url: 'https://www.invistimo.com/rsvp', slug: 'rsvp' },
    { url: 'https://www.invistimo.com/rsvp/save-the-date', slug: 'save-the-date' },
    { url: 'https://www.invistimo.com/invitations/chatuna', slug: 'invitations-chatuna' },
    { url: 'https://www.invistimo.com/wedding-website', slug: 'wedding-website' },
    { url: 'https://www.invistimo.com/seating-explained', slug: 'seating-explained' },
  ];
  
  for (const { url, slug } of beforeUrls) {
    const filename = `desktop-${slug}.png`;
    const outputPath = `/workspace/public/marketing/before/${filename}`;
    const artifactPath = `/opt/cursor/artifacts/screenshots/marketing-upgrade/${filename}`;
    
    await captureScreenshot(browser, url, outputPath, desktopViewport, false);
    
    // Copy to artifacts if successful
    if (fs.existsSync(outputPath)) {
      fs.copyFileSync(outputPath, artifactPath);
      console.log(`  Copied to artifacts: ${filename}`);
    }
  }
  
  console.log('\n=== CAPTURING PRODUCT SCREENSHOTS (Localhost) ===\n');
  
  // Check which URLs are accessible
  const testContext = await browser.newContext();
  const testPage = await testContext.newPage();
  
  const productUrls = [
    { path: '/try/dashboard', name: 'try-dashboard' },
    { path: '/try/dashboard/seating', name: 'try-seating' },
    { path: '/try/event-management', name: 'try-event-mgmt' },
    { path: '/wedding-website/eternal-gold?embed=1', name: 'wedding-eternal-gold', wait: true },
    { path: '/wedding-website/midnight-velvet?embed=1', name: 'wedding-midnight-velvet', wait: true },
    { path: '/wedding-website/garden-bloom?embed=1', name: 'wedding-garden-bloom', wait: true },
    { path: '/wedding-website', name: 'wedding-gallery' },
    { path: '/rsvp', name: 'rsvp-current' },
  ];
  
  console.log('Checking URL accessibility...');
  const accessibleUrls = [];
  
  for (const { path: urlPath, name, wait } of productUrls) {
    const url = `http://localhost:3010${urlPath}`;
    const status = await checkUrlStatus(testPage, url);
    console.log(`  ${url}: ${status}`);
    
    if (status === 200) {
      accessibleUrls.push({ url, name, wait });
    }
  }
  
  await testContext.close();
  
  console.log(`\nCapturing ${accessibleUrls.length} accessible URLs...\n`);
  
  for (const { url, name, wait } of accessibleUrls) {
    // Desktop
    const desktopPath = `/workspace/public/marketing/product/desktop-${name}.png`;
    await captureScreenshot(browser, url, desktopPath, desktopViewport, false);
    
    // Mobile
    const mobilePath = `/workspace/public/marketing/product/mobile-${name}.png`;
    await captureScreenshot(browser, url, mobilePath, mobileViewport, false);
  }
  
  await browser.close();
  
  console.log('\n=== SUMMARY ===\n');
  console.log(`Total screenshots attempted: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  
  console.log('\n=== DETAILED RESULTS ===\n');
  results.forEach(r => {
    const status = r.success ? `✓ ${r.status}` : `✗ ${r.error}`;
    console.log(`${status} | ${r.viewport} | ${r.url}`);
    console.log(`   -> ${r.outputPath}`);
  });
  
  // Write JSON report
  fs.writeFileSync(
    '/workspace/screenshot-report.json',
    JSON.stringify(results, null, 2)
  );
  console.log('\nReport saved to: /workspace/screenshot-report.json');
}

main().catch(console.error);
