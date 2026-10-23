# Post-publish index checklist

Run only after production deploy of PR #380. Do not invent coverage numbers.

Full owner sequence: `post-publish-owner-runbook.md`. Baseline numbers: `baseline-index-report.md`.

## Day 0 (same day as deploy)

1. Open production:
   - https://www.invistimo.com/robots.txt
   - https://www.invistimo.com/sitemap.xml
   - https://www.invistimo.com/answers.json
   - https://www.invistimo.com/llms.txt
2. Spot-check HTML View-Source on `/`, `/rsvp`, `/rsvp/chatuna`, `/pricing`, one guide: title, canonical, `התשובה הקצרה`, JSON-LD.
3. Connect + verify GSC, GA4, Bing (`connect-search-analytics.md`) then submit sitemap in GSC + Bing.
4. Confirm AI crawlers are not sitewide-blocked in robots (GPTBot / ClaudeBot / PerplexityBot / Google-Extended) unless intentionally restricted.
5. In GSC **URL Inspection**, request indexing for hubs (one by one, stay within quota):
   - `/`
   - `/rsvp`
   - `/rsvp/chatuna`
   - `/rsvp/whatsapp`
   - `/rsvp/save-the-date`
   - `/invitations/chatuna`
   - `/seating-explained`
   - `/event-management`
   - `/pricing`
   - `/faq`
   - `/info/guides`
6. Save a spreadsheet tab “Index log” with date, URL, inspection result, last crawl — and copy into `baseline-index-report.md`.
7. Confirm Mit4Mit / MazalDay profiles link to production (`directory-profiles-mit4mit-mazalday.md`).

## Day 3–7

1. GSC → Pages / Indexing: note Indexed vs Discovered / Crawled – currently not indexed.
2. For any marketing URL stuck, use URL Inspection → View crawled page → confirm content matches answer-first HTML.
3. Confirm guest URLs (`/invite/…`, `/w/…`) are **Excluded by noindex** (desired).
4. Rich Results Test on `/faq`, `/rsvp`, one Article guide — record eligible vs valid-but-not-eligible (FAQ/Article eligibility is Google’s call).

## Day 14–30

1. Export GSC Performance (28 days) for the 14 primary Keyword Map queries.
2. Fill `volume` only if you later get Planner data; until then keep `null` in code.
3. Start monthly report (`docs/seo/monthly-report-template.md`).

## Marketing URL inventory (expect in sitemap)

28 URLs: 18 core + 10 guides (see `lib/seo/site.ts` + `lib/seo/guides.ts`).  
Wedding template demos (`/wedding-website/[id]`) are **noindex** and out of sitemap on purpose.
