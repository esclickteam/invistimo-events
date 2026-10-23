# דוח בדיקת עיצוב / UX / תוכן — עמודי שיווק (PR #380)

**נוצר:** 2026-10-23 (Asia/Jerusalem)  
**ענף:** `cursor/seo-geo-aeo-0a2e`  
**בסיס בדיקה:** `http://localhost:3010`  
**צילומי מסך:** `/opt/cursor/artifacts/screenshots/premium-audit/`  
**JSON מלא:** `docs/seo/premium-design-inventory.json`

כל העמודים: **PASS** בדסקטופ (1440×900) ובמובייל (iPhone 13) — RTL, ללא overflow אופקי, HTTP 200.

## סיכום שדרוגים שבוצעו בפועל

- מעטפת פרימיום אחידה ב־`PublicContentPage` (Hero, יתרונות, תהליך, סוגי אירועים, FAQ, CTA, מדיה).
- FAQ ויזואלי ב־`/rsvp`, `/seating-explained`, `/event-management` (לא רק JSON-LD).
- שדרוג מלא ל־`/faq` ולאינדקס המדריכים.
- העמקת מדריכים: benefits/steps/מדיה/סוגי אירועים + תוכן רב־אירועי.
- מפת מילות מפתח מורחבת לכל סוגי אירוע (בלי עמודים דקים כפולים).
- תיקון רווח ב־H1 בין כותרת ל־accent (SEO/נגישות).
- **לא** שונו מחירים, חבילות או יכולות עסקיות. **אין** Merge/Deploy.

## מלאי עמודים

| נתיב | מילים (בערך) | ביטוי ראשי | אזורים | Desktop | Mobile |
| --- | ---: | --- | --- | --- | --- |
| `/` | 296 | Invistimo / מותג | answer, benefits, steps, cta, media | PASS | PASS |
| `/rsvp` | 699 | אישורי הגעה | answer, benefits, eventTypes, **faq**, cta, media | PASS | PASS |
| `/rsvp/chatuna` | 627 | אישורי הגעה לחתונה | answer, benefits, steps, faq, cta, media | PASS | PASS |
| `/rsvp/whatsapp` | 609 | אישורי הגעה בוואטסאפ / SMS | full premium + eventTypes | PASS | PASS |
| `/rsvp/save-the-date` | 597 | Save the Date / סייב דה דייט | full premium + eventTypes | PASS | PASS |
| `/invitations/chatuna` | 503 | הזמנות דיגיטליות | full premium + eventTypes | PASS | PASS |
| `/seating-explained` | 706 | סידורי הושבה | benefits, steps, **faq**, eventTypes, media | PASS | PASS |
| `/event-management` | 858 | מערכת ניהול אירועים | benefits, **faq**, eventTypes, cta | PASS | PASS |
| `/pricing` | **1050** | חבילות אישורי הגעה | מחשבון ללא שינוי + benefits, steps, טבלת חבילות, eventTypes, FAQ, CTAs | PASS | PASS |
| `/faq` | 381 | שאלות ותשובות | answer, faq accordion, eventTypes, cta | PASS | PASS |
| `/info/about` | 354 | אודות | benefits, eventTypes, faq, cta | PASS | PASS |
| `/info/guides` | 340 | מדריכים (hub) | hero, אשכולות, cta | PASS | PASS |
| `/info/guides/cost-rsvp-wedding` | 639 | כמה עולים אישורי הגעה | benefits, steps, eventTypes, faq | PASS | PASS |
| `/info/guides/when-to-send-rsvp` | 515 | מתי לשלוח אישורי הגעה | benefits, steps, eventTypes, faq | PASS | PASS |
| `/info/guides/send-digital-invitation` | 458 | איך שולחים הזמנה | benefits, steps, media, eventTypes | PASS | PASS |
| `/info/guides/seating-plan` | 452 | איך מכינים הושבה | benefits, steps, media, eventTypes | PASS | PASS |
| `/info/guides/save-the-date-vs-invitation` | 361 | STD מול הזמנה | benefits, steps, faq | PASS | PASS |
| `/info/guides/guests-who-dont-reply` | 348 | אורחים שלא עונים | benefits, steps, faq | PASS | PASS |
| `/info/guides/table-number-message` | 326 | מספר שולחן | benefits, steps, faq | PASS | PASS |
| `/info/guides/event-day-checklist` | 426 | לפני יום האירוע | benefits, steps, eventTypes | PASS | PASS |
| `/info/guides/guest-list` | 445 | ניהול רשימת מוזמנים | benefits, steps, eventTypes | PASS | PASS |
| `/info/guides/reduce-meal-waste` | 352 | מנות / צמצום בזבוז | benefits, steps, faq | PASS | PASS |

שמות קבצי צילום: `desktop-<slug>.png` / `mobile-<slug>.png` תחת `premium-audit/`.

## SEO / GEO

- כוונות נפרדות: `/rsvp` ≠ `/rsvp/chatuna` ≠ `/rsvp/whatsapp` ≠ `/rsvp/save-the-date`.
- סוגי אירוע (בר מצווה, ברית, חינה, יום הולדת, אירוע חברה/כנס) מכוסים ב־hubs — **בלי** עשרות עמודים כמעט זהים.
- `AI_MONITOR_QUESTIONS` הורחב (13 שאלות) כולל ברית/חינה, אירוע חברה, מספר שולחן.
- `public/answers.json` מסונכרן עם `PAGE_ANSWERS` + מפת מילות מפתח.

## השוואת מתחרים (תצפית בלבד — בלי דירוגים מומצאים)

מתחרים שנצפו בחיפושי מפתח: Diginet, Save The Date, WiWi, iPlan, My Invite, Wedly, Guini ואחרים.  
יתרון מבנה של Invistimo באתר: hub רב־אירועי + Save the Date עצמאי + שקיפות מחשבון + FAQ/מדריכים ל־AEO. אין טענת מיקום נוכחי בגוגל.

## בעיות שנותרו — דורשות אישור

1. **Merge / Deploy** — רק אחרי אישור מפורש.
2. **חיבור GSC / GA4 / Bing** — מחוץ לקוד; ראו `docs/seo/connect-search-analytics.md`.
3. **נפחי חיפוש** — עדיין `null` עד Keyword Planner / GSC.
4. **`/pricing`** — המחשבון הקיים נשמר; לא שונו מחירים. אפשר בהמשך (באישור) להעשיר הסברים סביב המחשבון בלי לגעת בסכומים.
5. **צילומי מסך ספציפיים של Save the Date** — משתמשים בהמחשות ממותג/מערכת קיימות; אין להמציא UI שלא קיים.
6. **עמודי «שירות × סוג אירוע» נפרדים** — לא נוצרו בכוונה; לפתוח רק אם GSC יאמת ביקוש.

## בדיקות

- `npm run test:seo` — 17/17 PASS.
