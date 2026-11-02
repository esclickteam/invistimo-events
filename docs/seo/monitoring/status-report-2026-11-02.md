# דוח ביצוע ניטור ואינדוקס — INVISTIMO

**תאריך ביצוע:** 2026-11-02 (Asia/Jerusalem)  
**אתר:** https://www.invistimo.com  
**נכס GSC:** `sc-domain:invistimo.com` (סשן Chrome מאומת)  
**היקף:** ניטור / ייצוא / תיעוד בלבד — ללא שינוי קוד אתר, תוכן, מחירים, URL, עיצוב; ללא Merge/Deploy.

---

## תקציר ממצאים

| נושא | מצב בפועל |
| --- | --- |
| Sitemap חי | HTTP 200, **60** `<loc>`, **37** מדריכים |
| GSC Sitemaps | `https://www.invistimo.com/sitemap.xml` · **הצלחה** · Submitted **2.11.2026** · Last read **2.11.2026** · Discovered **60** |
| הגשה מחדש היום | **הושלמה** — URL מלא התקבל; נתיב יחסי `sitemap.xml` נדחה קודם כלא תקין |
| פערי גילוי | Live **60** = GSC Discovered **60** ⇒ **פער 0** (קודם 42→60) |
| Coverage (Pages, עדכון אחרון **23.10.2026** — ישן מול חי) | Indexed **8** · Not indexed **53** — **לא מייצג** את מצב ה־URL Inspection מהיום |
| URL Inspection היום | **20** בדיקות · **14** Indexed · **6** Unknown (מתוכן 5 בתוך 60 המעקב + `/invitations` מחוץ ל־sitemap tracking) |
| Performance 28d (תרשים) | קליקים **173** · הופעות **1,012** · CTR **17.1%** · מיקום ממוצע **17.0** |
| Performance 3mo (תרשים) | קליקים **607** · הופעות **1,811** · CTR **33.5%** · מיקום ממוצע **12.3** |
| מותג מול לא־מותג | מבוסס **ייצוא שאילתות מובילות בלבד** (לא כל היקום) · 28d: מותג 118/211 · לא־מותג 11/446 |
| Bing Webmaster | `bizuply@outlook.com` · **מאומת** · Sitemap **Success** · 60 URLs · Last crawl 2.11 · דוחות Indexed/Keywords עדיין בעיבוד (עד 48ש׳) |
| AI Performance רשמי | GSC: באנר בלבד · Bing AI: נגיש, **0 Citations** |
| שלב ד׳ | ראו `stage-d-report-2026-11-02.md` — Top-10 מסחרי, CRO, GA4 Home 7d (82 users / 19 key events), פערי מדידה |

---

## 1) Google Search Console — מה בוצע בפועל

### 1.1 Sitemap — הגשה מאומתת (2026-11-02)
- נכנסנו ל־**Sitemaps** בנכס `sc-domain:invistimo.com`.
- הזנה של נתיב יחסי `sitemap.xml` נדחתה («כתובת ה-sitemap לא תקינה / נתיב חלקי»).
- הזנה של **`https://www.invistimo.com/sitemap.xml`** התקבלה: מודאל הצלחה + טבלה עודכנה.
- סטטוס מאומת ב־UI: **הצלחה** · Submitted **2 בנוב׳ 2026** · Last read **2 בנוב׳ 2026** · Discovered pages: **60** · Videos: 0.
- **אין שגיאת קריאה.**
- השוואה: כתובות באתר החי **60** · כתובות שגילתה גוגל במפת האתר **60**. ייתכן עדכון מאוחר נוסף בדוחות אחרים.

### 1.2 Coverage / Indexing (דוח Pages — ישן)
מקור: UI Pages + ייצוא `exports/gsc-coverage-2026-11-02.xlsx` (תרשים וסיבות; **ללא רשימת URL פרטנית**).

| מדד | ערך |
| --- | ---: |
| Indexed | 8 |
| Not indexed | 53 |
| Crawled – currently not indexed | 40 |
| Discovered – currently not indexed | 5 |
| Redirect | 4 |
| Not found (404) | 3 |
| Alternate page with proper canonical | 1 |
| Last update של דוח Pages | **2026-10-23** |

**פער חי מול ישן:** דוח Pages עדיין מציג Indexed=8 (23.10), בעוד URL Inspection מהיום אישר Indexed ל־14 כתובות לפחות. **אין להסיק Indexed מתוך HTTP / sitemap / impressions.**

### 1.3 Performance — ייצוא שבוצע
קבצים תחת `docs/seo/monitoring/exports/`:

| ייצוא | קובץ |
| --- | --- |
| Performance 28d (zip + CSV) | `gsc-performance-28d-2026-11-02*` |
| Performance 3mo (zip + CSV) | `gsc-performance-3mo-2026-11-02*` |
| Queries 28d / 3mo | `gsc-queries-*-2026-11-02.csv` |
| Pages 28d / 3mo | `gsc-pages-*-2026-11-02.csv` |
| Coverage xlsx | `gsc-coverage-2026-11-02.xlsx` |
| URL Inspection batch | `gsc-url-inspection-2026-11-02.csv` |

