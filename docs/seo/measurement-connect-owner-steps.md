# חיבור מדידה — צעדים מדויקים לבעלים (בלי כפילויות)

**תאריך בדיקה (Asia/Jerusalem):** 2026-10-23  
**אתר:** https://www.invistimo.com  
**מדיניות:** אין שירותים בתשלום · אין Redeploy מיותר · אין יצירת נכסים כפולים אם כבר קיימים.

---

## ממצאים טכניים (כבר בוצעו — אין צורך ב־env ל־GSC)

| בדיקה | תוצאה |
| --- | --- |
| קובץ אימות GSC באתר | **קיים וחי** — https://www.invistimo.com/google0523bb34ab51dcb6.html → `200` |
| DNS TXT לאימות Google | **קיים** על `invistimo.com`: `google-site-verification=BdW7UhMwC_-D7tSazxn9ERzWa8jh3mp3Bk3tnRI5ujo` |
| תג meta `google-site-verification` ב־HTML | לא נדרש — הקובץ + DNS מספיקים |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` ב־Vercel | **חסר — ואין צורך להוסיף** כל עוד הנכס מאומת ב־GSC |
| תג / קובץ Bing (`msvalidate` / BingSiteAuth) | **לא נמצא** באתר / DNS |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` ב־Vercel | **לא מוגדר** |
| סקריפט gtag / `G-…` ב־HTML חי | **לא נטען** (הקוד מוכן; ממתין ל־Measurement ID) |
| robots + sitemap | תקינים; 28 URL; hubs עם `index,follow`; `/invite` עם `noindex` |

**מסקנה:** אל תוסיפו משתנה סביבה לאימות Google. פתחו GSC ובדקו שהנכס כבר מאומת. אם כן — עברו ישר להגשת sitemap.

---

## 1) Google Search Console — אימות + sitemap + אינדוקס

### א. פתיחה ובדיקה שאין כפילות

