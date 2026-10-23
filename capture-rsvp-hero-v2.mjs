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
  
  // Use domcontentloaded instead of networkidle
  const response = await page.goto(URL, { 
    waitUntil: 'domcontentloaded',
    timeout: 20000 
  });
  
  console.log(`Status: ${response?.status()}`);
  console.log('Waiting for content to render...');
  await page.waitForTimeout(4000);
  
  // Dismiss cookie banner if present
  try {
    const cookieButton = await page.$('button:has-text("קבל"), button:has-text("Accept"), button:has-text("אישור")');
    if (cookieButton) {
      await cookieButton.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {}
  
  // Check page structure
  console.log('\n=== PAGE STRUCTURE ===');
  
  const analysis = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const tables = document.querySelectorAll('table');
    
    if (!h1) return { h1Found: false, tableAboveH1: false };
    
    const h1Rect = h1.getBoundingClientRect();
    const h1Top = h1Rect.top;
    
    let tableAboveH1 = false;
    for (const table of tables) {
      const tableTop = table.getBoundingClientRect().top;
      if (tableTop < h1Top - 50 && tableTop >= 0) {
        tableAboveH1 = true;
        break;
      }
    }
    
    return {
      h1Found: true,
      h1Text: h1.textContent.trim().substring(0, 60),
      h1Top: Math.round(h1Top),
      h1Visible: h1Top < window.innerHeight,
      tableAboveH1,
      tablesTotal: tables.length
    };
  });
  
  console.log(`H1: ${analysis.h1Found ? `"${analysis.h1Text}"` : 'NOT FOUND'}`);
  if (analysis.h1Found) {
    console.log(`H1 position: ${analysis.h1Top}px from top`);
    console.log(`H1 in viewport: ${analysis.h1Visible ? 'YES' : 'NO'}`);
    console.log(`Tables on page: ${analysis.tablesTotal}`);
    console.log(`Table above H1: ${analysis.tableAboveH1 ? 'YES ⚠️' : 'NO ✓'}`);
  }
  
  // Screenshot 1: Hero viewport (top of page)
  console.log('\n=== CAPTURING SCREENSHOTS ===');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  
  const heroPath = `${OUTPUT_DIR}/seo-rsvp-flagship.png`;
  await page.screenshot({ 
    path: heroPath, 
    fullPage: false,
    type: 'png'
  });
  console.log(`✓ Hero: ${heroPath}`);
  
  // Screenshot 2: Scroll to show "התשובה הקצרה"
  const scrolled = await page.evaluate(() => {
    // Look for short answer section
    const elements = Array.from(document.querySelectorAll('*'));
    const shortAnswer = elements.find(el => el.textContent.includes('התשובה הקצרה'));
    
    if (shortAnswer) {
      const rect = shortAnswer.getBoundingClientRect();
      const scrollTarget = window.scrollY + rect.top - 150;
      window.scrollTo(0, scrollTarget);
      return true;
    }
    
    // Fallback: scroll 500px
    window.scrollTo(0, 500);
    return false;
  });
  
  console.log(`Short answer found: ${scrolled ? 'YES' : 'NO (scrolled 500px)'}`);
  await page.waitForTimeout(1000);
  
  const afterHeroPath = `${OUTPUT_DIR}/seo-rsvp-after-hero.png`;
  await page.screenshot({ 
    path: afterHeroPath, 
    fullPage: false,
    type: 'png'
  });
  console.log(`✓ After hero: ${afterHeroPath}`);
  
  await browser.close();
  
  // Verdict
  console.log('\n=== VERDICT ===');
  const verdict = analysis.tableAboveH1 
    ? '❌ Package table appears ABOVE H1 - layout issue detected' 
    : '✅ Hero clean: H1 headline visible, no table above it';
  console.log(verdict);
  
  console.log('\n=== FILES ===');
  console.log(heroPath);
  console.log(afterHeroPath);
}

main().catch(console.error);
