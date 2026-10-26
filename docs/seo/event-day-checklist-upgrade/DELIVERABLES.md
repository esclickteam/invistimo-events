# Event-day checklist upgrade — deliverables

**URL (unchanged):** `/info/guides/event-day-checklist`  
**PR:** https://github.com/esclickteam/invistimo-events/pull/433  
**Branch:** `cursor/event-day-checklist-upgrade-1143`  
**Updated:** 26 באוקטובר 2026 (Asia/Jerusalem)  
**Preview:** local `http://localhost:3456/info/guides/event-day-checklist` (dev server; no production deploy)

## 1. Chapters (TOC)

1. התשובה הקצרה (AEO)
2. הצ׳קליסט האינטראקטיבי
3. לוח זמנים (ציר זמן)
4. בדיקת האולם
5. בדיקת ספקים (+ נוסח להעתקה)
6. תקציב ותשלומים
7. מוזמנים ואישורי הגעה
8. סידורי הושבה
9. לו״ז ליום האירוע
10. חלוקת אחריות
11. ציוד לאריזה (+ צ׳קליסט נפרד)
12. תקלות ותרחישים
13. 24 השעות האחרונות
14. בוקר האירוע
15. אחרי האירוע
16. סוגי אירועים (חתונה / חינה / בר מצווה / ברית)
17. איך Invistimo עוזרת
18. FAQ (37)

## 2. Screenshots

| File | What |
|------|------|
| `/opt/cursor/artifacts/screenshots/event-day-desktop-full.png` | Desktop hero |
| `/opt/cursor/artifacts/screenshots/event-day-checklist-demo.png` | Interactive checklist |
| `/opt/cursor/artifacts/screenshots/event-day-checklist-interaction.png` | Filters / interaction |
| `/opt/cursor/artifacts/screenshots/event-day-timeline.png` | Timeline accordion (14 days open) |
| `/opt/cursor/artifacts/screenshots/event-day-mobile.png` | Mobile hero |
| `/opt/cursor/artifacts/screenshots/event-day-mobile-checklist.png` | Mobile checklist |

## 3. SEO report

| Item | Status |
|------|--------|
| URL unchanged | PASS |
| Title + meta description | PASS (page.tsx metadata) |
| Single H1 | PASS |
| H2/H3 hierarchy | PASS |
| Canonical via `pageMetadata` | PASS |
| Article + WebPage + BreadcrumbList + Organization + FAQPage | PASS (37 FAQ entities) |
| Open Graph via site helper | PASS |
| Internal links (verified slugs) | PASS |
| Image alt text | PASS |
| Mobile-friendly layout | PASS |
| HTML crawlable (content not JS-only) | PASS (sections in DOM; checklist labels in DOM) |

Primary keywords covered in H1/H2/body: מה בודקים לפני יום האירוע, צ׳קליסט לחתונה, שבוע לפני, יום לפני, ספקים, הושבה, אישורי הגעה.

## 4. GEO report

| Practice | Status |
|----------|--------|
| Clear definitions + standalone short answers | PASS |
| Distinction recommendation vs contract obligation | PASS (timeline disclaimer) |
| No invented market prices (example table labeled) | PASS |
| Invistimo facts consistent with product | PASS |
| Israeli venue timing context (48–72h typical, contract rules) | PASS |
| Real update date | PASS |
| Internal links to complementary guides | PASS |
| Avoid duplicate fluff vs wedding-planning | PASS (day-of depth vs full planning hub) |

## 5. AEO report

| Practice | Status |
|----------|--------|
| Short answer box ~70–100 words | PASS |
| Anchor chips to sections | PASS |
| FAQ 37 with direct-first answers | PASS |
| Standalone answers (supplier late, guest count deadline, day-before, seating owner) | PASS |
| FAQ JSON-LD matches visible FAQ | PASS |

## 6. Verified Invistimo capabilities (used in copy)

| Capability | Verified claim |
|------------|----------------|
| Guest list + statuses | Core |
| WhatsApp RSVP rounds | Package-included (2 message rounds) |
| Manual RSVP updates (e.g. phone) | Yes |
| SMS reminder + thank-you | Message packages |
| Call rounds | Call packages only |
| Digital seating map / table message | Add-on `seating` |
| Tasks / vendors / budget | Add-on system / event-management |
| LIVE seating | Separate; package/permissions dependent |
| Auto-send final headcount to venue | **No** — user exports/hands off |
| Replaces on-site producer | **No** unless accompaniment agreed |
| Check-in screens | Exist when enabled; ≠ advance RSVP |

## 7. PASS/FAIL tests (Playwright + manual)

| Test | Result |
|------|--------|
| Desktop render | PASS |
| Mobile render | PASS |
| RTL | PASS |
| Checklist toggle + progress (via input change) | PASS |
| localStorage persistence | PASS |
| Filter all/open/done | PASS |
| Expand item detail | PASS |
| Reset with confirm | PASS |
| Timeline accordion | PASS |
| Copy vendor message | PASS |
| Print/PDF button present (browser print dialog) | PASS |
| FAQ ≥35 visible | PASS (37) |
| Schema FAQPage count | PASS (37) |
| Images | PASS (200; earlier flaky naturalWidth timing) |
| `/api/me` 500 in local env | FAIL (env/mongo; pre-existing, not guide-specific) |
| Header/footer className hydration warnings | FAIL (sitewide chrome; pre-existing) |
| Guide-specific pageerror | PASS (none) |

## 8. Topics needing explicit product/owner approval

1. Whether to add a dedicated «ניהול אירוע מול הפקה» guide (currently linked via wedding-planning `#event-day-mgmt` + `/event-management`).
2. Whether PDF should be a generated file download vs browser «Save as PDF» (implemented as print dialog).
3. Any new licensed event photography beyond existing `/images/rsvp/guides/wedding-planning/*` and seating screenshots.
4. Production merge/deploy — **blocked until explicit approval**.
