/**
 * Regression: public marketing copy must not expose internal SEO/GEO/AEO
 * editor labels or developer notes to visitors.
 *
 * Run: node --import tsx --test scripts/tests/public-no-internal-labels.test.ts
 *
 * Optional live crawl (after deploy or local server):
 *   PUBLIC_BASE_URL=https://www.invistimo.com node --import tsx --test scripts/tests/public-no-internal-labels.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

/** Directories whose TSX/JSX can render visitor-visible marketing copy. */
const SCAN_DIRS = [
  "app/(marketing)",
  "app/credit-gifts",
  "app/pricing",
  "app/event-management",
  "app/seating-explained",
  "app/contact",
  "app/faq",
  "app/accessibility",
  "app/info",
  "components/marketing",
  "components/seo",
  "lib/seo/guides.ts",
  "lib/seo/answers.ts",
  "lib/seo/services.ts",
  "public/answers.json",
];

/**
 * Patterns that must not appear in visitor-facing source (JSX text / string
 * literals). Comments are stripped before matching.
 *
 * Exception: pages that explain SEO as a topic may be listed in ALLOWLIST_FILES.
 */
const FORBIDDEN: { id: string; re: RegExp }[] = [
  { id: "AEO_DOT_LABEL", re: /AEO\s*·/u },
  { id: "GEO_AEO_LABEL", re: /GEO\s*\/\s*AEO/u },
  { id: "EYEBROW_AEO", re: /<Eyebrow>\s*AEO/u },
  { id: "EYEBROW_GEO", re: /<Eyebrow>\s*GEO/u },
  { id: "EYEBROW_FAQ_EN", re: /<Eyebrow>\s*FAQ\s*<\/Eyebrow>/u },
  { id: "EYEBROW_CHAPTER_NUM", re: /<Eyebrow>\s*פרק\s+\d+\s*<\/Eyebrow>/u },
  { id: "DIRECT_ANSWER_LABEL", re: /תשובה ישירה\s*:/u },
  { id: "FOR_SEARCH_AND_AI", re: /למנועי חיפוש ולתשובות\s*AI/u },
  { id: "FOR_AI_ENGINES", re: /למנועי\s*AI/u },
  { id: "AI_OPTIMIZED_CONTENT", re: /תוכן מותאם למנועי/u },
  { id: "SEARCH_OPTIMIZED_ANSWER", re: /תשובה מותאמת לחיפוש/u },
  { id: "SEO_PARAGRAPH", re: /פסקת\s*SEO/u },
  { id: "FAQ_SCHEMA_LABEL", re: /FAQ\s*Schema/u },
  { id: "EDITOR_NOTE", re: /הערת עורך/u },
  { id: "VISIBLE_H1_LABEL", re: />\s*H1\s*</u },
  { id: "VISIBLE_H2_LABEL", re: />\s*H2\s*</u },
  { id: "VISIBLE_H3_LABEL", re: />\s*H3\s*</u },
];

/** Paths (relative) where SEO/AEO terms are the subject of the content itself. */
const ALLOWLIST_FILES = new Set<string>([
  // none today — add e.g. "app/(marketing)/info/guides/what-is-seo/page.tsx" if created
]);

const EXT = new Set([".tsx", ".jsx", ".ts", ".js", ".json"]);

function stripComments(source: string): string {
  // Remove block comments then line comments (rough but good enough for JSX/TS).
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function walk(rel: string, out: string[]) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return;
  const st = fs.statSync(abs);
  if (st.isFile()) {
    if (EXT.has(path.extname(abs))) out.push(rel);
    return;
  }
  for (const name of fs.readdirSync(abs)) {
    if (name === "node_modules" || name === ".next") continue;
    walk(path.join(rel, name), out);
  }
}

function collectFiles(): string[] {
  const files: string[] = [];
  for (const entry of SCAN_DIRS) walk(entry, files);
  return [...new Set(files)].sort();
}

test("public marketing sources have no visitor-facing internal SEO/AEO labels", () => {
  const files = collectFiles();
  assert.ok(files.length > 20, `expected a broad file set, got ${files.length}`);

  const violations: { file: string; id: string; sample: string }[] = [];

  for (const rel of files) {
    if (ALLOWLIST_FILES.has(rel)) continue;
    const raw = fs.readFileSync(path.join(root, rel), "utf8");
    const text = stripComments(raw);
    for (const { id, re } of FORBIDDEN) {
      const m = text.match(re);
      if (m) {
        violations.push({
          file: rel,
          id,
          sample: m[0].slice(0, 80),
        });
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Found internal labels in public sources:\n${violations
      .map((v) => `- ${v.file}: ${v.id} → ${JSON.stringify(v.sample)}`)
      .join("\n")}`
  );
});

test("optional live HTML crawl rejects the same labels", async (t) => {
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    t.skip("Set PUBLIC_BASE_URL to crawl rendered HTML");
    return;
  }

  const sitemapUrl = `${base}/sitemap.xml`;
  const smRes = await fetch(sitemapUrl);
  assert.equal(smRes.status, 200, `sitemap ${sitemapUrl}`);
  const smXml = await smRes.text();
  const locs = [...smXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length > 10, "sitemap should list public URLs");

  // Sitemap usually emits absolute production URLs; rewrite to PUBLIC_BASE_URL
  // so local verification does not accidentally crawl live production.
  const baseOrigin = new URL(base).origin;
  const rewrite = (u: string) => {
    try {
      const parsed = new URL(u);
      return `${baseOrigin}${parsed.pathname}${parsed.search}`;
    } catch {
      return u;
    }
  };

  // Prefer Hebrew marketing / guide / service pages; skip app dashboards.
  const candidates = locs.map(rewrite).filter((u) => {
    try {
      const p = new URL(u).pathname;
      if (p.startsWith("/admin") || p.startsWith("/dashboard") || p.startsWith("/api")) return false;
      if (p.startsWith("/employee") || p.startsWith("/producer") || p.startsWith("/venues/")) return false;
      return true;
    } catch {
      return false;
    }
  });

  const liveForbidden = [
    /AEO\s*·/u,
    /GEO\s*\/\s*AEO/u,
    /תשובה ישירה\s*:/u,
    /למנועי חיפוש ולתשובות\s*AI/u,
    /למנועי\s*AI/u,
    /תוכן מותאם למנועי/u,
    /פסקת\s*SEO/u,
    /FAQ\s*Schema/u,
    /הערת עורך/u,
    />\s*פרק\s+\d+\s*</u,
  ];

  const pageViolations: { url: string; id: string }[] = [];
  // Cap to keep CI bounded; full set is still exercised via source scan.
  const sample = candidates.slice(0, 80);

  for (const url of sample) {
    const res = await fetch(url, { redirect: "follow" });
    if (res.status >= 400) continue;
    const html = await res.text();
    // Ignore JSON-LD / script blocks for label scan of visible copy heuristics:
    const visible = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ");
    for (const re of liveForbidden) {
      if (re.test(visible)) {
        pageViolations.push({ url, id: re.source });
      }
    }
  }

  assert.deepEqual(
    pageViolations,
    [],
    `Live pages still expose internal labels:\n${pageViolations
      .map((v) => `- ${v.url}: /${v.id}/`)
      .join("\n")}`
  );
});
