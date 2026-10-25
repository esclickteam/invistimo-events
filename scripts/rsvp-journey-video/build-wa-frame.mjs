/**
 * Captures the real WhatsApp template preview from the product UI
 * and writes a self-contained HTML frame with inline styles (no Tailwind).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, ".record");
const BASE = process.env.RSVP_RECORD_BASE || "http://127.0.0.1:3000";
mkdirSync(RAW_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: "he-IL",
});
await context.request.post(`${BASE}/api/demo/interactive`, {
  data: { mode: "free", restart: true },
});
const page = await context.newPage();
await page.goto(`${BASE}/try/dashboard/messages/new`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(2000);
await page.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find((n) =>
    (n.textContent || "").includes("INVISTIMO · WhatsApp")
  );
  el?.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(400);

const data = await page.evaluate(async () => {
  const label = [...document.querySelectorAll("*")].find(
    (el) => (el.textContent || "").trim() === "INVISTIMO · WhatsApp"
  );
  if (!label) return null;
  let shell = label;
  for (let i = 0; i < 10; i++) {
    const parent = shell.parentElement;
    if (!parent || parent === document.body || parent === document.documentElement) break;
    shell = parent;
    const cls = String(shell.className || "");
    if (cls.includes("bg-black") && cls.includes("rounded")) break;
  }
  const img = shell.querySelector("img");
  let imageDataUrl = "";
  if (img?.src) {
    const res = await fetch(img.src);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary);
    const ctype = res.headers.get("content-type") || "image/png";
    imageDataUrl = `data:${ctype};base64,${b64}`;
  }
  const text =
    shell.querySelector(".whitespace-pre-wrap, [class*='whitespace-pre-wrap']")?.textContent ||
    [...shell.querySelectorAll("div")]
      .map((d) => d.textContent || "")
      .find((t) => t.includes("משפחה וחברים")) ||
    "";
  return { imageDataUrl, text: text.trim() };
});

if (!data?.text) throw new Error("Failed to extract WA preview content");

const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"/>
<style>
  html,body{margin:0;min-height:100%;background:#111;display:flex;align-items:center;justify-content:center;font-family:Heebo,Arial,sans-serif}
  .phone{width:360px;border-radius:38px;background:#000;padding:12px;box-shadow:0 26px 70px rgba(0,0,0,.35)}
  .screen{overflow:hidden;border-radius:30px;background:#ECE5DD}
  .hdr{border-bottom:1px solid rgba(0,0,0,.05);background:#F7F7F7;padding:8px 0;text-align:center;font-size:12px;font-weight:700;color:#5F5F5F}
  .pad{padding:16px}
  .card{overflow:hidden;border-radius:22px;background:#fff;box-shadow:0 8px 26px rgba(0,0,0,.08)}
  .card img{display:block;width:100%;height:185px;object-fit:cover;object-position:center}
  .txt{white-space:pre-wrap;word-break:break-word;padding:16px;text-align:center;font-size:14px;line-height:1.75;color:#3E342C}
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
          <img alt="" src="${data.imageDataUrl}"/>
          <div class="txt">${data.text.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</div>
        </div>
        <button class="btn" id="wa-btn" type="button">אישור הגעה</button>
      </div>
    </div>
  </div>
</body>
</html>`;

writeFileSync(join(RAW_DIR, "wa-frame.html"), html);
const storage = await context.storageState();
writeFileSync(join(RAW_DIR, "storage.json"), JSON.stringify(storage));
await browser.close();
console.log("wrote wa-frame.html");
