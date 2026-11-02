# שלב ב׳ — חיזוק עמודי שירות ומדריכים (2026-11-02)

ענף: `seo/phase-b-service-guides` (מעל `origin/main` כולל PR #476).

## מטרה
בידול תוכן אמיתי בין עמודי סוג־אירוע לבין hub `/rsvp`, חיזוק קישורים פנימיים בגוף התוכן, והתאמת תשובות קצרות (`PAGE_ANSWERS`) למנועי AI — בלי מחירים/טפסים/עיצוב חדש ובלי מאמרים חדשים.

## שינויים עיקריים

### עמודי שירות
- `/rsvp` — הבהרת תפקיד כ־hub + קישורים לכל סוגי האירוע ולמדריכי בחירה.
- `/rsvp/chatuna|hina|bar-bat-mitzvah|brit-brita` — meta ייחודי, FAQ מבדל, קישורים למדריכים רלוונטיים.
- `/seating-explained` — תיאור שירות + קישורים למדריך החלטות ולמדריך ביצוע.
- `/invitations/chatuna` — תשובת AI/תיאור שמבדילים הזמנה מסבבי RSVP.

### מדריכים
- `seating-plan` = ביצוע במערכת; `wedding-seating-arrangements` = החלטות לפני ההושבה.
- חיזוק קישורים פנימיים ב: how-to-choose, guest-list, when-to-send, cost-rsvp-wedding.
- `/info/guides` — מרכז ידע עם כניסות עדיפות בגוף ה־hero.

### AI / structured answers
- הוספת `/rsvp/hina` ל־`PAGE_ANSWERS`.
- עדכון תשובות ל־hub, עמודי אירוע, הושבה והזמנות.
- סנכרון `public/answers.json`.

## לא נכלל
- Merge/Deploy, מאמרים חדשים, `/blog`, שינוי URL, שינוי מחירים/חבילות/טפסים, כותרות SEO/GEO/AEO בגולש.
