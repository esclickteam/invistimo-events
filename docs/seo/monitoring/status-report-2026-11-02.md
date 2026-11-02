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
| GSC Sitemaps | הוגש קודם: `https://www.invistimo.com/sitemap.xml` · סטטוס **הצלחה** · נקרא לאחרונה **27.10.2026** · **42** דפים שהתגלו · **אין שגיאת קריאה** |
| הגשה מחדש היום | **לא הושלמה** — שדה הקלט ב־GSC לא קיבל טקסט בסשן האוטומציה (כפתור «שלח» נשאר כבוי). ההגשה הקיימת נשארה Success |
| פערי גילוי | Live 60 מול GSC Discovered 42 ⇒ **פער ~18 URL** (תואם בערך ל־18 מדריכי שלב ג׳) |
| Coverage (Pages, עדכון אחרון 23.10.2026) | Indexed **8** · Not indexed **53** (Redirect 4, 404 3, Alt canonical 1, Crawled–not indexed 40, Discovered–not indexed 5) · Validation Passed |
| Performance 28d (תרשים) | קליקים **173** · הופעות **1,012** · CTR **17.1%** · מיקום ממוצע **17.0** |
| Performance 3mo (תרשים) | קליקים **607** · הופעות **1,811** · CTR **33.5%** · מיקום ממוצע **12.3** |
| מותג מול לא־מותג (ייצוא שאילתות מובילות) | 28d: מותג 118/211 · לא־מותג 11/446 · 3mo: מותג 370/520 · לא־מותג 11/546 |
| Bing Webmaster | מחובר כ־`bizuply@outlook.com` · הנכס `https://www.invistimo.com/` **נוסף** (2 Nov 2026) · סטטוס **Not verified** · הגשת sitemap / Index / AI **חסומים עד אימות** |
| AI Performance רשמי | GSC: באנר Generative AI Search נצפה; **אין מספרי AI Performance רשמיים לייצוא**. Bing AI: לא נגיש עד אימות הנכס |

---

## 1) Google Search Console — מה בוצע בפועל

### 1.1 Sitemap
- נכנסנו ל־**Sitemaps** בנכס `sc-domain:invistimo.com`.
- אומתה הגשה קיימת: `https://www.invistimo.com/sitemap.xml`.
- סטטוס: **הצלחה** · Last read: **27 באוק׳ 2026** · Discovered pages: **42** · Videos: 0.
- ניסיון להזין מחדש `sitemap.xml` / לרענן הגשה **נכשל טכנית** (פוקוס קלט לא נקלט באוטומציית שולחן העבודה; Ask Gemini side panel הפריע).
- **אין שגיאת קריאה** על ההגשה הקיימת.

**פעולה מומלצת לבעלים (דקה אחת):** ב־GSC → Sitemaps → להזין `sitemap.xml` → שלח, כדי לכפות קריאה מחדש אחרי העלייה ל־60 URL.

### 1.2 Coverage / Indexing
מקור: UI Pages + ייצוא `exports/gsc-coverage-2026-11-02.xlsx` (תרשים וסיבות; **ללא רשימת URL פרטנית** בקובץ).

| מדד | ערך |
| --- | ---: |
| Indexed | 8 |
| Not indexed | 53 |
| Crawled – currently not indexed | 40 |
| Discovered – currently not indexed | 5 |
| Redirect | 4 |
| Not found (404) | 3 |
| Alternate page with proper canonical | 1 |

**חשוב:** בדרילדאון ל־Crawled, עמוד 1 הציג דוגמאות של `/_next/static/...` (יוני–יולי 2026) — **לא** את 20 עמודי התוכן מה־watchlist. לא הוסקה מסקנה ש־20 העמודים עדיין ב־Crawled רק מהדוגמאות בעמוד 1. **URL Inspection פר־URL לא הושלם לכל 60** בסשן זה.

### 1.3 Performance — ייצוא שבוצע
קבצים תחת `docs/seo/monitoring/exports/`:

| ייצוא | קובץ |
| --- | --- |
| Performance 28d (zip + CSV) | `gsc-performance-28d-2026-11-02*` |
| Performance 3mo (zip + CSV) | `gsc-performance-3mo-2026-11-02*` |
| Queries 28d / 3mo | `gsc-queries-*-2026-11-02.csv` |
| Pages 28d / 3mo | `gsc-pages-*-2026-11-02.csv` |
| Coverage xlsx | `gsc-coverage-2026-11-02.xlsx` |

סיכום תרשים (מקור האמת למספרים הכוללים):

| חלון | קליקים | הופעות | CTR | מיקום ממוצע |
| --- | ---: | ---: | ---: | ---: |
| 28 ימים | 173 | 1,012 | 17.1% | 17.0 |
| 3 חודשים | 607 | 1,811 | 33.5% | 12.3 |

### 1.4 מותג מול לא־מותג
הגדרת מותג: השאילתה מכילה `invistimo` / `אינוויסטימו` / `אינבסטימו` / `invist` (ללא תלות ברישיות).  
מקור: ייצוא שאילתות מובילות (לא כל היקום).

