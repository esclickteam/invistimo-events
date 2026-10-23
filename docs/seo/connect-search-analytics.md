# Connecting GSC, GA4, and Bing (owner actions)

No paid tools. No deploy from this doc. Values go into the hosting environment (Vercel/project env), not into git.

## 1) Google Analytics 4

1. Create or open a GA4 property for `www.invistimo.com`.
2. Create a Web data stream → copy Measurement ID (`G-XXXXXXXX`).
3. Set env: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX`.
4. Redeploy.
5. Verify on a marketing page (not `/invite`…): Network request to `googletagmanager.com/gtag/js?id=G-…`, and Realtime shows a hit.
6. Recommended custom dimensions / explorations:
   - Event `ai_referral` → param `ai_source`
   - Event `select_cta` → params `location`, `href`
   - Event `web_vital` → params `metric_name`, `metric_rating`
   - User/page dimension from config param `content_group` (already sent)

Code already skips GA on guest/account paths (`lib/seo/analytics.ts`).

## 2) Google Search Console

1. Add property **URL prefix** `https://www.invistimo.com` (or Domain property if DNS ready).
2. Verification options:
   - HTML tag → set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<token>` and redeploy, **or**
   - DNS TXT (preferred long-term).
3. After verified: **Sitemaps** → submit `https://www.invistimo.com/sitemap.xml`.
4. Confirm robots: `https://www.invistimo.com/robots.txt` lists the sitemap.
5. Optional: set preferred domain / https (should already be www via hosting redirects).

## 3) Bing Webmaster Tools

1. Import from GSC **or** add site manually.
2. Verification: set `NEXT_PUBLIC_BING_SITE_VERIFICATION=<msvalidate token>` → redeploy (wired to `msvalidate.01` in root metadata).
3. Submit the same sitemap URL.
4. Optional later (approval if anything paid): IndexNow.

## 4) Sanity after connect

| Check | Expected |
| --- | --- |
| GA4 Realtime on `/pricing` | Hit + `content_group=pricing` |
| GA4 on `/invite/...` | No tag / no hit |
| GSC sitemap | Success / discovered URLs ≈ 28 marketing |
| Bing sitemap | Accepted |

## What this agent cannot do without you

- Create the GA4 / GSC / Bing properties  
- Paste verification tokens into production env  
- Approve redeploy after env changes  
