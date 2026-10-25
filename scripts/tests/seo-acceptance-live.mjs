/**
 * Live acceptance checks against a running local/staging origin.
 * Usage: SEO_BASE_URL=http://127.0.0.1:3010 node scripts/tests/seo-acceptance-live.mjs
 *
 * Does not invent Search Console data. Reports PASS/FAIL/WARN per URL.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const BASE = (process.env.SEO_BASE_URL || "http://127.0.0.1:3010").replace(/\/$/, "");
const SITE = "https://www.invistimo.com";
const OUT = process.env.SEO_ACCEPTANCE_OUT || path.resolve("docs/seo/acceptance-results.json");

const CORE = [
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
  "/contact",
  "/credit-gifts",
  "/wedding-website",
  "/terms",
  "/privacy",
  "/accessibility",
];

const GUIDE_SLUGS = [
  "cost-rsvp-wedding",
  "when-to-send-rsvp",
  "send-digital-invitation",
  "seating-plan",
  "save-the-date-vs-invitation",
  "wedding-venue-guest-guarantee",
  "guest-list",
  "guests-who-dont-reply",
  "table-number-message",
  "event-day-checklist",
];

const ANSWER_PATHS = new Set([
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
  ...GUIDE_SLUGS.map((s) => `/info/guides/${s}`),
]);

const MARKETING = [...CORE, ...GUIDE_SLUGS.map((s) => `/info/guides/${s}`)];

function extractMeta(html, name) {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i");
  return (html.match(re) || html.match(re2) || [])[1] || "";
}

function extractProperty(html, prop) {
  const re = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`, "i");
  return (html.match(re) || html.match(re2) || [])[1] || "";
}

function extractCanonical(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return m ? m[1] : "";
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : "";
}

function countH1(html) {
  const matches = html.match(/<h1\b[^>]*>/gi) || [];
  return matches.length;
}

function extractJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      blocks.push({ parseError: true, raw: m[1].slice(0, 120) });
    }
  }
  return blocks;
}

function collectTypes(node, into = new Set()) {
  if (!node || typeof node !== "object") return into;
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, into);
    return into;
  }
  if (node["@type"]) {
    const t = node["@type"];
    if (Array.isArray(t)) t.forEach((x) => into.add(String(x)));
    else into.add(String(t));
  }
  if (node["@graph"]) collectTypes(node["@graph"], into);
  for (const value of Object.values(node)) {
    if (value && typeof value === "object") collectTypes(value, into);
  }
  return into;
}

function robotsIndexable(html) {
  const robots = extractMeta(html, "robots").toLowerCase();
  const googlebot = extractMeta(html, "googlebot").toLowerCase();
  const joined = `${robots} ${googlebot}`;
  if (joined.includes("noindex")) return false;
  return true;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "InvistimoSEO-Acceptance/1.0" },
    redirect: "manual",
  });
  const text = await res.text();
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), text, url };
}

function expectedCanonical(pathname) {
  if (pathname === "/") return SITE;
  return `${SITE}${pathname}`;
}

async function checkPage(pathname) {
  const result = {
    path: pathname,
    status: "PASS",
    checks: {},
    warnings: [],
    failures: [],
  };
  const { status, text: html } = await fetchText(`${BASE}${pathname === "/" ? "/" : pathname}`);
  result.httpStatus = status;
  if (status !== 200) {
    result.status = "FAIL";
    result.failures.push(`HTTP ${status}`);
    return result;
  }

  const title = extractTitle(html);
  const description = extractMeta(html, "description");
  const canonical = extractCanonical(html);
  const h1Count = countH1(html);
  const indexable = robotsIndexable(html);
  const jsonld = extractJsonLdBlocks(html);
  const types = new Set();
  for (const block of jsonld) collectTypes(block, types);
  const hasAnswer = html.includes("התשובה הקצרה");
  const hasAggregate = /AggregateRating|"Review"/.test(html);
  const ogUrl = extractProperty(html, "og:url");
  const dirRtl = /dir=["']rtl["']/i.test(html) || /<html[^>]+dir=["']rtl["']/i.test(html);
  const langHe = /lang=["']he["']/i.test(html);

  const expectCanon = expectedCanonical(pathname);
  result.checks = {
    http200: status === 200,
    titlePresent: Boolean(title),
    descriptionPresent: Boolean(description),
    canonicalExact: canonical === expectCanon,
    canonical: canonical,
    expectedCanonical: expectCanon,
    indexable,
    h1Count,
    singleH1: h1Count === 1,
    jsonLdBlocks: jsonld.length,
    jsonLdTypes: [...types].sort(),
    jsonLdParseOk: jsonld.every((b) => !b.parseError),
    answerFirst: ANSWER_PATHS.has(pathname) ? hasAnswer : null,
    noFakeReviews: !hasAggregate,
    ogUrl,
    rtl: dirRtl,
    langHe,
    htmlBytes: Buffer.byteLength(html, "utf8"),
  };

  if (!result.checks.titlePresent) result.failures.push("missing title");
  if (!result.checks.descriptionPresent) result.failures.push("missing description");
  if (!result.checks.canonicalExact) result.failures.push(`canonical mismatch: ${canonical}`);
  if (!result.checks.indexable) result.failures.push("noindex on marketing page");
  if (h1Count === 0) result.failures.push("no H1");
  if (h1Count > 1) result.warnings.push(`multiple H1 (${h1Count})`);
  if (!result.checks.jsonLdParseOk) result.failures.push("JSON-LD parse error");
  if (jsonld.length === 0 && !["/terms", "/privacy", "/accessibility", "/credit-gifts", "/wedding-website"].includes(pathname)) {
    result.warnings.push("no JSON-LD block");
  }
  if (ANSWER_PATHS.has(pathname) && !hasAnswer) result.failures.push("missing answer-first block");
  if (hasAggregate) result.failures.push("AggregateRating/Review found");
  if (!langHe) result.warnings.push("html lang not he");
  if (!dirRtl) result.warnings.push("rtl dir not detected in initial HTML");
  if (types.has("AggregateRating") || types.has("Review")) result.failures.push("forbidden review schema");

  if (result.failures.length) result.status = "FAIL";
  else if (result.warnings.length) result.status = "WARN";
  else result.status = "PASS";
  return result;
}

async function checkRobotsAndSitemap() {
  const robots = await fetchText(`${BASE}/robots.txt`);
  const sitemap = await fetchText(`${BASE}/sitemap.xml`);
  const answers = await fetchText(`${BASE}/answers.json`);
  const llms = await fetchText(`${BASE}/llms.txt`);

  const robotsOk =
    robots.status === 200 &&
    robots.text.includes("Allow: /") &&
    robots.text.includes("Disallow: /dashboard") &&
    robots.text.includes("Disallow: /login") &&
    !robots.text.toLowerCase().includes("disallow: /rsvp") &&
    robots.text.includes("Sitemap:");

  const urls = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const missing = MARKETING.filter((p) => !urls.includes(expectedCanonical(p)));
  const leaked = urls.filter((u) => /\/(login|register|dashboard|invite|admin|try)(\/|$)/.test(u));

  return {
    robots: {
      status: robotsOk ? "PASS" : "FAIL",
      httpStatus: robots.status,
      hasGooglebotRule: /User-Agent:\s*Googlebot/i.test(robots.text),
      hasBingbotRule: /User-Agent:\s*Bingbot/i.test(robots.text),
      hasOaiRule: /User-Agent:\s*OAI-SearchBot/i.test(robots.text),
    },
    sitemap: {
      status: missing.length || leaked.length || sitemap.status !== 200 ? "FAIL" : "PASS",
      httpStatus: sitemap.status,
      urlCount: urls.length,
      missingMarketing: missing,
      leakedPrivate: leaked,
    },
    answersJson: { status: answers.status === 200 ? "PASS" : "FAIL", httpStatus: answers.status },
    llmsTxt: {
      status: answers.status === 200 && llms.status === 200 && /not a ranking factor/i.test(llms.text) ? "PASS" : "FAIL",
      httpStatus: llms.status,
    },
  };
}

async function checkInternalLinksSample() {
  const pages = ["/rsvp", "/pricing", "/info/guides", "/seating-explained", "/event-management"];
  const report = [];
  for (const pathname of pages) {
    const { status, text } = await fetchText(`${BASE}${pathname}`);
    if (status !== 200) {
      report.push({ path: pathname, status: "FAIL", broken: [`HTTP ${status}`] });
      continue;
    }
    const hrefs = [...text.matchAll(/href=["'](\/[^"'#?]+)/g)].map((m) => m[1]);
    const unique = [...new Set(hrefs)].filter((h) => !h.startsWith("/api") && !h.includes("["));
    const broken = [];
    for (const href of unique.slice(0, 25)) {
      const res = await fetchText(`${BASE}${href}`);
      if (![200, 301, 302, 307, 308].includes(res.status)) broken.push(`${href} -> ${res.status}`);
    }
    report.push({
      path: pathname,
      status: broken.length ? "FAIL" : "PASS",
      checked: Math.min(unique.length, 25),
      broken,
    });
  }
  return report;
}

async function main() {
  const pages = [];
  for (const pathname of MARKETING) {
    pages.push(await checkPage(pathname));
  }
  const infra = await checkRobotsAndSitemap();
  const links = await checkInternalLinksSample();

  const summary = {
    base: BASE,
    checkedAt: new Date().toISOString(),
    pageCounts: {
      total: pages.length,
      pass: pages.filter((p) => p.status === "PASS").length,
      warn: pages.filter((p) => p.status === "WARN").length,
      fail: pages.filter((p) => p.status === "FAIL").length,
    },
    infra,
    links,
    pages,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2) + "\n");

  console.log(JSON.stringify({
    base: BASE,
    pageCounts: summary.pageCounts,
    robots: infra.robots.status,
    sitemap: infra.sitemap.status,
    answers: infra.answersJson.status,
    llms: infra.llmsTxt.status,
    linkFails: links.filter((l) => l.status === "FAIL").length,
    out: OUT,
  }, null, 2));

  const hardFail =
    summary.pageCounts.fail > 0 ||
    infra.robots.status === "FAIL" ||
    infra.sitemap.status === "FAIL" ||
    infra.answersJson.status === "FAIL" ||
    infra.llmsTxt.status === "FAIL" ||
    links.some((l) => l.status === "FAIL");

  if (hardFail) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

void assert;
void require;
