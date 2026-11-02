# Phase C — measurement checklist (2026-11-02)

**Branch:** `seo/phase-c-content-expansion` (not merged/deployed until owner approval).  
**Baseline docs:** [`baseline-index-report.md`](./baseline-index-report.md), [`plan-30-60-90.md`](./plan-30-60-90.md).  
**Keyword / AI monitor source:** `lib/seo/keywordMap.ts` (`KEYWORD_OBSERVED_AT`, `AI_MONITOR_QUESTIONS`).

No fabricated metrics — fill only from GSC, Bing Webmaster, and GA4 after access.

---

## 1) Pre-merge (staging / preview)

| Check | Owner result | Notes |
| --- | --- | --- |
| New guide URLs return 200 on preview |  | 18 slugs under `/info/guides/…` |
| `/info/guides` hub lists Phase C guides |  | |
| `npm run test:seo` green |  | Paths in keyword map match `GUIDES` + `CORE_PUBLIC_ROUTES` |
| Sitemap includes new guide paths after deploy |  | Expect URL count ↑ vs ~28 baseline |
| Internal links from hubs (`/rsvp`, `/event-management`, `/wedding-website`) |  | |

---

## 2) Post-deploy — Google Search Console

Connect per [`connect-search-analytics.md`](./connect-search-analytics.md).

### Index coverage (Pages)

| Metric / slice | Day 7 | Day 30 | Day 60 | Day 90 |
| --- | --- | --- | --- | --- |
| Valid indexed (marketing) |  |  |  |  |
| Discovered – currently not indexed |  |  |  |  |
| Crawled – currently not indexed |  |  |  |  |
| Excluded (noindex guest paths) |  |  |  |  |

### URL inspection — Phase C guides (sample)

| URL | Request indexing? | Indexed? | Last crawl | Notes |
| --- | --- | --- | --- | --- |
| `/info/guides/tracking-rsvp-responses` |  |  |  |  |
| `/info/guides/wedding-website-guide` |  |  |  |  |
| `/info/guides/reduce-meal-waste` |  |  |  |  |
| `/info/guides/rsvp-corporate-events` |  |  |  |  |
| _(add remaining slugs)_ |  |  |  |  |

### Performance (28-day windows)

| Metric | Baseline (pre–Phase C) | Days 1–30 post | Days 31–60 | Days 61–90 |
| --- | --- | --- | --- | --- |
| Impressions (site) |  |  |  |  |
| Clicks |  |  |  |  |
| CTR |  |  |  |  |
| Average position |  |  |  |  |

### Queries — filter by primary paths (export)

Export Search results → Queries/Pages for:

- `/wedding-website`, `/event-management`
- `/rsvp/whatsapp`, `/rsvp/calls`, `/rsvp/save-the-date`
- Each new guide primary URL from keyword map Phase C section

| Primary URL | Top 5 queries (from export) | Impressions | Clicks | Avg position |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

---

## 3) Bing Webmaster Tools

| Check | Day 7 | Day 30 | Day 90 |
| --- | --- | --- | --- |
| Sitemap accepted |  |  |  |
| Indexed pages (estimate) |  |  |  |
| Search performance impressions |  |  |  |
| Crawl errors (marketing URLs) |  |  |  |

---

## 4) GA4 (content groups)

| Content group / path pattern | Sessions (28d) | Key events (`select_cta`) | Notes |
| --- | --- | --- | --- |
| `guides` / `/info/guides/*` |  |  | |
| `wedding_website` |  |  | |
| `rsvp` hubs |  |  | |

Compare to baseline row in [`baseline-index-report.md`](./baseline-index-report.md) §4–5 when filled.

---

## 5) AI visibility monitoring

**Cadence:** align with [`plan-30-60-90.md`](./plan-30-60-90.md) — pass at ~day 7, 45, 90 after deploy (plus optional monthly).

**Question set:** full list in `AI_MONITOR_QUESTIONS` (`lib/seo/keywordMap.ts`). Phase C adds 10 Hebrew customer questions (import, tracking, STD timing, phone RSVP, guest changes, meal waste, seating groups, personal link, wedding site vs invitation).

| Run date | Engine(s) tested | Invistimo URL cited? | Which URL | Accurate vs product? | Action |
| --- | --- | --- | --- | --- | --- |
|  | ChatGPT / Gemini / Perplexity / Copilot |  |  |  |  |

**Log template columns:** question text, engine, date, citation Y/N, URL, factual errors, follow-up (content tweak / `answers.json` / none).

No ranking or “#1 in AI” claims in reports — only citation accuracy and URL presence.

---

## 6) 30 / 60 / 90 comparison narrative (owner)

| Horizon | Compare to baseline | Decision prompts |
| --- | --- | --- |
| **30d** | Index coverage on new guides; any impressions on `/wedding-website` or corporate guide queries | Fix crawl/index blockers only; no mass rewrites |
| **60d** | CTR on hubs with impressions; internal link gaps from GSC “Referring page” | Title/description tests where impressions exist |
| **90d** | Guide cluster vs hub cannibalization (same query on two URLs?) | Merge/split keyword rows only with intent evidence from GSC export |

---

## 7) Sign-off

| Role | Name | Date | Notes |
| --- | --- | --- | --- |
| Owner |  |  | GSC/Bing/GA4 connected |
| SEO review |  |  | Keyword map + guides aligned |