| חלון | מותג קליקים/הופעות | לא־מותג קליקים/הופעות | מיקום משוקלל מותג | מיקום משוקלל לא־מותג |
| --- | --- | --- | ---: | ---: |
| 28d | 118 / 211 | 11 / 446 | ~1.0 | ~32 |
| 3mo | 370 / 520 | 11 / 546 | ~1.1 | ~32.1 |

**מסקנה:** החשיפה והקליקים נשלטים ע״י מותג. לא־מותג מביא הופעות אבל CTR/מיקום חלשים — הזדמנות מסחרית עיקרית.

---

## 2) Bing Webmaster Tools

### עדכון סשן חי (2026-11-02 ~13:51)
- התחברות Microsoft הצליחה עם `bizuply@outlook.com` (סשן קיים, ללא עקיפת 2FA).
- מסלול **Add manually** הושלם בפועל (Tab→Enter אחרי הזנת URL): הנכס `https://www.invistimo.com/` מופיע בטבלת האתרים · Modified «Just now» / «2 minutes ago» · סטטוס **Not verified**.
- נבחר **Skip & verify later** במודאל האימות (ללא שינוי קוד אתר / meta / XML upload).
- ניסיון **Import from GSC**: הגיע ל־OAuth Google עם `invistimo9@gmail.com`; ניסיון קודם הסתיים ב־`error=access_denied` (לחיצה על ביטול/חסימת UI). ייבוא GSC **לא הושלם**.
- ניווט ל־`/webmasters/sitemaps?siteUrl=...` מחזיר למסך Welcome + «Verification pending» — **אין גישה ל־Sitemaps / Index / AI עד אימות**.

| בדיקה | תוצאה |
| --- | --- |
| פתיחת `bing.com/webmasters` | בוצעה |
| התחברות לחשבון INVISTIMO | **כן** — `bizuply@outlook.com` (אווטאר BE) |
| הוספת נכס | **כן** — `https://www.invistimo.com/` (2 Nov 2026) |
| אימות נכס | **לא** — Not verified |
| הגשת sitemap | **לא** — חסום עד אימות |
| Index / Crawl errors | לא נגיש |
| AI Performance | לא נגיש |

**נדרש מהבעלים (2–3 דקות, ללא שינוי קוד אתר):** במסך Bing Welcome → **Import** מ־GSC → Continue → לבחור חשבון Google עם גישה ל־`sc-domain:invistimo.com` (נסה `invistimo9@gmail.com`) → **המשך** (לא ביטול) → אישור View-Only. חלופה: Verify now → DNS CNAME (אם אפשר ב־DNS בלי שינוי קוד). לאחר אימות: Sitemaps → `https://www.invistimo.com/sitemap.xml` + Index / AI Performance.

---

## 3) ניטור 60 כתובות

קובץ: `url-tracking-baseline-2026-11-02.csv`

| סטטוס / בסיס אימות | מספר URL |
| --- | ---: |
| סה״כ בשורות | **60** |
| יש נתוני Performance 28d (`impressions_in_gsc_performance_28d_not_proof_of_indexed`) | **32** |
| לא אומת ב־URL Inspection (`not_verified_url_inspection`) | **28** |
| Watchlist אוק׳ 2026 (Crawled–not indexed היסטורי) | **20** |
| מתוכם עם הופעות 28d | **13** |
| מדריכי שלב ג׳ חדשים | **18** |
| מתוכם עם הופעות 28d | **0** |
| Indexed מאושר ב־URL Inspection בסשן זה | **0** |

**כלל דיווח:** הופעות / HTTP 200 / הופעה ב־sitemap **אינם** אישור Indexed. רק URL Inspection / דוח Pages פר־URL.

### 3.1 20 עמודי watchlist (אוק׳ 2026)
13/20 מופיעים בייצוא Performance 28d (למשל `how-to-choose-rsvp-company`, `wedding-planning`, `send-digital-invitation`, `wedding-seating-arrangements`).  
7/20 ללא שורת Performance 28d:  
`bit-paybox-wedding-invitation`, `seating-plan`, `wedding-alcohol-calculator`, `whatsapp-vs-sms-rsvp`, `/rsvp/bar-bat-mitzvah`, `/rsvp/brit-brita`, `/rsvp/chatuna`.  
`/rsvp/hina` כן עם הופעות (2).

**סטטוס Indexed פר־URL:** לא אומת מחדש ב־URL Inspection היום.

### 3.2 18 מדריכים חדשים (שלב ג׳)
כולם ב־sitemap החי; כולם מסומנים `not_verified_url_inspection`; **אף אחד** לא הופיע בייצוא Pages/Performance 28d. צפוי latency סריקה/אינדוקס — לבדיקה ב־**T1 2026-11-10**.

---

## 4) מעקב 152 מילות מפתח

קובץ: `keyword-tracking-baseline-2026-11-02.csv`

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

