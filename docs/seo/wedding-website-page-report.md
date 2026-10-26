# דוח מסירה — `/wedding-website`

תאריך: 2026-10-26 (Asia/Jerusalem)

## Preview

- ענף: `cursor/wedding-website-marketing-upgrade-35b4`
- PR: יש לפתוח/לראות ב־GitHub על הענף (ללא Merge לפני אישור)
- Preview מקומי בבדיקה: `http://localhost:3000/wedding-website`

## קישורים לדמואים אמיתיים

| סגנון הצגה | תבנית במערכת | קישור |
|---|---|---|
| Timeless Elegance | `eternal-gold` | `/wedding-website/eternal-gold` |
| Romantic Garden | `garden-bloom` | `/wedding-website/garden-bloom` |
| Modern Editorial | `minimal-noir` | `/wedding-website/minimal-noir` |
| Luxury Evening | `midnight-velvet` | `/wedding-website/midnight-velvet` |

סרטון גלילה (הקלטת מסך אמיתית, ללא קול):
`/marketing/videos/wedding-website-scroll.webm`
Poster: `/marketing/videos/wedding-website-scroll-poster.jpg`

## יכולות שאומתו במערכת

מתוך התבניות, ה־demo content והעורך:

- Hero עם שמות ותמונה/מדיה
- הסיפור שלנו / how-we-met / proposal (לפי תבנית)
- גלריית תמונות
- פרטי אירוע (תאריך, שעה, אולם, כתובת)
- מיקום + ניווט Waze / Google Maps
- לוח זמנים
- מידע לאורחים (חניה/הסעות וכו')
- RSVP דרך קישור אישי לאורח (לא חשיפת נתוני אורחים באתר ציבורי)
- עורך ויזואלי + בחירת תבנית + פרסום לעדכון אחרי פרסום
- התאמה למובייל בתבניות

לא הוצגו מחירים לעיצוב אישי (אין מקור מאומת בעמוד זה) ולא הובטחו נתוני שביעות רצון.

## SEO / GEO / AEO

- Title / Meta Description / Canonical עצמי
- H1 יחיד כמבוקש
- Open Graph + תמונת שיתוף
- JSON-LD: Organization, BreadcrumbList, WebPage, Service, FAQPage, VideoObject
- FAQ גלוי (20) + תשובות AEO גלויות לשאלות טבעיות
- `PAGE_ANSWERS["/wedding-website"]` + עדכון `public/answers.json`
- מילות מפתח ב־`keywordMap` וקישור ב־`clusters`
- קישורים פנימיים לעמודים קיימים בלבד

## תוצאות בדיקות

| בדיקה | תוצאה |
|---|---|
| `scripts/tests/seo-public.test.ts` | PASS (18/18) |
| דמואים 4 הנבחרים HTTP 200 | PASS |
| אין גלילה אופקית בדסקטופ (1440) | PASS |
| אין גלילה אופקית במובייל (390) | PASS |
| RTL | PASS |
| H1 / Title תואמים למפרט | PASS |
| iframes קטנים צפופים מהגלריה הישנה | הוסרו — תצוגות גדולות ל־4 תבניות |

## מה לא נגענו בו

- מערכת בניית אתרי החתונה / העורך
- תבניות קוד
- נתוני לקוחות, הזמנות, מנגנוני RSVP