1. היכנסו ל־[Google Search Console](https://search.google.com/search-console) עם חשבון Google של בעלי Invistimo.
2. בבורר הנכסים (למעלה משמאל) חפשו:
   - `https://www.invistimo.com` (URL-prefix), **או**
   - `invistimo.com` (Domain — מתאים ל־DNS TXT שכבר קיים).
3. **אם הנכס כבר מופיע ומסומן כמאומת** → דלגו לסעיף ב.  
   **אל תיצרו נכס שני לאותו דומיין.**
4. אם אין נכס:
   - **מומלץ:** Add property → **Domain** → `invistimo.com` → Google יראה את רשומת ה־TXT הקיימת → Verify.  
   - **חלופה:** URL prefix `https://www.invistimo.com` → שיטת **HTML file** → הקובץ `google0523bb34ab51dcb6.html` כבר באתר → Verify.

### ב. הגשת sitemap (חובה)

1. בתפריט השמאלי: **Sitemaps** (מפות אתר).
2. בשדה «הוספת מפת אתר חדשה» הזינו בדיוק:  
   `sitemap.xml`  
   (או המלא: `https://www.invistimo.com/sitemap.xml`)
3. לחצו **Submit** / שליחה.
4. המתינו לסטטוס **Success** / «הצלחה». מספר כתובות צפוי ≈ **28**.

### ג. בקשת אינדוקס ל־hubs (אחד־אחד, במכסת היום)

בתפריט: **URL Inspection** (בדיקת כתובת URL). לכל שורה:

1. הדביקו את ה־URL המלא → Enter.  
2. אם «URL is not on Google» / לא באינדקס → **Request indexing** / בקשת יצירת אינדקס.  
3. רשמו תאריך + תוצאה ב־`baseline-index-report.md` §2.

רשימה (סדר עדיפות):

| # | URL |
| --- | --- |
| 1 | `https://www.invistimo.com/` |
| 2 | `https://www.invistimo.com/rsvp` |
| 3 | `https://www.invistimo.com/rsvp/chatuna` |
| 4 | `https://www.invistimo.com/rsvp/whatsapp` |
| 5 | `https://www.invistimo.com/rsvp/save-the-date` |
| 6 | `https://www.invistimo.com/invitations/chatuna` |
| 7 | `https://www.invistimo.com/seating-explained` |
| 8 | `https://www.invistimo.com/event-management` |
| 9 | `https://www.invistimo.com/pricing` |
| 10 | `https://www.invistimo.com/faq` |
| 11 | `https://www.invistimo.com/info/guides` |

### ד. בדיקת סריקה / חסימות

1. **Settings → Crawl stats** (אם זמין) — ודאו שיש בקשות תקינות ל־www.  
2. **Pages** / אינדוקס → בדקו שאין «Blocked by robots.txt» על hubs.  
   - מצופה: `/dashboard`, `/login` חסומים ב־robots.  
   - מצופה: `/invite/…` **Excluded by noindex** (רצוי).  
3. ב־URL Inspection על `/rsvp`: View crawled page → ודאו שמופיע «התשובה הקצרה».

הסוכן **לא יכול** ללחוץ Submit / Request indexing בלי התחברות לחשבון שלכם.

---

## 2) Google Analytics 4 — מציאת נכס קיים לפני יצירה

**אין Measurement ID בפרודקשן כרגע.** לפני יצירת נכס חדש:

1. היכנסו ל־[Google Analytics](https://analytics.google.com/).
2. Admin (גלגל שיניים) → בחרו ארגון / Account שקשור ל־Invistimo.  
3. תחת **Property** חפשו שם כמו Invistimo / invistimo.com.  
4. אם קיים נכס GA4:
   - Admin → Data streams → Web → בחרו את ה־stream של `www.invistimo.com`.  
   - העתיקו **Measurement ID** (`G-XXXXXXXX`).  
   - **אל תיצרו stream שני לאותו אתר.**
5. אם אין נכס בכלל:
   - Admin → Create property → GA4 → Web stream ל־`https://www.invistimo.com` → העתיקו את ה־`G-…`.

### חיבור לקוד (פעולה יחידה בפרודקשן)

1. Vercel → Project **invistimo-events** → **Settings** → **Environment Variables**.  
2. הוסיפו:  
   `NEXT_PUBLIC_GA_MEASUREMENT_ID` = `G-XXXXXXXX`  
   Target: **Production** בלבד (אלא אם רוצים גם Preview).  
3. Deployments → Redeploy של ה־deployment הנוכחי של `main` (או Push ריק) — **רק אחרי** הוספת המשתנה.  
4. בדיקה: פתחו https://www.invistimo.com/pricing → DevTools → Network → חפשו `gtag/js?id=G-`.  
5. ב־GA4 → Reports → Realtime — אמורה להופיע כניסה.  
6. פתחו URL אורח (`/invite/…`) — **לא** אמור להיטען gtag (הקוד חוסם נתיבי אורח).

שלחו לסוכן את ה־`G-…` (או אשרו שהוגדר ב־Vercel) — ואז נוכל לאשר מהסביבה שהתג חי בלי לגעת בנתוני לקוחות.

---

## 3) Bing Webmaster Tools — ייבוא מ־GSC (מועדף)

1. היכנסו ל־[Bing Webmaster Tools](https://www.bing.com/webmasters).  
2. אם האתר כבר ברשימה → דלגו לסעיף sitemap.  
3. אם לא: במסך ההוספה בחרו **Import from Google Search Console** / ייבוא מ־GSC.  
4. אשרו את חשבון Google שבו מאומת `invistimo.com` / `www.invistimo.com`.  
5. סמנו את הנכס הרלוונטי → Import.  
   - כך **אין צורך** ב־`NEXT_PUBLIC_BING_SITE_VERIFICATION` ואין Redeploy.  
6. אם הייבוא נכשל: Add site ידנית → Meta tag → העתיקו את הטוקן → רק אז הגדירו `NEXT_PUBLIC_BING_SITE_VERIFICATION` ב־Vercel → Redeploy.  
7. לאחר שהאתר מופיע: **Sitemaps** → Submit  
   `https://www.invistimo.com/sitemap.xml`

---

## 4) אחרי שהחיבורים פעילים — מילוי דוח הבסיס

1. מלאו `docs/seo/baseline-index-report.md` (טבלאות אינדוקס + ביצועים — **רק ממספרים מיוצאים**, בלי ניחוש).  
2. השתמשו בטבלת הביטויים המורחבת שם (כל סוגי האירועים + שירותים).  
3. תוך 7–14 יום: ייצוא Performance מ־GSC ל־28 יום.

---

## סיכום: מה הסוכן יכול / לא יכול

| פעולה | סטטוס |
| --- | --- |
| אימות שקובץ GSC + DNS כבר קיימים | בוצע |
| בדיקת robots / sitemap / noindex אורחים | בוצע |
| הגשת sitemap ב־GSC/Bing | דורש התחברות שלכם |
| Request indexing | דורש התחברות שלכם |
| איתור Measurement ID קיים | דורש גישה ל־GA שלכם |
| הגדרת env ב־Vercel | דורש הרשאת פרויקט שלכם |
| יצירת שירותי SEO בתשלום | אסור / לא נדרש |
