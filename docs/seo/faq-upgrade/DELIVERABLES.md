# FAQ knowledge center — deliverables

PR: https://github.com/esclickteam/invistimo-events/pull/455  
Preview branch: `cursor/faq-knowledge-center-aafc`  
Local: `http://localhost:3000/faq`  
Production URL (unchanged path): `https://www.invistimo.com/faq`  
**No merge/deploy without explicit approval.**

## Final question counts by category

| Category | Count |
|---|---|
| מתחילים עם Invistimo | 17 |
| חבילות, מחירים ותשלומים | 18 |
| רשימת מוזמנים | 13 |
| אישורי הגעה | 18 |
| WhatsApp, SMS ושיחות | 16 |
| הזמנות דיגיטליות | 12 |
| Save the Date | 10 |
| סידורי הושבה | 15 |
| צוות הושבה ו־QR | 14 |
| ניהול והפקת אירוע | 12 |
| אתר חתונה אישי | 10 |
| אבטחה, פרטיות ומחיקת נתונים | 12 |
| תקלות ותמיכה | 12 |
| **Total** | **179** |

All 19 legacy questions were mapped into the new taxonomy (kept, rewritten, or split). New questions fill the gaps listed in `GAP-ANALYSIS.md`.

## Media used (existing product assets)

| Asset | Used for |
|---|---|
| `/images/event-management/product/guests-dashboard.webp` | Guest list / who confirmed |
| `/images/rsvp/rsvp-form-frame.jpg` | How RSVP works |
| `/videos/rsvp-steps-wa.mp4` | WhatsApp sending |
| `/marketing/invites/invite-wedding-mia-alon.webp` | Digital invitation |
| `/marketing/videos/home-save-the-date.webm` | Save the Date |
| `/images/seating/seating-map.webp` | Seating map |
| `/images/seating/seating-assign.webp` | Assignment update |
| `/videos/smartsit.mp4` | Guest assignment |
| `/images/event-management/product/overview-dashboard.webp` | Event management |
| `/videos/event-management/tasks-flow.webm` | Tasks |
| `/videos/event-management/budget-flow.webm` | Budget |
| `/images/event-management/product/calendar-schedule.webp` | Schedule |
| `/videos/event-management/event-day.webm` | Event day |
| `/marketing/wedding-website/previews/*` | Wedding website |

No stock wedding couple hero. No invented UI mockups.

## SEO technical checklist

| Check | Result |
|---|---|
| Canonical `/faq` | PASS |
| Single H1 | PASS |
| H2 per category | PASS |
| Crawlable answers in HTML (`hidden` CSS, not removed) | PASS |
| FAQPage JSON-LD matches visible Q/A (179) | PASS |
| Organization + BreadcrumbList + WebPage | PASS |
| Meta title/description updated | PASS |
| Open Graph via `pageMetadata` | PASS |
| Sitemap includes `/faq` via CORE_PUBLIC_ROUTES | PASS |
| No visitor-facing SEO/GEO/AEO labels | PASS (`public-no-internal-labels`) |
| Search Console volumes | NOT VERIFIED (no access) |

## GEO / AEO content notes

- Direct-answer openings; no “number 1 in Israel” claims
- Distinctions: RSVP vs arrival, record vs person, STD vs invite, self-serve vs accompaniment vs on-site
- Internal links to guides/services without inventing URLs
- `updatedAt` / `FAQ_CONTENT_UPDATED` = 2026-10-27
- Consistency pass vs pricing, terms, privacy, seating FAQs

## PASS / FAIL summary

| Area | Result |
|---|---|
| Content accuracy (verified capabilities only) | PASS |
| UX search + accordion + deep links | PASS (manual screenshots) |
| SEO technical | PASS |
| Schema sync | PASS |
| Unit tests (`faq-search`, FAQ assertions in `seo-public`) | PASS |
| Pre-existing `seo-public` GUIDES length assertion (18≠17) | FAIL (pre-existing on main, unrelated) |
| Fresh product screenshots from isolated test accounts | NOT VERIFIED — reused current public product media |
| Live Search Console keyword volumes | NOT VERIFIED |

## Files changed

See git commit on branch `cursor/faq-knowledge-center-aafc`.
