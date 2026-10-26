# Bit / PayBox guide upgrade — QA delivery

**URL (unchanged):** `/info/guides/bit-paybox-wedding-invitation`  
**PR:** https://github.com/esclickteam/invistimo-events/pull/441  
**Branch:** `cursor/bit-paybox-guide-upgrade-8570`  
**Deploy:** awaiting explicit approval — no merge/deploy to production.

## Preview

Local: `http://localhost:3000/info/guides/bit-paybox-wedding-invitation`  
PR preview once CI/Vercel attaches to #441.

## Product accuracy (vs code)

| Claim | Source | Result |
|---|---|---|
| PayBox = HTTPS URL + guest opens external link | `EventDetailsForm`, `GuestRsvpExtras` | PASS |
| bit = Israeli phone; guest copies number | `EventDetailsForm`, `GuestRsvpExtras` | PASS |
| No bit deep-link / QR in editor | `giftsToInvitationMirrors` → `bitUrl: ""` | PASS |
| Invistimo does not settle PayBox/bit | guest path open/copy only | PASS |
| Click/copy ≠ payment confirmation | no auto gift-received status | PASS |
| Options independent; credit separate | toggles + `/credit-gifts` | PASS |
| Saved gifts reflected on personal links | central gifts → invitation mirrors | PASS |

## Content / chrome

| Check | Result |
|---|---|
| No «התשובה הקצרה» / AEO / GEO / AI labels | PASS |
| Natural H1 + opening paragraphs | PASS |
| Same URL, dedicated route | PASS |
| 30 FAQs | PASS |
| Interactive demo + checklist | PASS |
| Settings UI labeled as illustration (not fake client screenshot) | PASS |

## Automated tests

| Suite | Result |
|---|---|
| `no-seo-chrome.test.ts` | PASS |
| `seo-public.test.ts` | PASS |
| `public-no-internal-labels.test.ts` | PASS |
| `central-event-details.test.ts` | PASS |

## SEO / GEO / AEO (natural only)

| Item | Result |
|---|---|
| Title / meta | PASS |
| Canonical `https://www.invistimo.com/info/guides/bit-paybox-wedding-invitation` | PASS |
| Single H1 | PASS |
| Article + BreadcrumbList + FAQPage + Organization | PASS |
| answers.json ↔ PAGE_ANSWERS | PASS |
| No visible SEO chrome | PASS |

## Functional (Playwright)

| Check | Result |
|---|---|
| Demo «רק bit» shows only Bit | PASS |
| Bit copy shows status «המספר הועתק ✓» | PASS |
| Demo «רק PayBox» opens external-link explanation panel | PASS |
| Checklist check → «2 מתוך 14» + localStorage note | PASS |
| Desktop + mobile layout | PASS |
| RTL | PASS |

## Artifacts

`/opt/cursor/artifacts/bit-paybox-guide/`

- `pw-desktop-hero.png`, `pw-desktop-full.png`
- `pw-desktop-demo-bit-only.png`, `pw-desktop-demo-bit-copied.png`, `pw-desktop-demo-paybox.png`
- `pw-desktop-checklist.png`
- `pw-mobile-hero.png`, `pw-mobile-demo.png`, `pw-mobile-full.png`
- `interactions-demo.mp4` (+ `.webm`)
- `pw-qa.json`

## Files changed

- `app/(marketing)/info/guides/bit-paybox-wedding-invitation/*`
- `app/(marketing)/info/guides/[slug]/page.tsx`
- `lib/seo/guides.ts`
- `lib/seo/answers.ts`, `public/answers.json`
- `docs/seo/bit-paybox-guide-upgrade/QA-REPORT.md`
