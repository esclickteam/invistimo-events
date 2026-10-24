# דוח מסירה מרכזי — SEO + AEO + GEO + CRO | Invistimo

**ענף:** `cursor/premium-marketing-upgrade-3a61` (PR #382)  
**תאריך:** 2026-10-23 (Asia/Jerusalem)  
**Preview ציבורי:** https://booking-around-circulation-welding.trycloudflare.com/  
**אין Merge / Deploy לפרודקשן בלי אישור מפורש.**

---

## 1. מה הושלם ונבדק

### מחקר ואסטרטגיה
- מחקר מתחרים חי (SERP) ב־`docs/seo/competitor-research-live-2026-10.md` — בלי נפחי חיפוש מומצאים.
- Keyword Map ב־`lib/seo/keywordMap.ts` + `docs/seo/keyword-map.md` (`volume`/`competition` = null עד GSC/Planner).
- החלטת עמודי אירוע ב־`docs/seo/event-type-pages-decision.md` (בריתה ועגולים בתוך עמודי אב).

### עמודי אירוע (`/for/*`)
| נתיב | סטטוס HTTP מקומי |
| --- | --- |
| `/for/bar-mitzvah` | 200 |
| `/for/bat-mitzvah` | 200 |
| `/for/brit` (כולל בריתה) | 200 |
| `/for/henna` | 200 |
| `/for/birthday` (כולל עגולים) | 200 |
| `/for/private-party` | 200 |
| `/for/corporate` | 200 |

חתונה נשארת ב־hubs הקיימים (`/rsvp/chatuna`, `/wedding-website`, …) — בלי כפילות.

### עמודי שירות חדשים/משודרגים
`/rsvp/sms`, `/rsvp/calls`, `/rsvp/reminders`, `/rsvp/thank-you-messages`, `/rsvp/guest-list`, `/info/demo` (+ קיימים: RSVP, WhatsApp, Save the Date, הזמנות, seating, wedding-website, pricing…).

### מדריכים AEO
17 מדריכים ב־`/info/guides/*` כולל Save the Date, הזמנה, מספר סבבים, אתר חתונה, בר מצווה, אירוע עסקי, תזכורות.

### דגלי מוצר
- `/rsvp` — קישורים לסוגי אירוע + ערוצים + דמו.
- `/seating-explained` — FAQ מורחב + קישורים לסוגי אירוע.
- `/wedding-website` — עמוד פרימיום קיים בענף.
- מסע 7 שלבים (`EventJourney`) כולל קישור להודעות תודה.

### טכני / מדידה בקוד
- Sitemap כולל services + landings + guides.
- `answers.json` / `llms.txt` / `PAGE_ANSWERS` מסונכרנים.
- CRO: `view_demo`, `view_pricing`, `begin_registration`, `begin_contact` + `sign_up` / `generate_lead` קיימים.
- בדיקות: `npx tsx --test scripts/tests/seo-public.test.ts` — 16/16 עברו.

### Off-page
- תוכנית + צ׳קליסט מעודכן; אימות ציבורי Mit4Mit/MazalDay: **פרופיל לא נמצא בחיפוש** (רישום בעלים בלבד).

---

## 2. מה הוכן וממתין לחיבור חשבון

| פריט | סטטוס |
| --- | --- |
| הגשת Sitemap ב־GSC | ממתין לכניסת בעלים (האתר כבר מאומת HTML+DNS — לא ליצור נכס כפול) |
| בקשות אינדוקס לעמודים חדשים | ממתין לבעלים ב־URL Inspection |
| GA4 Measurement ID בפרודקשן | ממתין אם חסר `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| ייבוא Bing מ־GSC | ממתין לכניסת Microsoft |
| דשבורד חשיפות/CTR/מיקומים | **ממתין לנתונים** אחרי חיבור |
| אזכורי AI מדידים | **ממתין לנתונים** — רשימת שאלות מוכנה ב־`AI_MONITOR_QUESTIONS` |

---

## 3. מה דורש הרשאה או פעולה שלכם

1. **אישור Merge / Deploy** — חובה לפני פרודקשן.
2. שליחת **URL פרופיל ציבורי** Mit4Mit + MazalDay כשגלוי; וידוא קישור ל־www.invistimo.com.
3. אישור פניות ל־Engaged / אולמות / מפיקים (טיוטות ב־`outreach-targets.md`).
4. אישור Google Business / רשתות חברתיות ל־`sameAs`.
5. אם חסר — הדבקת Measurement ID ל־GA4 בסביבת הפרודקשן.
6. הגשת Sitemap + אינדוקס ב־GSC אחרי Deploy.

---

## 4. מה תלוי בגוגל / Bing / מנועי AI ולא ניתן להבטיח

- דירוגים, חשיפות, CTR, אינדוקס בפועל.
- הופעה / ציטוט ב־ChatGPT, Gemini, Perplexity, Google AI Overviews.
- מועד סריקה של עמודים חדשים.
- פרסום פרופילים חיצוניים ע״י פלטפורמות צד ג׳.

---

## קישורים מהירים ב־Preview

- בית: `/`
- RSVP: `/rsvp`
- הושבה: `/seating-explained`
- אתר חתונה: `/wedding-website`
- בר מצווה: `/for/bar-mitzvah`
- דמו: `/info/demo` → `/try` (noindex)
- מדריכים: `/info/guides`
- Sitemap: `/sitemap.xml`
- Answers: `/answers.json`

בסיס Preview: `https://booking-around-circulation-welding.trycloudflare.com`
