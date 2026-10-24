import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const results = [];

async function captureScreenshot(browser, url, outputPath, viewport, waitTime = 3000) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();
  
  try {
    const response = await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    
    const status = response?.status() || 0;
    
    // Wait for content to load
    await page.waitForTimeout(waitTime);
    
    await page.screenshot({ 
      path: outputPath, 
      fullPage: false,
      type: 'png'
    });
    
    results.push({
      url,
      outputPath,
      status,
      success: true,
      viewport: `${viewport.width}x${viewport.height}`
    });
    
    console.log(`✓ ${status} | ${viewport.width}x${viewport.height} | ${url}`);
    console.log(`   -> ${path.basename(outputPath)}`);
    
  } catch (error) {
    results.push({
      url,
      outputPath,
      status: 0,
      success: false,
      error: error.message,
      viewport: `${viewport.width}x${viewport.height}`
    });
    console.log(`✗ FAIL | ${viewport.width}x${viewport.height} | ${url}`);
    console.log(`   Error: ${error.message.substring(0, 100)}`);
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
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
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
    
    await captureScreenshot(browser, url, outputPath, desktopViewport, 4000);
    
    // Copy to artifacts if successful
    if (fs.existsSync(outputPath)) {
      fs.copyFileSync(outputPath, artifactPath);
      console.log(`   Copied to: ${artifactPath}`);
    }
  }
  
  console.log('\n=== CAPTURING PRODUCT SCREENSHOTS (Localhost) ===\n');
  
  const productUrls = [
    { path: '/try/dashboard', name: 'try-dashboard' },
    { path: '/try/dashboard/seating', name: 'try-seating' },
    { path: '/try/event-management', name: 'try-event-mgmt' },
    { path: '/wedding-website/eternal-gold?embed=1', name: 'wedding-eternal-gold', wait: 4000 },
    { path: '/wedding-website/midnight-velvet?embed=1', name: 'wedding-midnight-velvet', wait: 4000 },
    { path: '/wedding-website/garden-bloom?embed=1', name: 'wedding-garden-bloom', wait: 4000 },
    { path: '/wedding-website', name: 'wedding-gallery' },
    { path: '/rsvp', name: 'rsvp-current' },
  ];
  
  for (const { path: urlPath, name, wait } of productUrls) {
    const url = `http://localhost:3010${urlPath}`;
    const waitTime = wait || 3000;
    
    // Desktop
    const desktopPath = `/workspace/public/marketing/product/desktop-${name}.png`;
    await captureScreenshot(browser, url, desktopPath, desktopViewport, waitTime);
    
    // Mobile
    const mobilePath = `/workspace/public/marketing/product/mobile-${name}.png`;
    await captureScreenshot(browser, url, mobilePath, mobileViewport, waitTime);
  }
  
  await browser.close();
  
  console.log('\n=== SUMMARY ===\n');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Total screenshots attempted: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n✓ SUCCESSFUL CAPTURES:');
    successful.forEach(r => {
      console.log(`  ${r.status} | ${path.basename(r.outputPath)}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n✗ FAILED CAPTURES:');
    failed.forEach(r => {
      console.log(`  ${r.url}`);
      console.log(`    Reason: ${r.error?.substring(0, 80)}`);
    });
  }
  
  // Write JSON report
  fs.writeFileSync(
    '/workspace/screenshot-report.json',
    JSON.stringify(results, null, 2)
  );
  console.log('\n📄 Full report: /workspace/screenshot-report.json');
}

main().catch(console.error);
