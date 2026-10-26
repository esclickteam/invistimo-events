/**
 * Final pre-publish smoke against Preview (or SEO_BASE).
 * Loads pages and checks UI affordances. Does NOT submit forms,
 * create accounts, charge cards, or message real guests.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.SEO_BASE || "http://127.0.0.1:3010").replace(/\/$/, "");
const OUT = path.join(process.cwd(), "docs/seo/preview-acceptance-final.json");

const MARKETING = [
  "/",
  "/rsvp",
  "/rsvp/chatuna",
  "/rsvp/whatsapp",
  "/rsvp/save-the-date",
  "/invitations/chatuna",
  "/seating-explained",
  "/event-management",
  "/pricing",
  "/faq",
  "/info/about",
  "/info/guides",
  "/info/guides/cost-rsvp-wedding",
  "/info/guides/when-to-send-rsvp",
  "/info/guides/send-digital-invitation",
  "/info/guides/seating-plan",
  "/info/guides/save-the-date-vs-invitation",
  "/info/guides/guests-who-dont-reply",
  "/info/guides/table-number-message",
  "/info/guides/event-day-checklist",
  "/info/guides/guest-list",
  "/info/guides/wedding-venue-guest-guarantee",
  "/info/guides/wedding-seating-arrangements",
  "/contact",
];

const SMOKE = [
  { path: "/register", expect: ["form", "password|סיסמה|הרשמה|email|אימייל"], note: "registration UI" },
  { path: "/login", expect: ["form", "password|סיסמה|התחברות"], note: "login UI" },
  { path: "/contact", expect: ["form", "submit|שלח|פנה"], note: "contact form present — not submitted" },
  { path: "/pricing", expect: ["pricing-title|בחרו את החבילה", "whatsapp-cta|אני רוצה את החבילה", "record-input|רשומות"], note: "calculator UI — no WhatsApp order" },
  { path: "/plans", expect: ["register|הירשם|חבילה|/pricing"], note: "legacy plans redirect/links" },
  { path: "/try/dashboard", expect: ["dashboard|אירוע|מוזמנים|demo|דמו"], note: "demo dashboard" },
  { path: "/try/dashboard/seating", expect: ["הושבה|שולחן|seating|סקיצה"], note: "demo seating" },
  { path: "/try/event-management", expect: ["ניהול|משימות|תקציב|event"], note: "demo event management" },
  { path: "/try/dashboard/messages/new", expect: ["הודע|וואטסאפ|הזמנ|message"], note: "demo messages" },
];

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "InvistimoPreviewSmoke/1.0", accept: "text/html,*/*" },
  });
  const text = await res.text();
  return { status: res.status, text, finalUrl: res.url };
}

function hasAny(html, pattern) {
  return new RegExp(pattern, "i").test(html);
}

function robotsAllowsAi(robotsTxt) {
  const lines = robotsTxt.split(/\r?\n/);
  const agents = ["GPTBot", "ChatGPT-User", "Google-Extended", "anthropic-ai", "ClaudeBot", "PerplexityBot", "Bytespider"];
  const result = {};
  for (const agent of agents) {
    let inAgent = false;
    let disallowedAll = false;
    for (const raw of lines) {
      const line = raw.trim();
      if (/^user-agent:/i.test(line)) {
        const value = line.split(":").slice(1).join(":").trim();
        inAgent = value === "*" || value.toLowerCase() === agent.toLowerCase();
        continue;
      }
      if (inAgent && /^disallow:\s*\/\s*$/i.test(line)) disallowedAll = true;
    }
    result[agent] = disallowedAll ? "BLOCKED_SITEWIDE" : "NOT_SITEWIDE_BLOCK (check specific rules)";
  }
  return result;
}

const rows = [];
let fails = 0;

console.log("BASE", BASE);

for (const p of MARKETING) {
  try {
    const { status, text } = await fetchText(`${BASE}${p}`);
    const title = (text.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim() || "";
    const hasH1 = /<h1[\s>]/i.test(text);
    const canonical = (text.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
      text.match(/href=["']([^"']+)["'][^>]*rel=["']canonical["']/i) || [])[1] || "";
    const answer = /התשובה הקצרה/.test(text);
    const ok = status === 200 && hasH1 && title.length > 0;
    if (!ok) fails += 1;
    rows.push({
      group: "marketing",
      path: p,
      status,
      title,
      hasH1,
      canonical,
      answerFirst: answer,
      result: ok ? "PASS" : "FAIL",
    });
    console.log(ok ? "PASS" : "FAIL", status, p, title.slice(0, 60));
  } catch (err) {
    fails += 1;
    rows.push({ group: "marketing", path: p, result: "FAIL", error: String(err.message || err) });
    console.log("FAIL", p, err.message || err);
  }
}

for (const item of SMOKE) {
  try {
    const { status, text } = await fetchText(`${BASE}${item.path}`);
    const checks = item.expect.map((pat) => ({ pat, ok: hasAny(text, pat) }));
    const ok = status >= 200 && status < 400 && checks.every((c) => c.ok);
    if (!ok) fails += 1;
    rows.push({
      group: "smoke",
      path: item.path,
      status,
      note: item.note,
      checks,
      result: ok ? "PASS" : "WARN",
      actionTaken: "none — view only",
    });
    console.log(ok ? "PASS" : "WARN", status, item.path, item.note);
  } catch (err) {
    fails += 1;
    rows.push({ group: "smoke", path: item.path, result: "FAIL", error: String(err.message || err) });
    console.log("FAIL", item.path, err.message || err);
  }
}

// Guest invite with fake id — must not look like a successful real RSVP submit
{
  const fake = "/invite/rsvp/preview-smoke-nonexistent-share-id";
  try {
    const { status, text } = await fetchText(`${BASE}${fake}`);
    const submitted = /נשמר|נשלח בהצלחה|תודה שאישרת/.test(text) && status === 200;
    const ok = !submitted && status >= 200;
    if (!ok) fails += 1;
    rows.push({
      group: "guest",
      path: fake,
      status,
      result: ok ? "PASS" : "FAIL",
      note: "fake guest RSVP URL loaded without submitting confirmation",
      actionTaken: "none",
    });
    console.log(ok ? "PASS" : "FAIL", status, fake);
  } catch (err) {
    rows.push({ group: "guest", path: fake, result: "WARN", error: String(err.message || err) });
  }
}

const infra = {};
for (const file of ["/robots.txt", "/sitemap.xml", "/answers.json", "/llms.txt"]) {
  try {
    const { status, text } = await fetchText(`${BASE}${file}`);
    infra[file] = { status, bytes: text.length, result: status === 200 ? "PASS" : "FAIL" };
    if (status !== 200) fails += 1;
    if (file === "/robots.txt") infra.aiCrawlers = robotsAllowsAi(text);
    if (file === "/sitemap.xml") {
      infra.sitemapUrlCount = (text.match(/<loc>/g) || []).length;
    }
    console.log(infra[file].result, status, file);
  } catch (err) {
    fails += 1;
    infra[file] = { result: "FAIL", error: String(err.message || err) };
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  policy: "No form submits, no payments, no real guest messages, no registration completes.",
  marketingPass: rows.filter((r) => r.group === "marketing" && r.result === "PASS").length,
  marketingTotal: rows.filter((r) => r.group === "marketing").length,
  smoke: rows.filter((r) => r.group === "smoke"),
  guest: rows.filter((r) => r.group === "guest"),
  infra,
  failCount: fails,
  rows,
};

fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log("\nWrote", OUT);
console.log("Fails/Warns counted:", fails);
process.exit(fails > 0 ? 1 : 0);
