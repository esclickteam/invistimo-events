import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { articleBody, draftHref, draftsPreviewEnabled, loadDraftArticles } from "../../lib/blog/drafts";
import { blocksFromBody, richTokens, safeHref, safeImageSrc } from "../../lib/blog/markdown";
import { GUIDES } from "../../lib/seo/guides";
import { isBlogCategoryId, subcategoryById } from "../../lib/blog/taxonomy";
import robots from "../../app/robots";
import sitemap from "../../app/sitemap";

const root = path.resolve(process.cwd());
const ALLOWED_PRICES = new Set(["100", "150", "230"]);

function pageExists(urlPath: string) {
  const rel = urlPath.replace(/^\//, "");
  const candidates = [
    path.join(root, "app", "(marketing)", rel, "page.tsx"),
    path.join(root, "app", rel, "page.tsx"),
    path.join(root, "app", rel, "page.jsx"),
  ];
  return candidates.some((file) => fs.existsSync(file));
}

test("markdown rendering keeps text safe and supports the article formats", () => {
  assert.equal(safeHref("javascript:alert(1)"), null);
  assert.equal(safeHref("data:text/html,hi"), null);
  assert.equal(safeHref("//evil.example/a"), null);
  assert.equal(safeHref("https://user:pass@example.com/a"), null);
  assert.deepEqual(safeHref("/rsvp/hina"), { href: "/rsvp/hina", external: false });
  assert.equal(safeHref("https://example.com/a")?.external, true);
  assert.equal(safeImageSrc("javascript:alert(1)"), null);
  assert.equal(safeImageSrc("https://example.com/a.jpg"), null);
  assert.equal(safeImageSrc("/../secret.jpg"), null);
  assert.equal(safeImageSrc("/marketing/blog/x.jpg"), "/marketing/blog/x.jpg");

  const body = [
    "# כותרת כפולה",
    "",
    "פסקה עם **הדגשה** וקישור [פנימי](/rsvp) וקישור [חיצוני](https://example.com/a).",
    "",
    "<script>alert(1)</script>",
    "",
    "[סקריפט](javascript:alert(1))",
    "",
    "![תיאור](/marketing/blog/x.jpg)",
    "",
    "![ריק](javascript:alert(1))",
    "",
    "- אחד",
    "- שניים",
    "",
    "1. ראשון",
    "2. שני",
    "",
    "| עמודה | ערך |",
    "| --- | --- |",
    "| א | ב |",
  ].join("\n");
  const blocks = blocksFromBody(body);
  assert.equal(blocks.some((block) => block.type === "p" && block.text.startsWith("# ")), false);
  assert.equal(blocks.some((block) => block.type === "ul"), true);
  assert.equal(blocks.some((block) => block.type === "ol"), true);
  assert.equal(blocks.some((block) => block.type === "table"), true);
  assert.equal(blocks.some((block) => block.type === "image"), true);
  const script = blocks.find((block) => block.type === "p" && block.text.includes("<script>"));
  assert.ok(script && script.type === "p");
  const tokens = richTokens(script.text);
  assert.equal(tokens.every((token) => token.type === "text"), true);
  const dropped = richTokens("[סקריפט](javascript:alert(1))");
  assert.equal(dropped.some((token) => token.type === "link"), false);
  assert.equal(readArticle().includes("dangerouslySetInnerHTML"), false);
});

function readArticle() {
  return fs.readFileSync(path.join(root, "components/blog/PostArticle.tsx"), "utf8");
}

test("draft preview stays closed on production and out of the sitemap", async () => {
  const previousApp = process.env.APP_ENV;
  const previousVercel = process.env.VERCEL_ENV;
  process.env.APP_ENV = "production";
  process.env.VERCEL_ENV = "production";
  assert.equal(draftsPreviewEnabled(), false);
  process.env.APP_ENV = "staging";
  process.env.VERCEL_ENV = "staging";
  assert.equal(draftsPreviewEnabled(), false);
  process.env.APP_ENV = "staging";
  process.env.VERCEL_ENV = "preview";
  assert.equal(draftsPreviewEnabled(), true);
  process.env.APP_ENV = "preview";
  assert.equal(draftsPreviewEnabled(), true);
  process.env.APP_ENV = previousApp;
  process.env.VERCEL_ENV = previousVercel;

  const rules = robots();
  const list = Array.isArray(rules.rules) ? rules.rules : [rules.rules];
  for (const rule of list) {
    const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
    assert.ok(disallow?.includes("/blog/drafts"));
  }
  const urls = (await sitemap()).map((item) => item.url);
  assert.equal(urls.some((url) => url.includes("/blog/drafts")), false);
  const route = fs.readFileSync(path.join(root, "app/api/admin/blog/import-drafts/route.ts"), "utf8");
  assert.match(route, /auth\.role !== "admin"/);
  assert.match(route, /status: "draft"/);
  assert.doesNotMatch(route, /status: "published"/);
});

test("nine private-event drafts are distinct, priced from the live site, and linked", () => {
  const articles = loadDraftArticles();
  assert.equal(articles.length, 9);
  assert.equal(articles.filter((article) => article.wave === 1).length, 2);
  const slugs = new Set(articles.map((article) => article.slug));
  for (const removed of ["birthday-guest-list", "conference-participants", "company-event-meal-count", "company-event-or-conference"]) {
    assert.equal(slugs.has(removed), false);
  }
  assert.equal(slugs.size, 9);
  const openings = new Set(articles.map((article) => article.body.slice(0, 80)));
  assert.equal(openings.size, 9);

  for (const article of articles) {
    assert.equal(GUIDES.some((guide) => guide.slug === article.slug), false);
    assert.equal(isBlogCategoryId(article.categoryId), true);
    assert.ok(subcategoryById(article.categoryId, article.subcategoryId));
    assert.equal(article.body.includes("## שאלות נפוצות"), false);
    assert.ok(article.faqs.length >= 4);
    assert.ok(article.readingMinutes >= 3 && article.readingMinutes <= 8);
    assert.equal(article.coverAlt.length > 12, true);
    const cover = path.join(root, "public", article.coverImage.replace(/^\//, ""));
    assert.equal(fs.existsSync(cover), true);
    const bytes = fs.statSync(cover).size;
    assert.ok(bytes > 20_000 && bytes < 450_000, `${article.slug} cover is ${bytes} bytes`);
    assert.equal(/נכתב על ידי|שם הכותב/.test(article.body), false);

    const prices = [...`${article.body}\n${article.faqs.map((faq) => faq.a).join("\n")}`.matchAll(/(\d[\d,]*)\s*₪/g)].map((match) => match[1].replace(/,/g, ""));
    for (const price of prices) assert.ok(ALLOWED_PRICES.has(price), `${article.slug} price ${price}`);
    assert.equal(/\d{2,}\s*%/.test(article.body), false);

    const blocks = blocksFromBody(article.body);
    assert.equal(blocks.some((block) => block.type === "h2"), true);
    if (blocks.some((block) => block.type === "table")) {
      const table = blocks.find((block) => block.type === "table");
      assert.ok(table && table.type === "table");
      for (const row of table.rows) assert.equal(row.length, table.headers.length);
    }

    for (const token of richTokens(article.body)) {
      if (token.type !== "link" || token.external) continue;
      if (token.href.startsWith("/blog/p/")) {
        const slug = token.href.split("/")[3];
        assert.equal(slugs.has(slug), true, token.href);
        assert.equal(draftHref(token.href, slugs), `/blog/drafts/${slug}`);
        continue;
      }
      if (token.href.startsWith("/info/guides/")) {
        const slug = token.href.split("/")[3];
        assert.equal(GUIDES.some((guide) => guide.slug === slug), true, token.href);
        continue;
      }
      assert.equal(pageExists(token.href.split("#")[0]), true, token.href);
    }
  }
});

test("article body drops the duplicate FAQ section", () => {
  const stripped = articleBody("# כותרת\n\nפסקה.\n\n## שאלות נפוצות\n\n### שאלה\n\nתשובה.\n\n## לקריאה ולהמשך\n\nעוד.");
  assert.equal(stripped.includes("שאלות נפוצות"), false);
  assert.match(stripped, /\n\n## לקריאה/);
  assert.equal(stripped.startsWith("#"), false);
});
