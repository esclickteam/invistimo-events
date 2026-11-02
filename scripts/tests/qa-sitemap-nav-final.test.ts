import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import sitemap from "../../app/sitemap";
import { collectFooterHrefs } from "../../lib/marketing/footerNav";
import { collectHeaderHrefs } from "../../lib/marketing/headerNav";
import {
  lastModifiedFor,
  ROUTE_CONTENT_DATES,
} from "../../lib/seo/contentDates";
import { guidePath, GUIDES } from "../../lib/seo/guides";
import { CORE_PUBLIC_ROUTES } from "../../lib/seo/site";

const root = path.resolve(process.cwd());

test("final QA: sitemap has 42 URLs and lastmod matches content dates only", () => {
  const items = sitemap();
  assert.equal(items.length, 42);

  const required = [
    ...CORE_PUBLIC_ROUTES.map((route) => route.path),
    ...GUIDES.map((guide) => guidePath(guide.slug)),
  ];
  assert.equal(required.length, 42);

  for (const pathKey of required) {
    assert.ok(ROUTE_CONTENT_DATES[pathKey], pathKey);
  }

  const fallback = "2026-01-01T00:00:00.000Z";
  for (const item of items) {
    const pathname = new URL(item.url).pathname || "/";
    const expected = lastModifiedFor(pathname).toISOString();
    const actual = new Date(item.lastModified as string | Date).toISOString();
    assert.equal(actual, expected, pathname);
    assert.notEqual(actual, fallback, `false fallback lastmod on ${pathname}`);
  }

  const unique = new Set(
    items.map((item) => new Date(item.lastModified as string | Date).toISOString())
  );
  assert.ok(unique.size > 1, "lastmod must vary by page content date");
});

test("final QA: footer unchanged vs published main IA", () => {
  assert.deepEqual(collectFooterHrefs(), [
    "/accessibility",
    "/contact",
    "/credit-gifts",
    "/event-management",
    "/faq",
    "/info/about",
    "/info/guides",
    "/info/guides/seating-plan",
    "/info/guides/when-to-send-rsvp",
    "/invitations/chatuna",
    "/pricing",
    "/privacy",
    "/rsvp",
    "/rsvp/save-the-date",
    "/seating-explained",
    "/services/alcohol-management",
    "/terms",
    "/wedding-website",
  ]);
});

test("final QA: menu destinations are Link hrefs kept mounted when closed", () => {
  const nav = fs.readFileSync(
    path.join(root, "app/components/header/MarketingHeaderNav.tsx"),
    "utf8"
  );
  assert.match(nav, /import Link from "next\/link"/);
  assert.match(nav, /href=\{link\.href\}/);
  assert.match(nav, /href=\{item\.href\}/);
  assert.match(nav, /hidden=\{!isOpen\}/);
  assert.doesNotMatch(nav, /\{\s*openItem\s*\?/);
  assert.ok(collectHeaderHrefs().every((href) => href.startsWith("/")));
  assert.ok(collectHeaderHrefs().length > 20);
});
