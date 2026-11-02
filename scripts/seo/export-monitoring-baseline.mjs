/**
 * Export monitoring baseline artifacts from live sitemap + local keyword map.
 * Read-only: does not change product URLs or content.
 *
 * Run: node scripts/seo/export-monitoring-baseline.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = resolve(root, "docs/seo/monitoring");
mkdirSync(outDir, { recursive: true });

const keywordMod = await import(pathToFileURL(resolve(root, "lib/seo/keywordMap.ts")).href);
const guidesMod = await import(pathToFileURL(resolve(root, "lib/seo/guides.ts")).href);
const siteMod = await import(pathToFileURL(resolve(root, "lib/seo/site.ts")).href);

const { KEYWORD_MAP, AI_MONITOR_QUESTIONS, KEYWORD_OBSERVED_AT } = keywordMod;
const { GUIDES, guidePath } = guidesMod;
const { CORE_PUBLIC_ROUTES, SITE_URL } = siteMod;

const sitemapXml = await fetch(`${SITE_URL}/sitemap.xml`).then((r) => r.text());
const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const guideLocs = locs.filter((u) => /\/info\/guides\/[^/]+$/.test(u));

const servicePaths = [
  "/",
  "/rsvp",
  "/rsvp/chatuna",
  "/rsvp/hina",
  "/rsvp/bar-bat-mitzvah",
  "/rsvp/brit-brita",
  "/rsvp/whatsapp",
  "/rsvp/calls",
  "/rsvp/save-the-date",
  "/invitations/chatuna",
  "/seating-explained",
  "/wedding-website",
  "/event-management",
  "/pricing",
  "/faq",
  "/info/guides",
  "/contact",
  "/credit-gifts",
  "/info/about",
];

const crawledNotIndexedOct2026 = new Set([
  "/rsvp/chatuna",
  "/rsvp/hina",
  "/rsvp/bar-bat-mitzvah",
  "/rsvp/brit-brita",
  "/info/guides/send-digital-invitation",
  "/info/guides/bit-paybox-wedding-invitation",
  "/info/guides/seating-plan",
  "/info/guides/seating-cards-vs-qr",
  "/info/guides/save-the-date-vs-invitation",
  "/info/guides/guest-list",
  "/info/guides/guests-who-dont-reply",
  "/info/guides/wedding-planning",
  "/info/guides/event-management-vs-production",
  "/info/guides/wedding-vendors-contracts",
  "/info/guides/wedding-venue-guest-guarantee",
  "/info/guides/wedding-seating-arrangements",
  "/info/guides/wedding-alcohol-calculator",
  "/info/guides/whatsapp-vs-sms-rsvp",
  "/info/guides/how-to-choose-rsvp-company",
  "/info/guides/event-day-checklist",
]);

const urlRows = [];
for (const loc of locs.sort()) {
  const path = loc.replace(SITE_URL, "") || "/";
  const isGuide = /\/info\/guides\/[^/]+$/.test(loc);
  urlRows.push({
    url: loc,
    path,
    type: isGuide ? "guide" : servicePaths.includes(path) || path === "/info/guides" ? "service_or_hub" : "other_public",
    in_sitemap: "yes",
    priority_watch: crawledNotIndexedOct2026.has(path) ? "was_crawled_not_indexed_oct2026" : isGuide && GUIDES.some((g) => guidePath(g.slug) === path && ["tracking-rsvp-responses","seating-live-day-of","wedding-website-guide","wedding-website-vs-digital-invitation","rsvp-corporate-events","how-phone-rsvp-works","import-guest-list","last-minute-guest-changes","whatsapp-invitation-wording","when-to-send-save-the-date","reduce-meal-waste","plus-ones-and-kids-rsvp","venue-guest-check-in","overseas-guests-rsvp","seating-families-groups","personal-rsvp-link","rsvp-reminder-rounds","manage-guests-after-rsvp"].includes(g.slug)) ? "phase_c_new_2026_11_02" : "",
    gsc_index_status: "",
    gsc_last_crawl: "",
    gsc_clicks_28d: "",
    gsc_impressions_28d: "",
    gsc_avg_position_28d: "",
    notes: "",
  });
}

const csvEsc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const urlCsv = [
  Object.keys(urlRows[0]).join(","),
  ...urlRows.map((r) => Object.values(r).map(csvEsc).join(",")),
].join("\n");
writeFileSync(resolve(outDir, "url-tracking-baseline-2026-11-02.csv"), `${urlCsv}\n`, "utf8");

const kwCsv = [
  "query,intent,primaryPath,supportingPaths,volume,competition,observation,brand_or_nonbrand,gsc_impressions,gsc_clicks,gsc_ctr,gsc_avg_position",
  ...KEYWORD_MAP.map((row) => {
    const brand = /invistimo|אינביסטימו/i.test(row.query) ? "brand" : "non_brand";
    return [
      row.query,
      row.intent,
      row.primaryPath,
      row.supportingPaths.join("|"),
      row.volume,
      row.competition,
      row.observation,
      brand,
      "",
      "",
      "",
      "",
    ]
      .map(csvEsc)
      .join(",");
  }),
].join("\n");
writeFileSync(resolve(outDir, "keyword-tracking-baseline-2026-11-02.csv"), `${kwCsv}\n`, "utf8");

const aiCsv = [
  "id,question,engines_chatgpt_search,engines_gemini,engines_perplexity,engines_copilot,cited_invistimo,cited_url,accurate_vs_product,run_date,notes",
  ...AI_MONITOR_QUESTIONS.map((q, i) => [i + 1, q, "", "", "", "", "", "", "", "", ""].map(csvEsc).join(",")),
].join("\n");
writeFileSync(resolve(outDir, "ai-monitor-questions-baseline-2026-11-02.csv"), `${aiCsv}\n`, "utf8");

const summary = {
  generatedAt: "2026-11-02",
  timezone: "Asia/Jerusalem",
  site: SITE_URL,
  sitemap: {
    totalLocs: locs.length,
    guides: guideLocs.length,
    expected: { total: 60, guides: 37 },
    match: locs.length === 60 && guideLocs.length === 37,
  },
  keywordMap: {
    observedAt: KEYWORD_OBSERVED_AT,
    rows: KEYWORD_MAP.length,
    brandRows: KEYWORD_MAP.filter((r) => /invistimo|אינביסטימו/i.test(r.query)).length,
    nonBrandRows: KEYWORD_MAP.filter((r) => !/invistimo|אינביסטימו/i.test(r.query)).length,
  },
  aiMonitorQuestions: AI_MONITOR_QUESTIONS.length,
  guidesRegistered: GUIDES.length,
  coreRoutes: CORE_PUBLIC_ROUTES.length,
  crawledNotIndexedWatchlistOct2026: [...crawledNotIndexedOct2026],
  checkpoints: ["2026-11-10", "2026-12-02", "2027-02-02"],
  gscAccess: "unavailable_in_agent_environment",
  bingAccess: "unavailable_in_agent_environment",
};

writeFileSync(resolve(outDir, "baseline-summary-2026-11-02.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

console.log(JSON.stringify(summary, null, 2));
console.log("Wrote files to", outDir);
