# מפת אירועי CRO (GA4) — בלי לספור לחיצה כהמרה שהושלמה

**עודכן:** 2026-10-23 (Asia/Jerusalem)  
**מדידה:** `trackPublicEvent` → `gtag('event', …)` רק כש־`NEXT_PUBLIC_GA_MEASUREMENT_ID` מוגדר (פורמט `G-…`).

## עקרון

לחיצה על CTA = אירוע משפך (`select_cta` / `view_demo` / …).  
המרה שהושלמה = רק אחרי הצלחה בשרת/טופס (`sign_up`, `generate_lead`, רכישה בפועל).

**אין לשלוח ל־Analytics:** שמות, טלפונים, פרטי אורחים, תוכן הודעות.

## אירועים מיושמים בקוד

| אירוע | מתי נשלח | קובץ / מיקום | סוג |
| --- | --- | --- | --- |
| `select_cta` | כל לחיצה על `TrackedCtaLink` | `components/seo/TrackedCtaLink.tsx` | משפך |
| `view_demo` | CTA ל־`/try` או `/info/demo` | אותו קומפוננט | משפך |
| `view_pricing` | CTA ל־`/pricing` | אותו קומפוננט | משפך |
| `begin_registration` | CTA ל־`/register` | אותו קומפוננט | משפך |
| `begin_contact` | CTA ל־`/contact` | אותו קומפוננט | משפך |
| `sign_up` | הרשמה שהושלמה בטופס | `app/(auth)/register/RegisterForm.tsx` | **המרה** |
| `generate_lead` | שליחת טופס יצירת קשר בהצלחה | `app/contact/page.tsx` | **המרה** |
| `web_vital` | LCP/CLS/INP וכו׳ | `components/seo/WebVitalsReporter.tsx` | ביצועים |

## אירועים שממתינים לחיבור / הרחבה

| אירוע | סטטוס | הערה |
| --- | --- | --- |
| `demo_session_start` | ממתין | אפשר להוסיף בכניסה ל־`/try` אחרי אישור מדידה בדמו (בלי PII) |
| `begin_checkout` | ממתין לנתיב רכישה ציבורי ברור | תלוי בתהליך התשלום בפועל |
| `purchase` | ממתין | רק אחרי webhook מוצלח — לא מלחיצת «אני רוצה את החבילה» לוואטסאפ |

## מה נדרש מבעלים

1. Measurement ID של GA4 קיים (אם חסר) → `NEXT_PUBLIC_GA_MEASUREMENT_ID` בפרודקשן.  
2. סימון המרות ב־GA4: `sign_up`, `generate_lead` (ואחר כך `purchase` כשיוטמע).  
3. **לא** לסמן `select_cta` / `view_demo` כהמרות ראשיות.

ראו גם: `docs/seo/connect-search-analytics.md`, `docs/seo/analytics-dashboard.md`.
