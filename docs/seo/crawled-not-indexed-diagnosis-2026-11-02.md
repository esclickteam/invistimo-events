# אבחון: 20 עמודים «נסרק — לא נכלל באינדקס»

תאריך בדיקה חיה: 2026-11-02  
מקור הרשימה: URL Inspection / GSC (אוקטובר 2026)  
סביבה: `https://www.invistimo.com` (פרודקשן)

## סיכום שורש

אין תקלת אינדוקס טכנית (robots / canonical / soft 404 / HTTP) על 20 העמודים.  
Google כבר סרקה אותם ובחרה לא לכלול — בעיקר **בחירת אינדקס** על רקע:

1. **גרף קישורים פנימי חלש** למדריכים רבים (מגה־תפריט לא נשמר ב־DOM כשהוא סגור; פוטר דל).
2. **חפיפת כוונה / תוכן דומה** בין עמודי אירוע (`/rsvp/chatuna|hina|…`) לבין ה־hub `/rsvp`, ובין מדריכים קרובים (הושבה / הזמנות).
3. **מפת אתר תקינה** (42 URL, HTTP 200) — הסריקה לא נחסמה; הבעיה אינה «לא נמצא ב־sitemap».

**אין להשתמש ב־Indexing API** לכפיית אינדוקס על עמודים אלה (לא JobPosting/Broadcasting).

## תשתית sitemap / robots (פרודקשן)

| בדיקה | תוצאה |
| --- | --- |
| `GET /sitemap.xml` | HTTP **200**, XML תקין, **42** `<loc>` |
| Cache | HIT (Age גבוה) |
| `robots.txt` | מצביע ל־`/sitemap.xml`; לא חוסם את 42 הכתובות |
| עמודי demo `/wedding-website/*` | מחוץ ל־sitemap + noindex (תקין) |

ה־500 ההיסטורי על sitemap (אם הופיע) אינו משוחזר בפרודקשן כעת.  
סיכון חבוי: `lastModifiedFor()` זורק אם חסרה שורת תאריך — תוקן ב־`app/sitemap.ts` עם fallback + בדיקת CI לכיסוי מלא.

## אבחון פרטני (20/20)

מקרא סיבה עיקרית מומלצת לשלב הבא (לא כשל טכני נוכחי):

| URL | HTTP | Canonical עצמי | robots | Soft 404 | נפח טקסט SSR (בקירוב) | קישור מ־`/` בפרוד כיום | אבחנה |
| --- | ---: | --- | --- | --- | ---: | --- | --- |
| `/rsvp/chatuna` | 200 | כן | index,follow | לא | ~15k | כן | חפיפה עם hub `/rsvp`; חיזוק בידול + קישורים הקשריים |
| `/rsvp/hina` | 200 | כן | index,follow | לא | ~15k | כן | כנ״ל |
| `/rsvp/bar-bat-mitzvah` | 200 | כן | index,follow | לא | ~10k | כן | כנ״ל |
| `/rsvp/brit-brita` | 200 | כן | index,follow | לא | ~7k | כן | דק יותר יחסית; בידול תוכן |
| `/info/guides/send-digital-invitation` | 200 | כן | index,follow | לא | ~21k | לא | חסר crawl path קבוע מהבית/פוטר |
| `/info/guides/bit-paybox-wedding-invitation` | 200 | כן | index,follow | לא | ~17k | לא | נישה; קישור מהזמנות + מדריכים קרובים |
| `/info/guides/seating-plan` | 200 | כן | index,follow | לא | ~16k | כן | חפיפה אפשרית עם `wedding-seating-arrangements` |
| `/info/guides/seating-cards-vs-qr` | 200 | כן | index,follow | לא | ~15k | לא | חסר קישור קבוע; קרוב לציר הושבה |
| `/info/guides/save-the-date-vs-invitation` | 200 | כן | index,follow | לא | ~20k | לא | חסר crawl path; חפיפה ל־STD/הזמנות |
| `/info/guides/guest-list` | 200 | כן | index,follow | לא | ~16k | כן | בחירת אינדקס / תחרות פנימית |
| `/info/guides/guests-who-dont-reply` | 200 | כן | index,follow | לא | ~8k | לא | דק יחסית + חסר קישור קבוע |
| `/info/guides/wedding-planning` | 200 | כן | index,follow | לא | ~16k | לא | חסר crawl path; נושא רחב תחרותי |
| `/info/guides/event-management-vs-production` | 200 | כן | index,follow | לא | ~13k | לא | חסר קישור; חיזוק מול `/event-management` |
| `/info/guides/wedding-vendors-contracts` | 200 | כן | index,follow | לא | ~16k | לא | חסר crawl path |
| `/info/guides/wedding-venue-guest-guarantee` | 200 | כן | index,follow | לא | ~12k | לא | חסר crawl path |
| `/info/guides/wedding-seating-arrangements` | 200 | כן | index,follow | לא | ~18k | כן | חפיפה עם `seating-plan` — לאחד כוונות בשלב תוכן |
| `/info/guides/wedding-alcohol-calculator` | 200 | כן | index,follow | לא | ~11k | לא | חסר קישור מ־alcohol service |
| `/info/guides/whatsapp-vs-sms-rsvp` | 200 | כן | index,follow | לא | ~12k | לא | חסר crawl path; חיזוק מ־`/rsvp/whatsapp` |
| `/info/guides/how-to-choose-rsvp-company` | 200 | כן | index,follow | לא | ~20k | לא | עדיפות גבוהה לקישורים הקשריים (כוונת בחירה) |
| `/info/guides/event-day-checklist` | 200 | כן | index,follow | לא | ~22k | לא | חסר crawl path; איכות טובה — בעיקר גילוי/סמכות |

הערת bailout: חלק מהעמודים מציגים סמן CSR בנתיבים מסוימים, אך גם עמודים **שבאינדקס** (`/faq`, `/rsvp`) חולקים דפוס דומה — אינו הסבר בלעדי ל־20 האלה.

## מה תוקן בשלב התשתית (PR זה)

1. `app/sitemap.ts` — לא מפיל 500 על תאריך חסר (fallback + לוג).
2. בדיקות CI — כיסוי `ROUTE_CONTENT_DATES` לכל נתיב ב־sitemap; sitemap לא מתנגש עם robots disallow.
3. מגה־תפריט — קישורים נשארים ב־DOM גם כשהפאנל סגור (מוסתרים, לא unmount).
4. פוטר — קישורי crawl קבועים לעמודי אירוע ולמדריכי עדיפות.

## מה לא לעשות עכשיו

- לא Indexing API / בקשות אינדוקס המוניות ל־20 העמודים.
- לא Merge/Deploy בלי אישור מפורש.
- לא מאמרים חדשים בשלב זה.

## המלצות לשלב הבא (אחרי האישור)

1. חיזוק עמודי שירות (בידול מול hub, H2 ייחודיים, טבלאות/FAQ ספציפיים לאירוע).
2. חיזוק מדריכים + מרכז ידע: קישורים הקשריים בגוף התוכן (לא רק ניווט), במיוחד `how-to-choose-rsvp-company`, `guest-list`, ציר הושבה.
3. צמצום חפיפה בין `seating-plan` ל־`wedding-seating-arrangements` (canonical/איחוד כוונה או בידול חד).
4. רק אחר כך: עמוד השוואה מקצועי + קידום במנועי AI.
