import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  FOOTER_COLUMNS,
  collectFooterHrefs,
} from "../../lib/marketing/footerNav";
import { GUIDES } from "../../lib/seo/guides";

const ROOT = path.resolve(__dirname, "../..");

function pageExistsForHref(href: string): boolean {
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

test("footer only links to existing pages and avoids known broken routes", () => {
  const hrefs = collectFooterHrefs();
  assert.ok(hrefs.length > 8);

  for (const href of hrefs) {
    assert.equal(pageExistsForHref(href), true, `missing footer page: ${href}`);
  }

  assert.equal(hrefs.includes("/info/demo"), false);
  assert.equal(hrefs.includes("/for/bar-mitzvah"), false);
  assert.equal(hrefs.includes("/rsvp/sms"), false);
});

test("footer columns match the requested public IA", () => {
  assert.deepEqual(
    FOOTER_COLUMNS.map((column) => column.id),
    ["services", "guides", "company", "help"]
  );
});

test("footer does not duplicate hrefs inside a single column", () => {
  for (const column of FOOTER_COLUMNS) {
    const hrefs = column.links.map((link) => link.href);
    assert.equal(
      hrefs.length,
      new Set(hrefs).size,
      `duplicate links in ${column.id}`
    );
  }
});
