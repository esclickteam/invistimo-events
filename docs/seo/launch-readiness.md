# Launch readiness — SEO + GEO (PR #380)

**Branch:** `cursor/seo-geo-aeo-0a2e`  
**PR:** https://github.com/esclickteam/invistimo-events/pull/380  
**Acceptance run:** 2026-10-23 (Asia/Jerusalem) against local `http://127.0.0.1:3010`  
**Merge / Deploy:** not performed — waiting for explicit owner approval.

## Verdict

**Ready to merge and deploy from an SEO/GEO acceptance perspective**, after fixing home canonical/sitemap slash consistency.

| Gate | Result |
| --- | --- |
| `npm run test:seo` | **17/17 PASS** |
| Live marketing HTML acceptance (28 URLs) | **28/28 PASS** |
| robots / sitemap / answers.json / llms.txt | **PASS** |
| Internal link sample (5 hubs × ≤25 links) | **PASS** |
| Desktop viewport `/rsvp`, `/pricing` | **PASS** (no horizontal overflow, RTL, answer-first) |
| Mobile iPhone-13 viewport `/rsvp`, `/pricing`, `/faq`, cost guide | **PASS** |
| Google Rich Results / CrUX on production | **NOT TESTED** (needs live deploy) |
| GSC / GA4 / Bing live data | **NOT CONNECTED** (needs owner) |

## What was fixed in this acceptance pass

- Home canonical emitted by Next as `https://www.invistimo.com` (no trailing slash). `absoluteUrl("/")` and sitemap now match that form so index signals stay consistent.

## Blockers for indexing

**None found** on marketing routes in this environment:

- All 28 sitemap marketing URLs return HTTP 200, indexable robots, unique canonical, title + description.
- Guest/auth surfaces remain noindex; robots disallow private apps; guest invite paths stay crawlable but noindex.
- No AggregateRating / Review schema.
- Answer-first text present in initial HTML on pillars/services/guides that require it.

## UX notes (non-blocking)

- Package comparison tables use horizontal scroll on narrow screens by design (`overflow-x-auto`) — page `scrollWidth` stayed equal to viewport in Playwright checks.
- Home remains `force-dynamic` due to auth cookie redirect (caching trade-off, not an index block).
- Owner should still do a final click-through on production after deploy (forms, WhatsApp deep links, calculator).

## Artifacts

- `docs/seo/acceptance-results.json` — per-URL metadata/schema/canonical report  
- `docs/seo/acceptance-viewport.json` — desktop/mobile RTL + overflow  
- Screenshots under `/opt/cursor/artifacts/screenshots/accept-*.png`

## After you approve merge + deploy

Follow `docs/seo/connect-search-analytics.md` then `docs/seo/post-publish-index-checklist.md`.
