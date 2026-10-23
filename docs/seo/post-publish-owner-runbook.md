# Runbook בעלים — אחרי אישור Merge + Deploy

לבצע **רק אחרי** Deploy לפרודקשן של PR #380. הסוכן לא מבצע את הצעדים האלה בלי גישה לחשבונות.

## 1) Google Search Console

**לפני יצירת נכס חדש:** בדקו אם כבר קיים נכס ל־`invistimo.com` / `www.invistimo.com`.  
אימות טכני כבר קיים (קובץ HTML + DNS TXT) — **אין צורך** ב־`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` אם הנכס מאומת.

1. פתחו GSC → בחרו נכס קיים (או Domain עם ה־TXT הקיים).
2. Sitemaps → שלחו `https://www.invistimo.com/sitemap.xml`.
3. URL Inspection → Request indexing ל־hubs (ראו `post-publish-index-checklist.md`).
4. מלאו את טבלת האינדוקס ב־`baseline-index-report.md`.

פירוט לחיצות: `measurement-connect-owner-steps.md` · גם `connect-search-analytics.md`.

## 2) Google Analytics 4

1. **חפשו נכס GA4 קיים** ל־Invistimo לפני יצירה.
2. העתיקו Measurement ID מה־Web stream של `www.invistimo.com` (`G-XXXXXXXX`).
3. הגדירו `NEXT_PUBLIC_GA_MEASUREMENT_ID` בפרודקשן → Redeploy אחד.
4. בדקו Realtime על `/pricing` ו־`/rsvp` (לא על `/invite/...`).
5. אירועים מוכנים בקוד: `select_cta`, `ai_referral`, `web_vital`, `content_group`.
6. המרות מומלצות לסמן ב־GA4: `generate_lead` / contact success, `sign_up`, CTA ל־`/pricing`.

## 3) Bing Webmaster Tools

1. **ייבוא מ־GSC** (מועדף — בלי meta ובלי Redeploy).
2. רק אם הייבוא נכשל: אימות meta → `NEXT_PUBLIC_BING_SITE_VERIFICATION` → Redeploy.
3. שלחו את אותו sitemap.

## 4) מפת אתר + בקשות אינדוקס

- GSC + Bing: sitemap מעודכן.
- GSC URL Inspection לרשימת ה־hubs ב־`post-publish-index-checklist.md`.
- תעדו תאריך ותוצאה ב־`baseline-index-report.md`.

## 5) זמינות לסורקי AI

1. בדקו `https://www.invistimo.com/robots.txt` — אין `Disallow: /` גלובלי ל־GPTBot / ClaudeBot / PerplexityBot / Google-Extended (אלא אם בעלים מחליטים אחרת).
2. בדקו `llms.txt` ו־`answers.json` חיים.
3. אופציונלי: שאלו ידנית שאלות מ־`AI_MONITOR_QUESTIONS` ותעדו אם המותג מוזכר (איכותי, לא דירוג).

## 6) דוח בסיס

מלאו `baseline-index-report.md` תוך 7–14 יום מ־Deploy (כשיש נתונים).  
אחר כך המשיכו עם `monthly-report-template.md`.

## 7) Mit4Mit + MazalDay

השלימו checklist ב־`directory-profiles-mit4mit-mazalday.md`: קישור לפרודקשן, תיאור עובדתי, URL פרופיל לתיעוד.
