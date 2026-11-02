# Keyword Map — Invistimo (Israel)

**Observed at:** 2026-11-02 (Asia/Jerusalem)  
**Volume / competition:** not measured. No Search Console or Keyword Planner access in this environment. Fields stay `null` until real data is connected.

Source of truth in code: `lib/seo/keywordMap.ts`.

## Mapping rules

1. One primary URL per query (no cannibalization).
2. Supporting URLs deepen the topic; they do not target the same commercial head term.
3. Observations are web-search snapshots, not Google rank reports.
4. Do not invent volumes, competitor ranks, or review scores.

## Map (core + hubs)

| Query | Intent | Primary | Supporting |
| --- | --- | --- | --- |
| אישורי הגעה לחתונה | commercial | `/rsvp/chatuna` | `/rsvp`, `/pricing` |
| אישורי הגעה לאירועים | commercial | `/rsvp` | `/rsvp/chatuna`, `/faq` |
| אישורי הגעה בוואטסאפ | commercial | `/rsvp/whatsapp` | `/rsvp/chatuna`, `/info/guides/guests-who-dont-reply` |
| חבילת הודעות וואטסאפ לחתונה | commercial | `/rsvp/whatsapp` | `/pricing`, `/info/guides/whatsapp-vs-sms-rsvp` |
| מוקד טלפוני לאישורי הגעה | commercial | `/rsvp/calls` | `/info/guides/how-phone-rsvp-works`, `/pricing` |
| Save the Date לחתונה | informational | `/rsvp/save-the-date` | `/info/guides/save-the-date-vs-invitation` |
| שליחת save the date בוואטסאפ | commercial | `/rsvp/save-the-date` | `/info/guides/when-to-send-save-the-date` |
| אתר חתונה | commercial | `/wedding-website` | `/info/guides/wedding-website-guide` |
| הזמנות דיגיטליות לחתונה | commercial | `/invitations/chatuna` | `/info/guides/send-digital-invitation`, `/wedding-website` |
| סידורי הושבה לחתונה | commercial | `/seating-explained` | `/info/guides/seating-plan`, `/info/guides/seating-cards-vs-qr` |
| מערכת ניהול אירועים | commercial | `/event-management` | `/rsvp`, `/seating-explained` |
| ניהול אירוע חתונה במערכת אחת | commercial | `/event-management` | `/rsvp/chatuna`, `/info/guides/event-day-checklist` |
| כמה עולים אישורי הגעה לחתונה | informational | `/info/guides/cost-rsvp-wedding` | `/pricing` |
| מתי לשלוח אישורי הגעה | informational | `/info/guides/when-to-send-rsvp` | `/rsvp/chatuna` |
| Invistimo | navigational | `/` | `/info/about`, `/contact` |

## Phase C guides (2026-11-02) — primary targets

| Query (sample) | Intent | Primary guide / hub |
| --- | --- | --- |
| מעקב אחר אישורי הגעה | informational | `/info/guides/tracking-rsvp-responses` |
| שינויי הושבה ביום האירוע | informational | `/info/guides/seating-live-day-of` |
| איך בונים אתר חתונה | informational | `/info/guides/wedding-website-guide` |
| אתר חתונה או הזמנה דיגיטלית | informational | `/info/guides/wedding-website-vs-digital-invitation` |
| ניהול אישורי הגעה לאירוע חברה | informational | `/info/guides/rsvp-corporate-events` |
| איך עובדים אישורי הגעה בטלפון | informational | `/info/guides/how-phone-rsvp-works` |
| ייבוא רשימת מוזמנים | informational | `/info/guides/import-guest-list` |
| שינוי מוזמנים ברגע האחרון | informational | `/info/guides/last-minute-guest-changes` |
| ניסוח הזמנה לוואטסאפ לחתונה | informational | `/info/guides/whatsapp-invitation-wording` |
| מתי שולחים save the date לחתונה | informational | `/info/guides/when-to-send-save-the-date` |
| חיסכון במנות חתונה | informational | `/info/guides/reduce-meal-waste` |
| פלוס אחד באישורי הגעה | informational | `/info/guides/plus-ones-and-kids-rsvp` |
| צ'ק אין אורחים בחתונה | informational | `/info/guides/venue-guest-check-in` |
| אורחים מחו"ל בחתונה | informational | `/info/guides/overseas-guests-rsvp` |
| הושבת משפחות בחתונה | informational | `/info/guides/seating-families-groups` |
| קישור אישי לאישור הגעה | informational | `/info/guides/personal-rsvp-link` |
| סבבי תזכורת לאורחים | informational | `/info/guides/rsvp-reminder-rounds` |
| ניהול אורחים אחרי אישורי הגעה | informational | `/info/guides/manage-guests-after-rsvp` |

Full query list (including variants and hub rows): `KEYWORD_MAP` in `lib/seo/keywordMap.ts`.

## Research notes (not ranks)

Public RSVP / invitation vendors sometimes appear in broad Hebrew queries (e.g. Wedly, Guini, Diginet, Save The Date brands). Observations in code name sources only as SERP context — **not** as comparison pages to publish.

Invistimo pages describe Invistimo capabilities factually. Do not republish competitor prices as Invistimo facts.

## Pillar → cluster (updated)

| Pillar | Hub | Cluster URLs |
| --- | --- | --- |
| RSVP | `/rsvp` | event-type pages, WhatsApp, calls, save-the-date, tracking, reminders, import, personal link, corporate guide |
| Invitations | `/invitations/chatuna` | send invitation, STD vs invitation, WhatsApp wording |
| Wedding website | `/wedding-website` | wedding-website-guide, vs digital invitation |
| Seating | `/seating-explained` | seating-plan, live day-of, families/groups, venue check-in, seating-cards-vs-qr |
| Events | `/event-management` | event-day checklist, manage guests after RSVP, reduce meal waste |
| Guest ops | `/info/guides/guest-list` | import, plus-ones/kids, overseas, last-minute changes |

## AI monitor

Hebrew customer questions for periodic AI citation checks: `AI_MONITOR_QUESTIONS` in `lib/seo/keywordMap.ts` (includes Phase C additions). See [`phase-c-measurement-2026-11-02.md`](./phase-c-measurement-2026-11-02.md).

## After GSC / Planner access

1. Export queries for the primary URLs above (including Phase C guides).
2. Fill `volume` / `competition` only from those exports.
3. Re-run `npm run test:seo`.
4. Split or merge rows only when intent differs.
