import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  collectHeaderHrefs,
  GUIDE_COLUMNS,
  SERVICE_COLUMNS,
  EVENT_LINKS,
} from "../../lib/marketing/headerNav";
import { GUIDES, guidePath } from "../../lib/seo/guides";

const ROOT = path.resolve(__dirname, "../..");

/** Marketing route group or top-level app page that can serve a public URL. */
function pageExistsForHref(href: string): boolean {
  if (href === "/login") {
    return existsSync(path.join(ROOT, "app/(auth)/login/page.tsx"));
  }

  if (href.startsWith("/try/")) {
    return existsSync(path.join(ROOT, "app", href.slice(1), "page.tsx"));
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

test("header guide columns cover every published guide once", () => {
  const listed = GUIDE_COLUMNS.flatMap((column) =>
    column.links.map((link) => link.href)
  );
  const unique = new Set(listed);

  assert.equal(
    listed.length,
    unique.size,
    "guide mega menu must not duplicate hrefs"
  );

  for (const guide of GUIDES) {
    assert.ok(
      unique.has(guidePath(guide.slug)),
      `published guide missing from header: ${guide.slug}`
    );
  }
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
  assert.match(header, /isWeddingWebsiteChromeFree/);
  assert.match(header, /\/w\//);
  assert.match(shell, /wedding-website\//);
  assert.match(shell, /pathname !== "\/wedding-website"/);
});

test("app tree still has the marketing pages directory", () => {
  const marketing = path.join(ROOT, "app/(marketing)");
  assert.equal(statSync(marketing).isDirectory(), true);
  assert.ok(readdirSync(marketing).length > 0);
});
