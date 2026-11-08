import assert from "node:assert/strict";
import test from "node:test";
import {
  blogSearchTerm,
  sanitizeEventParams,
  shouldTrackBlogSearch,
} from "../../lib/seo/analytics";

test("blog search keeps a Hebrew term and drops contact details", () => {
  assert.deepEqual(sanitizeEventParams({ search_term: "  אלכוהול  ", page_path: "/blog" }), {
    search_term: "אלכוהול",
    page_path: "/blog",
  });
  assert.equal(sanitizeEventParams({ search_term: "a" }).search_term, undefined);
  assert.equal(sanitizeEventParams({ search_term: "guest@example.com" }).search_term, undefined);
  assert.equal(sanitizeEventParams({ search_term: "0501234567" }).search_term, undefined);
});

test("a search is tracked once, after it settles, not on each keystroke", () => {
  assert.equal(blogSearchTerm("  הושבה   משפחתית "), "הושבה משפחתית");
  assert.equal(shouldTrackBlogSearch("", "ה"), false);
  assert.equal(shouldTrackBlogSearch("", "הושבה"), true);
  assert.equal(shouldTrackBlogSearch("הושבה", "הושבה"), false);
  assert.equal(shouldTrackBlogSearch("הושבה", "הוש"), true);
});