**עדיפויות מסחריות:** אישורי הגעה לחתונה / וואטסאפ / סידורי הושבה / הזמנות דיגיטליות — כבר עם הופעות אך מיקום עמוק ו־CTR נמוך. **ניהול מוזמנים** — אין שורה בייצוא השאילתות המובילות.

**שינוי מול בסיס הקודם (לפני ייצוא):** כל עמודות GSC היו ריקות / observation ריק → כעת 12 שאילתות עם `data_basis=gsc_export_verified` ומדדי 28d/3mo.

---

## 5) מנועי AI

| מקור | מצב |
| --- | --- |
| GSC AI / Generative results | באנר נצפה; **אין ייצוא מספרי רשמי** בסשן |
| Bing AI Performance | חסום — נכס נוסף אך **Not verified** |
| 30 שאלות ניטור | גיליון מוכן; **ריצות מנוע ידניות = 0** בסשן זה (לא הומצאו תוצאות) |

קובץ: `ai-monitor-questions-baseline-2026-11-02.csv` — עמודות ריקות בכוונה עד ריצה מתועדת.  
**ריצת AI #1 מתוכננת ל־T1 2026-11-10** (Gemini / ChatGPT / Copilot / Perplexity) עם תיעוד תאריך·שאלה·מנוע·אזכור·URL.

---

## 6) לוח מעקב חוזר

| נקודה | תאריך | סטטוס | מה לבצע |
| --- | --- | --- | --- |
| **T0** | 2026-11-02 | בוצע חלקית (דוח זה) | ייצואי GSC, עדכון CSV, תיעוד פערים |
| **T1** | **2026-11-10** | מתוזמן — לא לבצע לפני הזמן | URL Inspection ל־20+מדגם 18; ריענון sitemap; AI pass #1; Bing אחרי אימות נכס |
| **T2** | **2026-12-02** | מתוזמן | השוואת 30 יום ל־T0 |
| **T3** | **2027-02-02** | מתוזמן | דוח 90 יום |

### טבלת ביצועים

| מדד | T0 2026-11-02 | T1 2026-11-10 | T2 2026-12-02 | T3 2027-02-02 |
| --- | --- | --- | --- | --- |
| Sitemap URLs (חי) | **60** |  |  |  |
| Guides ב־sitemap | **37** |  |  |  |
| GSC Discovered (sitemap) | **42** |  |  |  |
| GSC Indexed (aggregate) | **8** (נכון ל־23.10) |  |  |  |
| Crawled–not indexed (aggregate) | **40** |  |  |  |
| Impressions 28d | **1,012** |  |  |  |
| Clicks 28d | **173** |  |  |  |
| CTR 28d | **17.1%** |  |  |  |
| Avg position 28d | **17.0** |  |  |  |
| Brand clicks 28d | **118** |  |  |  |
| Non-brand clicks 28d | **11** |  |  |  |
| Bing sitemap status | site added; **Not verified**; sitemap blocked |  |  |  |
| AI monitor pass | לא רץ |  |  |  |

---

## 7) פעולות מומלצות (ללא שינוי קוד)

1. **בעלים:** ריענון ידני של `sitemap.xml` ב־GSC (דקה).
2. **בעלים:** Bing — הנכס כבר נוסף; להשלים **אימות** דרך Import מ־GSC (מומלץ) או DNS CNAME → אז להגיש `sitemap.xml` + לבדוק AI Performance.
3. **T1 (10.11):** URL Inspection ל־20 ה־watchlist + 8–18 מדריכים חדשים; עדכון `gsc_index_status` / `gsc_last_crawl`.
4. להמשיך לדחוף שאילתות לא־מותג עם הופעות (אישורי הגעה / וואטסאפ / הושבה) — בלי שינוי תוכן עד אישור נפרד.
5. ריצת 30 שאלות AI מתועדת ב־T1 — לא לפני כן כ«מדידה רשמית».

---

## 8) מה לא נעשה (כמבוקש)

- לא שונה קוד / תוכן / מחירים / URL / עיצוב  
- לא בוצע Merge או Deploy  
- לא נעקף 2FA / לא נפתחו חשבונות חדשים  
- לא הומצאו תוצאות AI או Indexed  
- לא בוצעו בדיקות T1/T2/T3 לפני מועדן  

---

## קבצים

| קובץ | תוכן |
| --- | --- |
| `status-report-2026-11-02.md` | דוח זה |
| `url-tracking-baseline-2026-11-02.csv` | 60 URL + Performance 28d |
| `keyword-tracking-baseline-2026-11-02.csv` | 152 KW + התאמות GSC |
| `ai-monitor-questions-baseline-2026-11-02.csv` | 30 שאלות (ריצה ממתינה) |
| `baseline-summary-2026-11-02.json` | סיכום מכונה |
| `exports/*` | ייצואי GSC גולמיים |
| `scripts/seo/export-monitoring-baseline.mjs` | מחולל בסיס (קריאה בלבד) |

