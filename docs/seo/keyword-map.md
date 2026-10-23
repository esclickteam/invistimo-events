# Keyword Map — Invistimo (Israel)

**Observed at:** 2026-10-23 (Asia/Jerusalem)  
**Volume / competition:** not measured. No Search Console or Keyword Planner access in this environment. Fields stay `null` until real data is connected.

Source of truth in code: `lib/seo/keywordMap.ts`.

## Mapping rules

1. One primary URL per query (no cannibalization).
2. Supporting URLs deepen the topic; they do not target the same commercial head term.
3. Observations are web-search snapshots, not Google rank reports.
4. Do not invent volumes, competitor ranks, or review scores.

## Map

| Query | Intent | Primary | Supporting |
| --- | --- | --- | --- |
| אישורי הגעה לחתונה | commercial | `/rsvp/chatuna` | `/rsvp`, `/pricing` |
| אישורי הגעה לאירועים | commercial | `/rsvp` | `/rsvp/chatuna`, `/faq` |
| אישורי הגעה בוואטסאפ | commercial | `/rsvp/whatsapp` | `/rsvp/chatuna`, `/info/guides/guests-who-dont-reply` |
| הזמנות דיגיטליות לחתונה | commercial | `/invitations/chatuna` | `/info/guides/send-digital-invitation`, `/wedding-website` |
| Save the Date לחתונה | informational | `/rsvp/save-the-date` | `/info/guides/save-the-date-vs-invitation` |
| סידורי הושבה לחתונה | commercial | `/seating-explained` | `/info/guides/seating-plan`, `/info/guides/table-number-message` |
| מספר שולחן לאורחים | informational | `/info/guides/table-number-message` | `/seating-explained`, `/info/guides/seating-plan` |
| מערכת ניהול אירועים | commercial | `/event-management` | `/rsvp`, `/seating-explained`, `/info/guides/event-day-checklist` |
| מה לבדוק לפני יום החתונה | informational | `/info/guides/event-day-checklist` | `/event-management`, `/rsvp` |
| כמה עולים אישורי הגעה לחתונה | informational | `/info/guides/cost-rsvp-wedding` | `/pricing` |
| מתי לשלוח אישורי הגעה | informational | `/info/guides/when-to-send-rsvp` | `/rsvp/chatuna` |
| אורחים שלא מאשרים הגעה | informational | `/info/guides/guests-who-dont-reply` | `/rsvp/whatsapp`, `/pricing` |
| חבילות אישורי הגעה | commercial | `/pricing` | `/info/guides/cost-rsvp-wedding` |
| Invistimo | navigational | `/` | `/info/about`, `/contact` |

## Competitor landscape (public pages observed, not ranks)

Observed public marketing/pricing surfaces (not Invistimo rankings):

- [Wedly](https://www.wedly.co.il/) — RSVP / WhatsApp, free + paid packages; compare/pricing pages.
- [Guini](https://www.guini.io/) — WhatsApp RSVP, per-confirmation pricing tiers.
- [Flashback](https://www.flashback.co.il/) — invitations / RSVP adjacent (listed in market comparisons).
- Also seen in market comparison tables published by others: Diginet, Save The Date / savedate.co.il, WiWi, My Invite, iPlan, Easy2Give, Navo, Magiimolo, Lunsoul, RSVP Events.

Invistimo pages must describe Invistimo capabilities factually. Do not republish competitor prices as Invistimo facts.

## Pillar → cluster

| Pillar | Hub | Cluster URLs |
| --- | --- | --- |
| RSVP | `/rsvp` | wedding, WhatsApp, timing, cost, non-replies, guest list, meal count |
| Invitations | `/invitations/chatuna` | Save the Date, send invitation, STD vs invitation |
| Seating | `/seating-explained` | seating plan, table-number message |
| Events | `/event-management` | event-day checklist |

## After GSC / Planner access

1. Follow `measurement-connect-owner-steps.md` (reuse existing GSC verification; find GA4 before creating).
2. Export queries for the primary URLs above into `baseline-index-report.md` (§4א / §4ב — includes all event-type variants).
3. Fill `volume` / `competition` only from those exports (or Keyword Planner if later approved).
4. Re-run `npm run test:seo`.
5. Split or merge rows only when intent differs.