| חלון | קליקים | הופעות | CTR | מיקום ממוצע |
| --- | ---: | ---: | ---: | ---: |
| 28 ימים | 173 | 1,012 | 17.1% | 17.0 |
| 3 חודשים | 607 | 1,811 | 33.5% | 12.3 |

### 1.4 מותג מול לא־מותג
הגדרת מותג: השאילתה מכילה `invistimo` / `אינוויסטימו` / `אינבסטימו` / `invist` (ללא תלות ברישיות).  
**בסיס נתונים:** ייצוא **שאילתות מובילות בלבד** — לא כלל השאילתות בנכס.

| חלון | מותג קליקים/הופעות | לא־מותג קליקים/הופעות | מיקום משוקלל מותג | מיקום משוקלל לא־מותג |
| --- | --- | --- | ---: | ---: |
| 28d | 118 / 211 | 11 / 446 | ~1.0 | ~32 |
| 3mo | 370 / 520 | 11 / 546 | ~1.1 | ~32.1 |

**מסקנה:** החשיפה והקליקים נשלטים ע״י מותג. לא־מותג מביא הופעות אבל CTR/מיקום חלשים.

---

## 2) Bing Webmaster Tools

### עדכון סשן חי (2026-11-02 ~15:06 — אחרי אימות Meta)
- מחובר כ־`bizuply@outlook.com` · נכס **מאומת**.
- Sitemap: **Success** · `https://www.invistimo.com/sitemap.xml` · Discovered **60** · Last submit/crawl **11/2/2026**.
- לא הוגש מחדש בשלב ד׳ (כבר Success).
- Site Explorer Indexed URLs: **No data** · באנר עיבוד עד 48ש׳.
- Home Search Performance (דגימה): **1 click / 10 impressions** (28–31.10).
- AI Performance: נגיש · **0 Citations**.

פירוט שלב ד׳: [`stage-d-report-2026-11-02.md`](./stage-d-report-2026-11-02.md).

---

## 3) URL Inspection — תוצאות אמת (2026-11-02)

מקור: GSC URL Inspection חי. קובץ: `exports/gsc-url-inspection-2026-11-02.csv`.  
**לא** הוסק Indexed מ־HTTP / sitemap.

| URL | סטטוס | תאריך בדיקה |
| --- | --- | --- |
| `/` | **Indexed** | 2026-11-02 ~14:03 |
| `/rsvp` | **Indexed** | 2026-11-02 ~14:04 |
| `/rsvp/chatuna` | **Unknown / לא באינדקס** | 2026-11-02 ~14:05 |
| `/rsvp/whatsapp` | **Indexed** | 2026-11-02 ~14:06 |
| `/seating-explained` | **Indexed** | 2026-11-02 ~14:06 |
| `/invitations` | **Unknown** (לא ב־60 sitemap tracking) | 2026-11-02 ~14:07 |
| `/pricing` | **Indexed** | 2026-11-02 ~14:07 |
| `/wedding-website` | **Indexed** | 2026-11-02 ~14:08 |
| `/credit-gifts` | **Indexed** | 2026-11-02 ~14:09 |
| `/event-management` | **Indexed** | 2026-11-02 ~14:09 |
| `/info/guides/how-to-choose-rsvp-company` | **Indexed** (watchlist אוק׳) | 2026-11-02 ~14:10 |
| `/info/guides/wedding-planning` | **Indexed** (watchlist אוק׳) | 2026-11-02 ~14:11 |
| `/info/guides/seating-plan` | **Indexed** (watchlist אוק׳) | 2026-11-02 ~14:11 |
| `/info/guides/bit-paybox-wedding-invitation` | **Indexed** (watchlist אוק׳) | 2026-11-02 ~14:12 |
| `/info/guides/how-phone-rsvp-works` | **Unknown** (שלב ג׳ חדש) | 2026-11-02 ~14:12 |
| `/info/guides/whatsapp-vs-sms-rsvp` | **Indexed** (watchlist אוק׳) | 2026-11-02 ~14:13 |
| `/rsvp/bar-bat-mitzvah` | **Unknown** (watchlist אוק׳) | 2026-11-02 ~14:13 |
| `/invitations/chatuna` | **Indexed** | 2026-11-02 ~14:14 |
| `/info/guides/personal-rsvp-link` | **Unknown** (שלב ג׳ חדש) | 2026-11-02 ~14:14 |
| `/info/guides/wedding-website-guide` | **Unknown** (שלב ג׳ חדש) | 2026-11-02 ~14:15 |

**סיכום בדיקות:** 20 כתובות · 14 Indexed · 6 Unknown.  
**לא נבדקו היום:** יתר ה־60 (כולל מדריכי שלב ג׳ נוספים ו־watchlist שנותר).

### 3.1 מעקב 60 כתובות
קובץ: `url-tracking-baseline-2026-11-02.csv`

