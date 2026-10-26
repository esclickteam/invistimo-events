# QA — `/info/guides/seating-plan`

**תאריך:** 26 באוקטובר 2026 (Asia/Jerusalem)  
**סביבה:** local Next.js (`localhost:3000`), Playwright + Chrome  
**פריסה:** Preview בלבד — ללא Merge/Deploy

## PASS/FAIL

| # | בדיקה | תוצאה |
|---:|---|---|
| 1 | דסקטופ | PASS |
| 2 | מובייל | PASS |
| 3 | RTL | PASS |
| 4 | תוכן עניינים | PASS |
| 5 | הדגמת מפה | PASS |
| 6 | שיבוץ אורחים | PASS |
| 7 | חסימת קיבולת | PASS |
| 8 | העברת אורחים | PASS |
| 9 | איפוס הדגמה | PASS |
| 10 | צ׳קליסט + התקדמות | PASS |
| 11 | שמירה מקומית | PASS |
| 12 | הדפסה (כפתור) | PASS (UI) |
| 13 | העתקת נוסח לאולם | PASS |
| 14 | קישורים פנימיים | PASS |
| 15 | התאמה למערכת (יכולות אמיתיות בלבד) | PASS |
| 16 | SEO meta/canonical/H1 | PASS |
| 17 | GEO (תשובה ישירה בפתיח) | PASS |
| 18 | AEO ללא תוויות גלויות | PASS |
| 19 | Schema Article+FAQ+Breadcrumb | PASS |
| 20 | נגישות בסיסית (RTL, labels, status) | PASS |
| 21 | ביצועים ראשוניים | PASS (200, טעינה תקינה) |
| 22 | Console (ללא שגיאות JS של המדריך) | PASS — `/api/me` 500 צפוי ללא Mongo ב־env זה |
| 23 | היעדר תוויות SEO/AEO | PASS |
| 24 | בידול מול המדריך הכללי | PASS |

## ארטיפקטים

- Desktop hero / full page
- Demo assign / capacity block / move
- Checklist progress
- Mobile + mobile demo
- Video: `seating-plan-interactive-demo.mp4`
