# Phase C — content expansion (2026-11-02)

**Branch:** `seo/phase-c-content-expansion`  
**Status:** **Awaiting merge approval** — no production deploy until owner approves.

## Scope delivered in code

1. **18 new informational guides** under `/info/guides/` via `lib/seo/phaseCGuides.ts` + dynamic `[slug]` route (`PublicContentPage`). Guide count: **37**.
2. **Strengthened service pages:** `/rsvp/whatsapp`, `/rsvp/calls`, `/rsvp/save-the-date`, `/wedding-website`, `/event-management` (intent, FAQ, internal links, meta).
3. **Strengthened existing dedicated guides** with in-body contextual links and FAQ clarity (non-reply, WhatsApp/SMS, venue guarantee, digital invitation, bit/PayBox, STD vs invitation, seating cards/QR, table number, planning, management vs production, vendors, event-day checklist, alcohol calculator).
4. **Keyword map + AI monitor** — `lib/seo/keywordMap.ts`, mirrored in `public/answers.json`; `KEYWORD_OBSERVED_AT` = 2026-11-02.
5. **PAGE_ANSWERS** for all new guides + sync script `scripts/seo/sync-answers-json.ts`.
6. **Measurement & outreach docs** (research only; no external contact).

## Constraints respected

- No `/compare`, no competitor comparison tables on public pages, no competitor pitch copy.
- No price/package/form/URL/design system changes; no deleted guides.
- No visitor-facing SEO/AEO/GEO labels; no invented product facts, reviews, or volumes.
- No separate `/blog`; hub remains `/info/guides`.
- No merge/deploy without explicit owner approval.

## New guide slugs

| # | Slug | Path |
| --- | --- | --- |
| 1 | `tracking-rsvp-responses` | `/info/guides/tracking-rsvp-responses` |
| 2 | `seating-live-day-of` | `/info/guides/seating-live-day-of` |
| 3 | `wedding-website-guide` | `/info/guides/wedding-website-guide` |
| 4 | `wedding-website-vs-digital-invitation` | `/info/guides/wedding-website-vs-digital-invitation` |
| 5 | `rsvp-corporate-events` | `/info/guides/rsvp-corporate-events` |
| 6 | `how-phone-rsvp-works` | `/info/guides/how-phone-rsvp-works` |
| 7 | `import-guest-list` | `/info/guides/import-guest-list` |
| 8 | `last-minute-guest-changes` | `/info/guides/last-minute-guest-changes` |
| 9 | `whatsapp-invitation-wording` | `/info/guides/whatsapp-invitation-wording` |
| 10 | `when-to-send-save-the-date` | `/info/guides/when-to-send-save-the-date` |
| 11 | `reduce-meal-waste` | `/info/guides/reduce-meal-waste` |
| 12 | `plus-ones-and-kids-rsvp` | `/info/guides/plus-ones-and-kids-rsvp` |
| 13 | `venue-guest-check-in` | `/info/guides/venue-guest-check-in` |
| 14 | `overseas-guests-rsvp` | `/info/guides/overseas-guests-rsvp` |
| 15 | `seating-families-groups` | `/info/guides/seating-families-groups` |
| 16 | `personal-rsvp-link` | `/info/guides/personal-rsvp-link` |
| 17 | `rsvp-reminder-rounds` | `/info/guides/rsvp-reminder-rounds` |
| 18 | `manage-guests-after-rsvp` | `/info/guides/manage-guests-after-rsvp` |

## Related docs

- [`keyword-map.md`](./keyword-map.md)
- [`phase-c-measurement-2026-11-02.md`](./phase-c-measurement-2026-11-02.md)
- [`plan-30-60-90.md`](./plan-30-60-90.md)
- [`outreach-targets.md`](./outreach-targets.md)

## Owner checklist before merge

- [x] All 18 guides in `GUIDES` / clusters / contentDates / PAGE_ANSWERS / answers.json
- [ ] `npm run test:seo`, `tsc`, production build pass on PR CI / local
- [ ] Preview QA Hebrew + mobile/desktop sample pages
- [ ] Explicit approve merge + deploy