| סטטוס / בסיס אימות | מספר URL |
| --- | ---: |
| סה״כ בשורות | **60** |
| Indexed מאושר ב־URL Inspection היום | **14** |
| Unknown מאושר ב־URL Inspection היום | **5** (בתוך 60) |
| יש נתוני Performance 28d (לא הוכחת Indexed) | **32** |
| Watchlist אוק׳ שנבדק היום | 8 (5 Indexed · 3 Unknown: chatuna, bar-bat-mitzvah + …) |
| מדריכי שלב ג׳ שנבדקו היום | 3 — **כולם Unknown** |

---

## 4) מעקב 152 מילות מפתח

קובץ: `keyword-tracking-baseline-2026-11-02.csv`  
**בסיס:** התאמות מול ייצוא שאילתות מובילות (לא כלל השאילתות).

| מדד | ערך |
| --- | ---: |
| שורות במפה | 152 |
| התאמה מדויקת לייצוא GSC | **12** |
| Commercial priority = high | 80 |
| High עם שורת GSC | 7 |

### חשיפה שאינה מותג — ביטויים עם נתונים (28d)

| שאילתה | קליקים | הופעות | מיקום ממוצע |
| --- | ---: | ---: | ---: |
| אישורי הגעה | 3 | 40 | 28.1 |
| אישורי הגעה לחתונה | 4 | 33 | 38.3 |
| אישורי הגעה לאירועים | 0 | 10 | 29.9 |
| אישורי הגעה בוואטסאפ | 0 | 8 | 24.3 |
| הזמנות דיגיטליות לחתונה | 0 | 7 | 18.7 |
| סידורי הושבה לחתונה | 0 | 5 | 29.8 |
| כמה עולה אישורי הגעה לחתונה | 0 | 4 | 11.3 |

---

## 5) מנועי AI

| מקור | מצב |
| --- | --- |
| GSC AI / Generative results | באנר נצפה; **אין ייצוא מספרי רשמי** |
| Bing AI Performance | חסום — **Not verified** |
| 30 שאלות ניטור | גיליון מוכן; **ריצות = 0** (לא הומצאו תוצאות) |

קובץ: `ai-monitor-questions-baseline-2026-11-02.csv`.  
ריצת AI #1 מתוכננת ל־**T1 2026-11-10**.

---

## 6) לוח מעקב חוזר

| נקודה | תאריך | סטטוס | מה לבצע |
| --- | --- | --- | --- |
| **T0** | 2026-11-02 | בוצע חלקית | Sitemap 60 הוגש; 20 URL Inspection; Bing עדיין לא מאומת |
| **T1** | **2026-11-10** | מתוזמן | השלמת Inspection; AI pass #1; Bing אחרי אימות |
| **T2** | **2026-12-02** | מתוזמן | השוואת 30 יום |
| **T3** | **2027-02-02** | מתוזמן | דוח 90 יום |

| מדד | T0 2026-11-02 | T1 | T2 | T3 |
| --- | --- | --- | --- | --- |
| Sitemap URLs (חי) | **60** |  |  |  |
| GSC Discovered (sitemap) | **60** |  |  |  |
| GSC Indexed (aggregate Pages) | **8** (סטאלה 23.10) |  |  |  |
| URL Inspection Indexed confirmed | **14** / 20 checked |  |  |  |
| Impressions 28d | **1,012** |  |  |  |
| Clicks 28d | **173** |  |  |  |
| Brand / Non-brand clicks 28d | **118 / 11** (top queries) |  |  |  |
| Bing sitemap | **Not verified** — לא הוגש |  |  |  |
| AI monitor pass | לא רץ |  |  |  |

---

## 7) פעולות שנותרו

1. **בעלים עכשיו:** בטאב Google OAuth → `invistimo9@gmail.com` → המשך → אישור ל־Bing.
2. אחרי אימות: הגשת sitemap ב־Bing + בדיקת AI Performance (יבוצע בסשן המשך).
3. **T1:** השלמת URL Inspection ל־watchlist/מדריכים שנותרו; ריענון דוח Pages אם התעדכן.

---

## 8) מה לא נעשה (כמבוקש)

- לא שונה קוד / תוכן / מחירים / URL / עיצוב  
- לא בוצע Merge או Deploy  
- לא נעקף 2FA  
- לא הומצאו תוצאות AI או Indexed  
- לא סומן Bing כמאומת / sitemap Bing כהוגש  

---

## קבצים

| קובץ | תוכן |
| --- | --- |
| `status-report-2026-11-02.md` | דוח זה |
| `url-tracking-baseline-2026-11-02.csv` | 60 URL + סטטוסי Inspection |
| `keyword-tracking-baseline-2026-11-02.csv` | 152 KW + התאמות GSC |
| `ai-monitor-questions-baseline-2026-11-02.csv` | 30 שאלות (ריצה ממתינה) |
| `baseline-summary-2026-11-02.json` | סיכום מכונה |
| `exports/gsc-url-inspection-2026-11-02.csv` | 20 בדיקות Inspection |
| `exports/*` | ייצואי GSC גולמיים |
