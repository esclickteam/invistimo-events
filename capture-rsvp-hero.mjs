import { chromium } from '@playwright/test';

const URL = 'https://booking-around-circulation-welding.trycloudflare.com/rsvp';
const OUTPUT_DIR = '/opt/cursor/artifacts/screenshots';

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();
  
  console.log(`Opening: ${URL}`);
  
  // Hard refresh - disable cache
  await context.clearCookies();
  await page.goto(URL, { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });
  
  console.log('Page loaded, waiting for content...');
  await page.waitForTimeout(3000);
  
  // Dismiss cookie banner if present
  try {
    const cookieSelectors = [
      'button:has-text("קבל")',
      'button:has-text("אישור")',
      'button:has-text("Accept")',
    ];
    
    for (const selector of cookieSelectors) {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        await page.waitForTimeout(500);
        break;
      }
    }
  } catch (e) {}
  
  // Check page structure
  console.log('\n=== ANALYZING PAGE STRUCTURE ===');
  
  // Get H1 position
  const h1Info = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    if (!h1) return null;
    const rect = h1.getBoundingClientRect();
    return {
      text: h1.textContent.trim().substring(0, 50),
      top: rect.top,
      visible: rect.top < window.innerHeight
    };
  });
  
  if (h1Info) {
    console.log(`H1 found: "${h1Info.text}"`);
    console.log(`H1 position: ${Math.round(h1Info.top)}px from top`);
    console.log(`H1 in viewport: ${h1Info.visible ? 'YES' : 'NO'}`);
  } else {
    console.log('H1: NOT FOUND');
  }
  
  // Check for package table above H1
  const tableAboveH1 = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    if (!h1) return { found: false };
    
    const h1Top = h1.getBoundingClientRect().top;
    const tables = document.querySelectorAll('table');
    
    for (const table of tables) {
      const tableTop = table.getBoundingClientRect().top;
      if (tableTop < h1Top && tableTop < window.innerHeight) {
        return { 
          found: true, 
          position: Math.round(tableTop),
          h1Position: Math.round(h1Top)
        };
      }
    }
    return { found: false };
  });
  
  if (tableAboveH1.found) {
    console.log(`⚠️  TABLE FOUND ABOVE H1 (table at ${tableAboveH1.position}px, H1 at ${tableAboveH1.position}px)`);
  } else {
    console.log('✓ No package table above H1');
  }
  
  // Screenshot 1: Hero viewport
  console.log('\n=== SCREENSHOT 1: HERO ===');
  const heroPath = `${OUTPUT_DIR}/seo-rsvp-flagship.png`;
  await page.screenshot({ 
    path: heroPath, 
    fullPage: false,
    type: 'png'
  });
  console.log(`✓ Saved: ${heroPath}`);
  
  // Screenshot 2: Scroll to show short answer
  console.log('\n=== SCREENSHOT 2: AFTER HERO (with short answer) ===');
  
  // Find short answer section
  const shortAnswerScroll = await page.evaluate(() => {
    const shortAnswer = document.querySelector('*:has-text("התשובה הקצרה")');
    if (shortAnswer) {
      const rect = shortAnswer.getBoundingClientRect();
      // Scroll so short answer is near top of viewport
      return window.scrollY + rect.top - 100;
    }
    return 400; // Default scroll
  });
  
  await page.evaluate((y) => window.scrollTo(0, y), shortAnswerScroll);
  await page.waitForTimeout(1000);
  
  const afterHeroPath = `${OUTPUT_DIR}/seo-rsvp-after-hero.png`;
  await page.screenshot({ 
    path: afterHeroPath, 
    fullPage: false,
    type: 'png'
  });
  console.log(`✓ Saved: ${afterHeroPath}`);
  
  await browser.close();
  
  console.log('\n=== VERDICT ===');
  const verdict = tableAboveH1.found 
    ? '❌ FAIL: Package table appears above H1 headline' 
    : '✅ PASS: Hero section clean - no table above H1';
  console.log(verdict);
  
  console.log('\n=== FILE PATHS ===');
  console.log(heroPath);
  console.log(afterHeroPath);
  
  return { heroPath, afterHeroPath, tableAboveH1: tableAboveH1.found, verdict };
}

main().catch(console.error);
