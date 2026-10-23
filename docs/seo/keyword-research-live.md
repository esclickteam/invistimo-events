# Keyword research — Israeli market (live SERP notes)

**Observed:** 2026-10-23 (Asia/Jerusalem) via public web search.  
**Volumes / CPC / KD:** not available (no Keyword Planner / GSC export in this environment). All volumes remain **unknown** — do not treat as ranked positions for Invistimo.

Canonical mapping lives in `lib/seo/keywordMap.ts` and `docs/seo/keyword-map.md`.

## Method

1. Query Hebrew commercial/informational phrases Invistimo can serve.
2. Record who appears in the result list (vendors/content), not a numbered rank for Invistimo.
3. Assign one primary Invistimo URL (anti-cannibalization).
4. Mark intent and conversion potential qualitatively.

## Priority map (actionable)

| Query | Intent | Invistimo primary | SERP vendors observed (snapshot) | Conversion potential |
| --- | --- | --- | --- | --- |
| אישורי הגעה לחתונה | commercial | `/rsvp/chatuna` | Wedly, Guini, Flashback (prior), plus market pages | High |
| אישורי הגעה בוואטסאפ | commercial | `/rsvp/whatsapp` | Lunsoul, Guini, Wedly, PLAN4ME, Attending | High |
| אישורי הגעה לאירועים | commercial | `/rsvp` | Same family of RSVP vendors | High |
| הזמנות דיגיטליות לחתונה | commercial | `/invitations/chatuna` | My Invite, Haflaa, iEvent, Diginet, Evently | High |
| סידורי הושבה לחתונה | commercial | `/seating-explained` | VIEVENT, Attending, Lunsoul, PLAN4ME, Evently | High |
| כמה עולים אישורי הגעה לחתונה | informational → commercial | `/info/guides/cost-rsvp-wedding` → `/pricing` | Wedly compare/price pages dominate educational SERP | High (assist) |
| מתי לשלוח אישורי הגעה | informational | `/info/guides/when-to-send-rsvp` | Vendor blogs + guides | Medium |
| אורחים שלא מאשרים הגעה | informational | `/info/guides/guests-who-dont-reply` | Vendor FAQ-style pages | Medium |
| Save the Date לחתונה | informational / mixed | `/rsvp/save-the-date` | Brand-name businesses + invitation vendors | Medium |
| מערכת ניהול אירועים | commercial | `/event-management` | Broader event-tech SERP | Medium |
| מספר שולחן לאורחים | informational | `/info/guides/table-number-message` | Seating product pages | Medium |
| חבילות אישורי הגעה | commercial | `/pricing` | Pricing/compare pages | High |
| Invistimo | navigational | `/` | Brand | Retention |

## Content gaps vs SERP (honest)

Competitors heavily push:

- “Free WhatsApp RSVP” landing pages  
- Fixed low headline prices (e.g. published ₪79 / free tiers)  
- AI seating / sketch-to-seating stories  
- Multilingual WhatsApp claims  

Invistimo should **not** invent free pricing or AI claims. Compete with:

1. Clear factual package table + calculator truth  
2. Answer-first Hebrew explainers already shipped  
3. Differentiation that is true: personal link model, message vs call packages, seating add-on, event management module  

## Next data fill (after GSC)

Export queries with impressions ≥ threshold, join to this table, then optionally open Keyword Planner for exact volumes. Only then update `volume` / `competition` fields in code.
