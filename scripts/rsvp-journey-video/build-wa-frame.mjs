/**
 * Builds clean HTML frames for the journey video (no demo-page image swapping):
 * - wa-frame.html — WhatsApp message with approved invite artwork
 * - personal-invite.html — personal-link invitation page with the same artwork
 * Also mints demo storageState for RSVP form / thanks / dashboard steps.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const RAW_DIR = join(__dirname, ".record");
const BASE = process.env.RSVP_RECORD_BASE || "http://127.0.0.1:3000";
mkdirSync(RAW_DIR, { recursive: true });

const inviteJpg = join(ROOT, "public/images/rsvp/invite-frame.jpg");
if (!existsSync(inviteJpg)) {
  throw new Error("Missing public/images/rsvp/invite-frame.jpg");
}

const imageDataUrl = `data:image/jpeg;base64,${readFileSync(inviteJpg).toString("base64")}`;

const caption = [
  "משפחה וחברים יקרים,",
  "הנכם מוזמנים לחתונה של מיה ואלון 🤍",
  "",
  "📅 תאריך: 24/06/2027",
  "🕒 קבלת פנים: 19:00 · חופה: 20:00",
  "📍 מיקום: אולמי אלכסנדר, עמק חפר",
  "",
  "לאישור הגעה לחצו על הכפתור למטה 👇",
  "נשמח לראותכם בשמחתנו 💖",
].join("\n");

const waHtml = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"/>
<style>
  html,body{margin:0;min-height:100%;background:#111;display:flex;align-items:center;justify-content:center;font-family:Heebo,Arial,sans-serif}
  .phone{width:360px;border-radius:38px;background:#000;padding:12px;box-shadow:0 26px 70px rgba(0,0,0,.35)}
  .screen{overflow:hidden;border-radius:30px;background:#ECE5DD}
  .hdr{border-bottom:1px solid rgba(0,0,0,.05);background:#F7F7F7;padding:8px 0;text-align:center;font-size:12px;font-weight:700;color:#5F5F5F}
  .pad{padding:14px}
  .card{overflow:hidden;border-radius:22px;background:#fff;box-shadow:0 8px 26px rgba(0,0,0,.08)}
  .card img{display:block;width:100%;height:auto;max-height:420px;object-fit:contain;object-position:center;background:#F7F1E8}
  .txt{white-space:pre-wrap;word-break:break-word;padding:14px 16px 16px;text-align:center;font-size:13px;line-height:1.7;color:#3E342C}
  .btn{margin-top:8px;width:100%;border:1px solid #e5e5e5;background:#fff;border-radius:12px;padding:10px 0;font-size:14px;font-weight:700;color:#1D6FB8;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  .btn.pulse{outline:3px solid rgba(29,111,184,.45);transform:scale(.98)}
</style>
</head>
<body>
  <div class="phone">
    <div class="screen">
      <div class="hdr">INVISTIMO · WhatsApp</div>
      <div class="pad">
        <div class="card">
          <img alt="הזמנה" src="${imageDataUrl}"/>
          <div class="txt">${caption.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>
        </div>
        <button class="btn" id="wa-btn" type="button">אישור הגעה</button>
      </div>
    </div>
  </div>
</body>
</html>`;

const personalHtml = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"/>
<style>
  html,body{margin:0;min-height:100%;background:#F7F1E8;font-family:Heebo,Arial,sans-serif;color:#2d241c}
  .wrap{min-height:100vh;box-sizing:border-box;padding:28px 18px 40px}
  .eyebrow{margin:0;text-align:center;font-size:12px;font-weight:700;letter-spacing:.24em;color:#b58a55}
  h1{margin:12px 0 18px;text-align:center;font-size:28px;line-height:1.25;font-weight:900}
  .card{overflow:hidden;border-radius:26px;background:#faf7f1;box-shadow:0 18px 40px rgba(58,39,20,.12)}
  .card img{display:block;width:100%;height:auto;object-fit:contain;background:#faf7f1}
  .hint{margin:22px 16px 0;text-align:center;font-size:15px;font-weight:700;line-height:1.6;color:#5C4A3A}
</style>
</head>
<body>
  <div class="wrap">
    <p class="eyebrow">הזמנה לאירוע</p>
    <h1>החתונה של מיה ואלון</h1>
    <div class="card">
      <img alt="הזמנה" src="${imageDataUrl}"/>
    </div>
    <p class="hint">נשמח לדעת אם תגיעו לחגוג איתנו</p>
  </div>
</body>
</html>`;

writeFileSync(join(RAW_DIR, "wa-frame.html"), waHtml);
writeFileSync(join(RAW_DIR, "personal-invite.html"), personalHtml);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: "he-IL",
});
await context.request.post(`${BASE}/api/demo/interactive`, {
  data: { mode: "free", restart: true },
});
const page = await context.newPage();
await page.goto(`${BASE}/try/dashboard`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(800);
writeFileSync(join(RAW_DIR, "storage.json"), JSON.stringify(await context.storageState()));
await browser.close();
console.log("wrote wa-frame.html + personal-invite.html");
