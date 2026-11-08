import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { blogMenu, isBlogCategoryId, BLOG_PLACEMENTS } from "../../lib/blog/taxonomy";
import {
  collectHeaderHrefs,
  HEADER_PRIMARY,
  SERVICE_COLUMNS,
  EVENT_LINKS,
} from "../../lib/marketing/headerNav";
import { GUIDES } from "../../lib/seo/guides";

const ROOT = path.resolve(__dirname, "../..");

/** Marketing route group or top-level app page that can serve a public URL. */
function pageExistsForHref(href: string): boolean {
  if (href === "/login") {
    return existsSync(path.join(ROOT, "app/(auth)/login/page.tsx"));
  }

  if (href.startsWith("/try/")) {
    return existsSync(path.join(ROOT, "app", href.slice(1), "page.tsx"));
  }

  if (href === "/blog" || (href.startsWith("/blog/") && isBlogCategoryId(href.split("/")[2] || ""))) {
    return existsSync(path.join(ROOT, "app/(marketing)/blog/page.tsx"));
  }

  if (href.startsWith("/info/guides/") && href !== "/info/guides") {
    const slug = href.slice("/info/guides/".length);
    if (GUIDES.some((guide) => guide.slug === slug)) return true;
  }

  const relative = href.replace(/^\//, "");
  const candidates = [
    path.join(ROOT, "app", relative, "page.tsx"),
    path.join(ROOT, "app", relative, "page.jsx"),
    path.join(ROOT, "app", "(marketing)", relative, "page.tsx"),
    path.join(ROOT, "app", "(marketing)", relative, "page.jsx"),
  ];

  return candidates.some((candidate) => existsSync(candidate));
}

test("header nav only links to existing ready pages", () => {
  const hrefs = collectHeaderHrefs();
  assert.ok(hrefs.length > 10, "expected a full header link set");

  for (const href of hrefs) {
    assert.equal(
      pageExistsForHref(href),
      true,
      `Header links to missing page: ${href}`
    );
  }
});

test("blog menu lists seven categories and only real destinations", () => {
  const guides = HEADER_PRIMARY.find((item) => item.id === "guides");
  assert.ok(guides && guides.kind === "guides");
  if (!guides || guides.kind !== "guides") return;

  assert.equal(guides.label, "בלוג");
  assert.equal(guides.footerLink.href, "/blog");
  assert.equal(guides.footerLink.label, "לכל המאמרים");
  assert.deepEqual(
    guides.categories.map((category) => category.title),
    [
      "תכנון וארגון אירועים",
      "אישורי הגעה והזמנות",
      "סידורי הושבה וניהול אורחים",
      "חתונות",
      "אירועים משפחתיים",
      "אירועים עסקיים",
      "טיפים, כלים ומחשבונים",
    ]
  );
  assert.deepEqual(guides.categories, blogMenu());

  for (const category of guides.categories) {
    assert.equal(category.href, `/blog/${category.id}`);
    assert.ok(category.links.length > 0, category.id);
    for (const link of category.links) {
      assert.ok(link.href.startsWith("/"));
      assert.equal(link.label.length > 0, true);
    }
  }
});

test("every published guide belongs to one blog category", () => {
  assert.equal(Object.keys(BLOG_PLACEMENTS).length, GUIDES.length);
  for (const guide of GUIDES) {
    assert.ok(BLOG_PLACEMENTS[guide.slug], guide.slug);
  }
});

test("blog hub keeps the magazine headline", () => {
  const page = readFileSync(path.join(ROOT, "app/(marketing)/blog/page.tsx"), "utf8");
  const magazine = readFileSync(path.join(ROOT, "components/blog/BlogMagazine.tsx"), "utf8");
  assert.match(page, /pageMetadata/);
  assert.match(magazine, /המגזין של Invistimo — כל מה שצריך לדעת על אירועים/);
  assert.match(magazine, /חיפוש מאמרים/);
  assert.match(magazine, /formatReadingTime/);
  assert.doesNotMatch(magazine, /שם כותב|תמונת כותב/);
});

test("header service mega menu includes core ready services", () => {
  const hrefs = new Set(
    SERVICE_COLUMNS.flatMap((column) => column.links.map((link) => link.href))
  );

  for (const required of [
    "/rsvp",
    "/rsvp/whatsapp",
    "/rsvp/calls",
    "/rsvp/save-the-date",
    "/invitations/chatuna",
    "/seating-explained",
    "/event-management",
    "/services/alcohol-management",
    "/wedding-website",
  ]) {
    assert.ok(hrefs.has(required), `missing service link: ${required}`);
  }

  assert.equal(hrefs.has("/rsvp/sms"), false, "must not link unfinished /rsvp/sms");
});

test("header event dropdown lists the four ready event pages", () => {
  assert.deepEqual(
    EVENT_LINKS.map((link) => link.href).sort(),
    [
      "/rsvp/bar-bat-mitzvah",
      "/rsvp/brit-brita",
      "/rsvp/chatuna",
      "/rsvp/hina",
    ]
  );
});

test("marketing Header still hides chrome on live wedding sites", () => {
  const header = readFileSync(
    path.join(ROOT, "app/components/Header.tsx"),
    "utf8"
  );
  const shell = readFileSync(path.join(ROOT, "app/ClientShell.tsx"), "utf8");
  assert.match(header, /isWeddingWebsite/);
  assert.match(header, /\/w\//);
  assert.match(shell, /wedding-website\//);
  // Exact `/wedding-website` keeps chrome; only `/wedding-website/*` hides it.
  assert.match(shell, /startsWith\("\/wedding-website\/"\)/);
  assert.doesNotMatch(
    shell,
    /pathname === "\/wedding-website"/,
    "marketing hub must keep public chrome"
  );
});

test("app tree still has the marketing pages directory", () => {
  const marketing = path.join(ROOT, "app/(marketing)");
  assert.equal(statSync(marketing).isDirectory(), true);
  assert.ok(readdirSync(marketing).length > 0);
});
