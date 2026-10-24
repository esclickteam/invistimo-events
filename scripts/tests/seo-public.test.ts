import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  analyticsAllowed,
  aiReferrerLabel,
  aiTrafficLabel,
  aiUtmLabel,
  contentGroup,
} from "../../lib/seo/analytics";
import { PAGE_ANSWERS, tableFor } from "../../lib/seo/answers";
import { PILLARS } from "../../lib/seo/clusters";
import { GUIDES, guidePath } from "../../lib/seo/guides";
import { AI_MONITOR_QUESTIONS, KEYWORD_MAP } from "../../lib/seo/keywordMap";
import {
  articleNode,
  breadcrumbNode,
  faqNode,
  organizationNode,
  serviceNode,
  softwareNode,
  websiteNode,
} from "../../lib/seo/jsonld";
import { CORE_PUBLIC_ROUTES, OG_IMAGE, pageMetadata } from "../../lib/seo/site";
import { SERVICE_PAGES } from "../../lib/seo/services";
import robots from "../../app/robots";
import sitemap from "../../app/sitemap";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

/**
 * Routes that already existed as one URL segment. A new one-segment page can
 * replace a guest short code, because app/[code]/route.ts matches any single
 * segment that is not a real file. New marketing URLs stay on two or more
 * segments.
 */
const EXISTING_SINGLE_SEGMENTS = new Set([
  "accessibility",
  "admin",
  "check-in",
  "contact",
  "credit-gifts",
  "dashboard",
  "e",
  "employee",
  "event-management",
  "events",
  "faq",
  "forgot-password",
  "invite",
  "live",
  "login",
  "menus",
  "payment",
  "plans",
  "pricing",
  "privacy",
  "producer",
  "producer-staff",
  "register",
  "reset-password",
  "rsvp",
  "sales-documents",
  "seating-explained",
  "set-password",
  "staff",
  "terms",
  "thank-you",
  "try",
  "venue-client",
  "venues",
  "w",
  "wedding-challenges",
  "wedding-website",
]);

function pageRoutes(dir: string, segments: string[]): string[] {
  const routes: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nextSegments = entry.name.startsWith("(") && entry.name.endsWith(")")
        ? segments
        : [...segments, entry.name];
      routes.push(...pageRoutes(full, nextSegments));
      continue;
    }
    if (entry.isFile() && /^page\.(tsx|jsx|ts|js)$/.test(entry.name)) {
      routes.push("/" + segments.join("/"));
    }
  }
  return routes;
}

test("public metadata has a unique absolute canonical and stays indexable", () => {
  const home = pageMetadata({ title: "בית", description: "בית", path: "/" });
  const rsvp = pageMetadata({
    title: "אישורי הגעה",
    description: "אישורי הגעה",
    path: "/rsvp",
  });
  assert.equal(home.alternates && "canonical" in home.alternates && home.alternates.canonical, "https://www.invistimo.com");
  assert.equal(rsvp.alternates && "canonical" in rsvp.alternates && rsvp.alternates.canonical, "https://www.invistimo.com/rsvp");
  assert.notEqual(
    home.alternates && "canonical" in home.alternates && home.alternates.canonical,
    rsvp.alternates && "canonical" in rsvp.alternates && rsvp.alternates.canonical
  );
  assert.equal(home.robots && typeof home.robots === "object" && "index" in home.robots && home.robots.index, true);
  assert.match(String(OG_IMAGE.url), /^https:\/\/www\.invistimo\.com\/og-invistimo\.jpg$/);

  const titles = CORE_PUBLIC_ROUTES.map((route) => route.title);
  assert.equal(new Set(titles).size, titles.length);
  const paths = CORE_PUBLIC_ROUTES.map((route) => route.path);
  assert.equal(new Set(paths).size, paths.length);
});

