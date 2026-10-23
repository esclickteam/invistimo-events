# Connecting GSC, GA4, and Bing (owner actions)

No paid tools. Prefer existing properties. Full click-path (Hebrew): `measurement-connect-owner-steps.md`.

## Verified on production (2026-10-23, Asia/Jerusalem)

| Item | Status |
| --- | --- |
| GSC HTML file `public/google0523bb34ab51dcb6.html` | Live at `/google0523bb34ab51dcb6.html` (200) |
| DNS TXT `google-site-verification=…` on `invistimo.com` | Present |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | **Not required** if the GSC property is already verified via file or DNS |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Not set in Vercel — GA4 tag not loading yet |
| Bing meta / DNS | Not found — prefer **Import from Google Search Console** (no redeploy) |

## 1) Google Analytics 4

1. Open Analytics Admin and **search for an existing** Invistimo / invistimo.com GA4 property before creating one.
2. If a Web stream for `www.invistimo.com` exists → copy its Measurement ID (`G-XXXXXXXX`). Do not create a duplicate stream.
3. If none exists → create one GA4 property + one Web stream → copy `G-XXXXXXXX`.
4. Set env (Production): `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX`.
5. Redeploy once.
6. Verify on `/pricing` (not `/invite/…`): Network → `googletagmanager.com/gtag/js?id=G-…`, Realtime hit.
7. Recommended explorations: `ai_referral` / `ai_source`, `select_cta`, `web_vital`, `content_group`.

Code already skips GA on guest/account paths (`lib/seo/analytics.ts`).

## 2) Google Search Console

1. Open Search Console → look for existing `invistimo.com` (Domain) or `https://www.invistimo.com` (URL prefix).
2. If verified → **do not add** `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and do not create a second property.
3. If missing: Domain property uses the existing DNS TXT; URL-prefix can use the existing HTML file.
4. **Sitemaps** → submit `https://www.invistimo.com/sitemap.xml` (expect ≈ 28 URLs).
5. **URL Inspection** → Request indexing for hubs listed in `post-publish-index-checklist.md`.
6. Confirm robots: `https://www.invistimo.com/robots.txt` lists the sitemap.

## 3) Bing Webmaster Tools

1. Prefer **Import from Google Search Console** (no meta tag, no redeploy).
2. Fallback only: set `NEXT_PUBLIC_BING_SITE_VERIFICATION` → redeploy (`msvalidate.01` in root metadata).
3. Submit the same sitemap URL.
4. Optional later (approval if paid): IndexNow.

## 4) Sanity after connect

| Check | Expected |
| --- | --- |
| GA4 Realtime on `/pricing` | Hit + `content_group=pricing` |
| GA4 on `/invite/...` | No tag / no hit |
| GSC sitemap | Success / discovered URLs ≈ 28 marketing |
| Bing sitemap | Accepted |

## What this agent cannot do without you

- Log into your Google / Bing accounts  
- Click Submit sitemap / Request indexing  
- Confirm whether a GA4 property already exists in your org  
- Paste Measurement ID into Vercel Production env  
