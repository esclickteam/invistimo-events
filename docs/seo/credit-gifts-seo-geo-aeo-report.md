# דוחות SEO / GEO / AEO — `/credit-gifts`

**תאריך:** 26 באוקטובר 2026 (Asia/Jerusalem)  
**URL:** `https://www.invistimo.com/credit-gifts` (ללא שינוי)  
**סטטוס פריסה:** Preview בלבד — ללא Merge/Deploy ללא אישור.

---

## 1. מחקר כוונות חיפוש (ישראל)

מקורות: צילום SERP/דפי מתחרים פומביים (אוקטובר 2026) — לא דירוג GSC ממוספר.

| כוונה | דוגמאות שאילתה | מתחרים שנצפו | פער שמילאנו |
| --- | --- | --- | --- |
| מסחרי — אשראי | מתנות באשראי לחתונה | RSVP Events, Lunsoul, Diginet, Welcome | Hub אחד עם שקיפות ספק/עמלה |
| מסחרי — אפליקציות | מתנות בביט / פייבוקס | Easy Events, Wedix, Welcome | הדגשת «הצגה בלבד» מול סליקה |
| How-to | קישור פייבוקס / מספר ביט להזמנה | Easy Events guide | מדריך נפרד ב־Invistimo |
| השוואה | bit מול אשראי | RSVP blog, Wedix | טבלת השוואה עובדתית בלי הבטחות שווא |
| סוגי אירוע | בר מצווה / חינה | דפי שירות כלליים | FAQ + קישורים ל־/rsvp/... |

**מסקנה:** המתחרים מדגישים «הכול במקום אחד» ולעיתים עמלות/זיכוי אגרסיביים. Invistimo מבדילה בשקיפות RSVP + PayBox/bit כתצוגה + אי־המצאת אינטגרציות.

---

## 2. מפת מילות מפתח (ללא cannibalization)

| רמה | שאילתה | URL ראשי | H2/אזור |
| --- | --- | --- | --- |
| Primary | מתנות באשראי לחתונה / מתנות לחתונה באשראי | `/credit-gifts` | H1 + FAQ אשראי |
| Secondary | מתנות דיגיטליות / תשלום מתנה / אונליין | `/credit-gifts` | Intro + השוואה |
| Secondary | ביט / פייבוקס לחתונה | `/credit-gifts` | מקטעי שיטות |
| Supporting how-to | קישור פייבוקס / מספר ביט להזמנה | `/info/guides/bit-paybox-wedding-invitation` | מדריך |
| Pricing | חבילות / מחיר תוספת | `/pricing` | CTA בלבד — לא מחירון בעמוד |
| RSVP adjacent | אישורי הגעה לחתונה | `/rsvp/chatuna` | קישורים פנימיים |

נפח/תחרות: `null` עד חיבור GSC/Keyword Planner (`KEYWORD_VOLUME_NOTE`).

---

## 3. דוח SEO — מה יושם / נבדק / חסר

### יושם
- Title + Meta Description לפי הבקשה.
- Canonical עצמי דרך `pageMetadata`.
- H1 יחיד; H2/H3 היררכיים.
- FAQ גלוי (28 שאלות) + `FAQPage` JSON-LD.
- `Service` + `Organization` + `BreadcrumbList` + `WebPage`.
- Open Graph + תמונת hero.
- קישורים פנימיים ל־RSVP, הזמנות, מחירים, הושבה, מדריכים, דמו.
- תשובה ישירה (`PAGE_ANSWER` / `answers.ts`) בראש התוכן.
- Alt לתמונות; RTL; תוכן סריק ב־HTML (לא מוסתר).
- Keyword map + clusters מעודכנים.

### נבדק (בפריסה זו)
- מבנה metadata/schema בקוד.
- התאמה לטענות מוצר (אין bank fields פעילים כשירות).
- היעדר פרטי תשלום אמיתיים בדמו.

### חסר / בהמשך אחרי Deploy
- מדידת GSC בפועל (חשיפות, CTR, שאילתות).
- Lighthouse על URL פרודקשן אחרי פרסום.
- אימות rich results ב־Google (אין הבטחת FAQ rich result).

### מדידה מומלצת (Search Console + Analytics)
1. סינון דף: `/credit-gifts`.
2. מדדים: חשיפות, קליקים, CTR, מיקום ממוצע, כניסות אורגניות.
3. שאילתות: רשימת ה־KEYWORD_MAP לעמוד זה.
4. המרות: קליקי CTA ל־`/pricing`, `/try`, `/contact` (אירועי אנליטיקה קיימים).
5. **לא** לטעון הופעה בתשובות AI בלי מקור מדידה אמין.

---

## 4. דוח GEO (Generative Engine Optimization)

### יושם
- משפטי תשובה עצמאיים בכל FAQ (פותחים בתשובה ישירה).
- הבחנה מפורשת: מי סולק / מי רק מציג קישור.
- טבלת השוואה עובדתית לקריאה במנועי סיכום.
- עקביות מותג Invistimo + ספק RSVP בכל העמוד והמדריך.
- `llms`/answers path: `/credit-gifts` ב־`PAGE_ANSWERS`.
- שאלות לניטור AI נוספו ל־`AI_MONITOR_QUESTIONS`.

### נבדק
- אין הבטחות «דוח אחד לכל הערוצים».
- אין עמלות PayBox/bit שלא אומתו רשמית.

### חסר
- מדידת ציטוטים ב־AI overviews / chatbots (אין כלי מדידה אמין כרגע).

---

## 5. דוח AEO (Answer Engine Optimization)

### יושם
- תשובה ישירה גלויה מעל הקיפול השני.
- FAQ עם `details/summary` נגיש + Schema תואם לטקסט הגלוי.
- Speakable selectors ב־WebPage (h1, intro, faq) — ללא תוכן מוסתר.
- מדריך how-to נפרד לשאלות «איך מוסיפים…».

### נבדק
- כל FAQ ב־JSON-LD קיים גם ב־DOM.
- אין Schema מלאכותי לשירותים שלא קיימים (העברה בנקאית מסומנת כדורשת פיתוח בתוכן).

### חסר
- אימות תצוגת FAQ ב־SERP (תלוי גוגל; לא מובטח).

---

## 6. קניבליזציה

| סיכון | טיפול |
| --- | --- |
| `/pricing` vs מתנות | מחיר רק ב־CTA; פירוט שירות ב־`/credit-gifts` |
| מדריך vs עמוד שירות | מדריך = how-to bit/PayBox; שירות = סקירה מלאה + אשראי |
| `/rsvp/*` | קישורים תומכים; לא יעד ראשי ל«מתנות באשראי» |

---

## 7. ביצועים ונגישות (תוכנית בדיקה)

ראה גם תוצאות PASS/FAIL בסיכום ה־PR אחרי בדיקת דפדפן מקומית.