test("sitemap lists public guides and omits private or auth URLs", () => {
  const urls = sitemap().map((item) => item.url);
  assert.ok(urls.includes("https://www.invistimo.com") || urls.includes("https://www.invistimo.com/"));
  assert.ok(urls.includes("https://www.invistimo.com/rsvp/chatuna"));
  assert.ok(urls.includes("https://www.invistimo.com/info/guides"));
  for (const guide of GUIDES) {
    assert.ok(urls.includes(`https://www.invistimo.com${guidePath(guide.slug)}`));
  }
  assert.equal(
    urls.some((url) => /\/wedding-website\/[^/]+$/.test(new URL(url).pathname)),
    false,
    "demo template URLs must stay out of the sitemap"
  );
  const blocked = ["/login", "/register", "/dashboard", "/invite", "/w/", "/plans", "/admin", "/try"];
  for (const url of urls) {
    const pathname = new URL(url).pathname;
    for (const prefix of blocked) {
      assert.equal(pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`), false, url);
    }
  }
});

test("robots.txt allows guest links and search crawlers, and blocks private apps", () => {
  const rules = robots();
  const list = Array.isArray(rules.rules) ? rules.rules : [rules.rules];
  assert.ok(list.length >= 1);
  const agents = list.map((rule) => rule.userAgent);
  assert.ok(agents.includes("*"));
  assert.ok(agents.includes("Googlebot"));
  assert.ok(agents.includes("Bingbot"));
  assert.ok(agents.includes("OAI-SearchBot"));
  for (const rule of list) {
    const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
    assert.ok(disallow.includes("/dashboard"));
    assert.ok(disallow.includes("/admin"));
    assert.ok(disallow.includes("/login"));
    assert.ok(disallow.includes("/register"));
    assert.equal(disallow.includes("/invite"), false);
    assert.equal(disallow.includes("/w"), false);
    assert.equal(disallow.includes("/e"), false);
    assert.equal(disallow.includes("/live"), false);
  }
  assert.match(String(rules.sitemap), /\/sitemap\.xml$/);
});

test("unknown short codes 404 and known short links still redirect to their target", () => {
  const shortRoute = read("app/[code]/route.ts");
  assert.match(shortRoute, /ShortLink\.findOne\(\{ code \}\)/);
  assert.match(shortRoute, /targetUrl/);
  assert.match(shortRoute, /notFound\(\)/);
  assert.match(shortRoute, /status:\s*302/);
  assert.doesNotMatch(shortRoute, /findOne\(\{ shareId/);
  assert.doesNotMatch(shortRoute, /redirect\(\s*["']\/["']\s*\)/);
  assert.doesNotMatch(shortRoute, /NextResponse\.redirect\(\s*["']\/["']/);
  assert.match(read("app/not-found.tsx"), /העמוד לא נמצא/);
});

test("new public URLs cannot shadow a one-segment guest short code", () => {
  const routes = pageRoutes(path.join(root, "app"), []);
  const single = routes.filter((route) => route.split("/").filter(Boolean).length === 1);
  const unexpected = single
    .map((route) => route.slice(1))
    .filter((segment) => !EXISTING_SINGLE_SEGMENTS.has(segment));
  assert.deepEqual(unexpected, []);

  for (const route of [...CORE_PUBLIC_ROUTES.map((item) => item.path), ...SERVICE_PAGES.map((item) => item.path), ...GUIDES.map((item) => guidePath(item.slug))]) {
    const count = route.split("/").filter(Boolean).length;
    if (count <= 1) {
      assert.ok(route === "/" || EXISTING_SINGLE_SEGMENTS.has(route.slice(1)), route);
    } else {
      assert.ok(count >= 2, route);
    }
  }
});

test("guest, auth, and customer surfaces are noindex without closing the pages", () => {
  assert.match(read("app/invite/layout.tsx"), /NOINDEX/);
  assert.match(read("app/w/layout.tsx"), /NOINDEX/);
  assert.match(read("app/w/layout.tsx"), /display: none/);
  assert.match(read("app/(auth)/layout.tsx"), /NOINDEX/);
  assert.match(read("app/plans/layout.tsx"), /NOINDEX/);
  assert.match(read("app/plans/layout.tsx"), /invistimo\.com\/pricing/);
  assert.match(read("app/try/layout.tsx"), /NOINDEX/);
  assert.match(read("app/check-in/layout.tsx"), /NOINDEX/);
  const headers = read("next.config.ts");
  assert.match(headers, /X-Robots-Tag/);
  assert.match(headers, /noindex, nofollow/);
  for (const source of ["/invite", "/w/:path*", "/dashboard", "/login", "/register", "/e/:path*", "/live/:path*"]) {
    assert.ok(headers.includes(`"${source}"`), source);
  }
});

test("analytics stays off guest and account URLs and on public marketing URLs", () => {
  assert.equal(analyticsAllowed("/"), true);
  assert.equal(analyticsAllowed("/rsvp"), true);
  assert.equal(analyticsAllowed("/rsvp/chatuna"), true);
  assert.equal(analyticsAllowed("/event-management"), true);
  assert.equal(analyticsAllowed("/wedding-website"), true);
  assert.equal(analyticsAllowed("/wedding-website/classic"), true);
  assert.equal(analyticsAllowed("/invite/abc"), false);
  assert.equal(analyticsAllowed("/w/abc"), false);
  assert.equal(analyticsAllowed("/e/abc"), false);
  assert.equal(analyticsAllowed("/live/token"), false);
  assert.equal(analyticsAllowed("/dashboard"), false);
  assert.equal(analyticsAllowed("/dashboard/create-invite"), false);
  assert.equal(analyticsAllowed("/check-in/pass/token"), false);
  assert.equal(analyticsAllowed("/login"), false);
});

test("AI referral helpers recognize hosts and UTMs without inventing traffic", () => {
  assert.equal(aiReferrerLabel("https://chatgpt.com/"), "chatgpt");
  assert.equal(aiReferrerLabel("https://www.perplexity.ai/search"), "perplexity");
  assert.equal(aiReferrerLabel("https://gemini.google.com/app"), "gemini");
  assert.equal(aiReferrerLabel("https://copilot.microsoft.com/"), "copilot");
  assert.equal(aiReferrerLabel("https://claude.ai/chat"), "claude");
  assert.equal(aiReferrerLabel("https://www.google.com/"), "");
  assert.equal(aiUtmLabel("?utm_source=chatgpt.com&utm_medium=ai"), "chatgpt");
  assert.equal(aiUtmLabel("utm_source=perplexity"), "perplexity");
  assert.equal(aiTrafficLabel("", "?utm_source=gemini"), "gemini");
  assert.equal(aiTrafficLabel("https://chatgpt.com/", ""), "chatgpt");
});

test("marketing pages no longer point the RSVP call to action at a missing short link", () => {
  const rsvp = read("app/(marketing)/rsvp/RsvpMarketingPage.tsx");
  assert.doesNotMatch(rsvp, /\/create-invite/);
  assert.match(rsvp, /\/pricing/);
  assert.match(rsvp, /preload="none"/);
  assert.match(read("app/layout.tsx"), /next\/font\/google/);
  assert.match(read("app/layout.tsx"), /Heebo/);
  assert.doesNotMatch(read("app/layout.tsx"), /fonts\.googleapis\.com\/css2/);
  assert.doesNotMatch(read("app/layout.tsx"), /maps\.googleapis/);
  assert.doesNotMatch(read("app/layout.tsx"), /serviceWorker\.register/);
  assert.match(read("app/components/LocationAutocomplete.tsx"), /selectedPlaceRef/);
  assert.match(read("app/components/LocationAutocomplete.tsx"), /place_id/);
  assert.match(read("app/components/LocationAutocomplete.tsx"), /GoogleMapsPlacesScript/);
  assert.match(read("app/HomePageClient.tsx"), /homep1\.webp/);
  assert.ok(fs.existsSync(path.join(root, "public/llms.txt")));
  assert.ok(fs.existsSync(path.join(root, "public/answers.json")));
  assert.ok(fs.existsSync(path.join(root, "public/homep1.webp")));
  assert.ok(fs.existsSync(path.join(root, "public/og-invistimo.jpg")));
  assert.equal(GUIDES.length, 10);
  assert.equal(SERVICE_PAGES.length, 5);
  assert.match(read("app/components/Footer.tsx"), /href="\/pricing"/);
  assert.match(read("app/components/Footer.tsx"), /href="\/rsvp"/);
});

test("each search query has one primary page and no invented volume", () => {
  const queries = KEYWORD_MAP.map((row) => row.query);
  assert.equal(new Set(queries).size, queries.length);
  const known = new Set([
    ...CORE_PUBLIC_ROUTES.map((route) => route.path),
    ...GUIDES.map((guide) => guidePath(guide.slug)),
  ]);
  for (const row of KEYWORD_MAP) {
    assert.equal(row.volume, null);
    assert.equal(row.competition, null);
    assert.ok(known.has(row.primaryPath), row.primaryPath);
    for (const support of row.supportingPaths) assert.ok(known.has(support), support);
  }
  assert.ok(AI_MONITOR_QUESTIONS.length >= 6);
});

test("pillar clusters do not assign one URL to two topics and answer-first covers hubs", () => {
  const paths = PILLARS.flatMap((pillar) => [pillar.path, ...pillar.clusters.map((item) => item.path)]);
  assert.equal(new Set(paths).size, paths.length);
  for (const guide of GUIDES) {
    assert.ok(PAGE_ANSWERS[guidePath(guide.slug)], guide.slug);
  }
  for (const service of SERVICE_PAGES) {
    assert.ok(PAGE_ANSWERS[service.path], service.path);
  }
  for (const pillar of PILLARS) {
    assert.ok(PAGE_ANSWERS[pillar.path], pillar.path);
  }
  assert.ok(PAGE_ANSWERS["/"]);
  assert.ok(PAGE_ANSWERS["/pricing"]);
  assert.ok(PAGE_ANSWERS["/faq"]);
  assert.ok(tableFor("/pricing"));
  assert.ok(tableFor("/rsvp"));
  const page = read("components/marketing/PublicContentPage.tsx");
  assert.match(page, /<h1/);
  assert.match(page, /<h2/);
  assert.match(page, /<h3/);
  assert.match(page, /התשובה הקצרה/);
  assert.match(read("components/seo/AnswerFirst.tsx"), /התשובה הקצרה/);
  assert.match(read("app/(marketing)/rsvp/page.tsx"), /AnswerFirst/);
  assert.match(read("app/seating-explained/layout.tsx"), /AnswerFirst/);
  assert.match(read("app/event-management/page.jsx"), /AnswerFirst/);
  assert.match(read("app/pricing/layout.tsx"), /AnswerFirst/);
  // Homepage ships marketing sections + FAQ schema (not AnswerFirst chrome).
  assert.match(read("app/HomePageClient.tsx"), /HomeMarketingSections/);
  assert.doesNotMatch(read("app/HomePageClient.tsx"), /AnswerFirst/);
  assert.doesNotMatch(read("app/page.tsx"), /AnswerFirst/);
  assert.match(read("app/faq/page.jsx"), /AnswerFirst/);
  assert.doesNotMatch(read("lib/seo/jsonld.ts"), /AggregateRating|Review/);
  assert.match(read("public/llms.txt"), /not a ranking factor/);
  assert.equal(contentGroup("/rsvp/chatuna"), "rsvp_invitations");
  assert.equal(contentGroup("/event-management"), "event_management");
  assert.equal(contentGroup("/wedding-website/classic"), "wedding_website");
  assert.equal(contentGroup("/invite/abc"), "other");
});

test("FAQ accordion keeps answers in the HTML even when collapsed", () => {
  const faq = read("app/components/FAQAccordion.jsx");
  assert.doesNotMatch(faq, /isOpen\s*&&/);
  assert.match(faq, /hidden/);
  assert.match(faq, /item\.a/);
});

test("wedding demo templates are explicitly noindex", () => {
  const source = read("app/wedding-website/[templateId]/page.tsx");
  assert.match(source, /index:\s*false/);
});

test("structured data helpers expose required marketing types without fake ratings", () => {
  const org = organizationNode();
  assert.equal(org["@type"], "Organization");
  assert.equal((org.logo as { "@type": string })["@type"], "ImageObject");
  assert.ok(Array.isArray(org.contactPoint));
  assert.equal(websiteNode()["@type"], "WebSite");
  assert.equal(softwareNode("x", "/")["@type"], "SoftwareApplication");
  assert.equal(serviceNode({ name: "a", description: "b", path: "/rsvp", serviceType: "c" })["@type"], "Service");
  assert.equal(breadcrumbNode([{ name: "בית", path: "/" }])["@type"], "BreadcrumbList");
  assert.equal(faqNode([{ q: "ש", a: "ת" }])["@type"], "FAQPage");
  assert.equal(articleNode({ title: "t", description: "d", path: "/info/guides/x" })["@type"], "Article");
  const json = JSON.stringify([org, websiteNode(), softwareNode("x"), serviceNode({ name: "a", description: "b", path: "/rsvp", serviceType: "c" })]);
  assert.doesNotMatch(json, /AggregateRating|Review/);
  assert.doesNotMatch(json, /"sameAs"/);
});

test("answers.json mirrors PAGE_ANSWERS for machine readers", () => {
  const raw = JSON.parse(read("public/answers.json"));
  assert.equal(raw.site, "https://www.invistimo.com");
  for (const [pathKey, answer] of Object.entries(PAGE_ANSWERS)) {
    assert.equal(raw.pageAnswers[pathKey], answer, pathKey);
  }
  assert.ok(Array.isArray(raw.aiMonitorQuestions));
  assert.ok(raw.aiMonitorQuestions.length >= 6);
});

test("seo documentation deliverables exist", () => {
  for (const rel of [
    "docs/seo/keyword-map.md",
    "docs/seo/analytics-dashboard.md",
    "docs/seo/offpage-research.md",
    "docs/seo/qa-report.md",
    "docs/seo/plan-30-60-90.md",
    "docs/seo/actions-requiring-approval.md",
    "docs/seo/launch-readiness.md",
    "docs/seo/connect-search-analytics.md",
    "docs/seo/post-publish-index-checklist.md",
    "docs/seo/keyword-research-live.md",
    "docs/seo/competitor-research.md",
    "docs/seo/outreach-targets.md",
    "docs/seo/promotion-plan-google-ai.md",
    "docs/seo/monthly-report-template.md",
    "docs/seo/promotion-map-all-services.md",
    "docs/seo/premium-design-report.md",
    "docs/seo/premium-design-inventory.json",
    "docs/seo/preview-links.md",
    "docs/seo/final-acceptance-summary.md",
    "docs/seo/post-publish-owner-runbook.md",
    "docs/seo/baseline-index-report.md",
    "docs/seo/directory-profiles-mit4mit-mazalday.md",
  ]) {
    assert.ok(fs.existsSync(path.join(root, rel)), rel);
  }
});
