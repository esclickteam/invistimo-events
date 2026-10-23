# SEO & Search Intelligence — Dashboard Spec

Use only after property access is granted. Do not open paid tools without approval.

## Properties to connect

| System | Env / action | Status |
| --- | --- | --- |
| Google Search Console | Verify with `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, submit `https://www.invistimo.com/sitemap.xml` | Needs owner |
| Google Analytics 4 | `NEXT_PUBLIC_GA_MEASUREMENT_ID` (`G-…`) | Needs owner |
| Bing Webmaster Tools | `NEXT_PUBLIC_BING_SITE_VERIFICATION` → `msvalidate.01` | Needs owner |

Code already:

- Loads GA4 only on public marketing paths (`lib/seo/analytics.ts`).
- Sets `content_group` (home, guides, rsvp_invitations, seating, event_management, pricing, wedding_website, trust, other).
- Fires `ai_referral` with `ai_source` from document referrer **or** UTM containing chatgpt / perplexity / gemini / copilot / claude.
- Fires `web_vital` for LCP / INP / CLS when GA4 is enabled.
- Contact / register flows can use existing `generate_lead` / `sign_up` where wired; marketing CTAs send `select_cta`.

## Manager dashboard (Looker Studio / GA4 Explorations)

Recommended tiles (real data only):

1. **Search** (GSC): impressions, clicks, CTR, average position — last 28 days vs previous 28.
2. **Landing pages** (GSC + GA4): top marketing URLs by clicks and by sessions.
3. **Queries** (GSC): branded vs non-branded; map to Keyword Map primaries.
4. **Device** (GSC + GA4): mobile / desktop split for CTR and conversions.
5. **Conversions**: WhatsApp package clicks (`select_cta`), contact submits (`generate_lead`), registrations (`sign_up`).
6. **AI referrals**: count of `ai_referral` by `ai_source` (incomplete by nature — many AI clients strip referrers).
7. **CWV**: distribution of `web_vital` ratings (good / needs-improvement / poor).
8. **Content groups**: sessions and conversions by `content_group`.

## AI brand-mention monitor (manual)

Questions in `AI_MONITOR_QUESTIONS` (`lib/seo/keywordMap.ts` and `public/answers.json`):

1. מה זה Invistimo?
2. איך שולחים אישורי הגעה לחתונה בוואטסאפ?
3. מה כוללת חבילת ההודעות של Invistimo?
4. האם Save the Date ב־Invistimo אוסף אישורי הגעה?
5. איך מחשבים מחיר לאישורי הגעה ב־Invistimo?
6. איך עובדים סידורי הושבה ב־Invistimo?

**Cadence:** monthly. Log date, engine (ChatGPT Search / Gemini / Google AI Overview / Perplexity / Copilot), whether Invistimo was cited, and the URL cited if any. Spreadsheet is enough; no paid tool required.

## What this does not prove

- Presence in AI answers is not guaranteed by `llms.txt`, `answers.json`, or schema.
- Referrer-based AI tracking under-counts.
- CWV events in GA4 are a sample, not a substitute for CrUX / Search Console CWV reports.
