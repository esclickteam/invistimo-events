# SEO QA Report — PR branch `cursor/seo-geo-aeo-0a2e`

**Run context:** Cloud agent, 2026-10-23 (Asia/Jerusalem). Production deploy not performed.  
**Automated result:** `npm run test:seo` — 17/17 PASS (including short-link Mongo memory test).

Legend: **PASS** / **FAIL** / **NOT TESTED**

## Automated (`npm run test:seo`)

| Check | Result |
| --- | --- |
| Unique absolute canonical helper | PASS (unit) |
| Sitemap public guides + private exclusion | PASS (unit) |
| Robots allow marketing / block private / allow guest crawl | PASS (unit) |
| Short-code 302 known / 404 unknown | PASS (unit + Mongo memory DB) |
| No new one-segment URL shadowing guest codes | PASS (unit) |
| Guest/auth noindex headers & layouts | PASS (unit) |
| Analytics allowlist | PASS (unit) |
| Keyword map null volumes + path existence | PASS (unit) |
| Pillar path uniqueness + PAGE_ANSWERS coverage | PASS (unit) |
| No AggregateRating / Review in jsonld | PASS (unit) |
| llms.txt disclaimer | PASS (unit) |
| FAQ answers remain in DOM (`hidden`, not unmounted) | PASS (unit) |
| Wedding demo templates `index: false` | PASS (unit) |
| AI referrer + UTM helpers | PASS (unit) |
| Absolute OG image URL | PASS (unit) |

## Manual / external

| Check | Result | Notes |
| --- | --- | --- |
| Live HTML SSR on production | NOT TESTED | No production deploy in this run |
| Google Rich Results Test | NOT TESTED | Needs live URL after deploy |
| Schema Markup Validator | NOT TESTED | Needs live URL after deploy |
| PageSpeed / CrUX LCP INP CLS | NOT TESTED | No PageSpeed quota / prod URL |
| Googlebot / Bingbot / OAI-SearchBot fetch | NOT TESTED | robots allow rules verified in code; live fetch needs prod |
| Mobile RTL visual QA | NOT TESTED | Owner acceptance |
| Accessibility deep audit | NOT TESTED | Basic lang/dir present; UserWay script unchanged |
| GSC impressions / clicks | NOT TESTED | No GSC access |
| Keyword Planner volumes | NOT TESTED | No Planner access |

## Content / GEO spot checks (code + unit)

| Check | Result |
| --- | --- |
| Answer-first on pillars + services + guides | PASS (code) |
| Package comparison table on `/rsvp`, `/pricing`, cost guide, WhatsApp | PASS (code) |
| BreadcrumbList on services / pillars / FAQ / guides | PASS (code) |
| Organization ContactPoint + ImageObject logo | PASS (code) |
| VideoObject absent without poster/date | PASS (intentional) |
| sameAs absent without verified profiles | PASS (intentional) |

## Regression risk notes

- Home remains `force-dynamic` due to auth cookie redirect (caching trade-off).
- FAQ accordion still client-side for UX, but answers stay in HTML via `hidden`.
- Wedding template demos are noindex and omitted from sitemap.
