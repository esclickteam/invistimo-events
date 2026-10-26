# דוח מסכם מלא — אתר ציבורי Invistimo (לפני התחברות)

**ענף:** `cursor/public-video-policy-b403` · **PR:** #450  
**תאריך עדכון:** 27 באוקטובר 2026 (Asia/Jerusalem)  
**מגבלות:** ללא Merge/Deploy · ללא שינוי מסכים אחרי login · צילומים מדמו מבודד `/try` בלבד

## סיכום ביצוע עד כה

| תחום | סטטוס |
| --- | --- |
| מדיניות סרטונים אחידה (PublicAutoplayVideo) | הושלם |
| Visual QA דסקטופ לסרטונים | PASS |
| Visual QA מובייל (~390) | PARTIAL — `/` ו־`/rsvp` נבדקו; טאבלט לא הושלם |
| צילומי מערכת חדשים מדמו מבודד | 10 צילומים + 3 סרטוני webm |
| החלפת תמונות ממוחזרות במדריכים | 16 החלפות ראשוניות |
| סרטונים ייעודיים לכל מדריך | חלקי — נוספו ל־seating-plan ול־guests-who-dont-reply |
| Before/After gallery | צילומים ב־`/opt/cursor/artifacts/screenshots/public-audit` + `public/images/marketing-captures/demo` |

### ממצאי Visual QA מובייל (עדכון)

| עמוד | מובייל | הערה |
| --- | --- | --- |
| `/` | PARTIAL→תוקן | חסר היה פקד השהיה ליד Hero — נוסף כפתור «השהיה/ניגון» מחוץ למסגרת הטלפון |
| `/rsvp` | PASS | השהיה נראית, ללא overflow/חיתוך |
| `/seating-explained`, `/event-management` | PASS בדסקטופ | מובייל מלא לכל העמודים — עדיין פתוח |
| טאבלט 768 | NOT VERIFIED | לא הושלם |

### מלאי מדיה (הצלבה)

נותרו פערי וידאו ידועים: bar/bat, brit, calls, credit-gifts, alcohol, whatsapp-vs-sms, bit-paybox, ורוב המדריכים בלי סרטון.  
`hina` עדיין שואל חלק מצילומי טלפון מ־chatuna — דורש צילומי חינה ייעודיים.  
אין תוויות SEO/AEO/GEO גלויות (רק הערות קוד).

## מקורות צילום חדשים (דמו מבודד)

| נכס | שימוש |
| --- | --- |
| `/images/marketing-captures/demo/desktop-dashboard-guests.webp` | דשבורד מוזמנים |
| `/images/marketing-captures/demo/desktop-seating.webp` | מפת הושבה |
| `/images/marketing-captures/demo/desktop-event-management.webp` | ניהול אירוע |
| `/images/marketing-captures/demo/desktop-check-in.webp` | כניסה לאירוע |
| `/images/marketing-captures/demo/desktop-messages.webp` | הודעות |
| `mobile-*` מקבילים | מובייל |
| `/videos/marketing-captures/demo-*.webm` | לולאות מוצר קצרות |

---

## טבלת כל העמודים והמדריכים

### ליבה (CORE_PUBLIC_ROUTES)

| URL | שם | תמונות (מקור) | סרטונים | לא רלוונטי | כפול | ישן | מערכת לעדכון | סרטון חסר | תוקן | חסר | סטטוס |
| --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | בית | ~8 | 2 | — | invite מותג OK | — | — | — | מדיניות contain/LCP | מובייל QA מלא | PARTIAL |
| `/rsvp` | אישורי הגעה | כמה | 2 | — | — | — | — | — | PublicAutoplay | מובייל QA | PARTIAL |
| `/rsvp/chatuna` | RSVP חתונה | רבות | 4 | — | משותף ל־hina בעבר | — | — | — | contain | מובייל QA | PARTIAL |
| `/rsvp/hina` | RSVP חינה | רבות | 1 | חלק מצילומי chatuna | dashboard הוחלף | — | רצוי צילומי חינה ייעודיים | סרטון חינה ייעודי | dashboard ייחודי | צילומי חינה | PARTIAL |
| `/rsvp/bar-bat-mitzvah` | בר/בת מצווה | ייעודיים | 0 | — | — | — | — | סרטון מוצר | — | סרטון | FAIL media |
| `/rsvp/brit-brita` | ברית/בריתה | ייעודיים | 0 | — | — | — | — | סרטון מוצר | — | סרטון | FAIL media |
| `/rsvp/whatsapp` | WhatsApp RSVP | כמה | 1–3 | — | — | — | — | — | QuietVideo→shared | מובייל QA | PARTIAL |
| `/rsvp/calls` | שיחות | אודיו/UI | 0 וידאו | — | — | — | — | סרטון שיחה | — | סרטון | FAIL media |
| `/rsvp/save-the-date` | Save the Date | כמה | 1 | — | מותג STD | — | — | — | PublicAutoplay | — | PARTIAL |
| `/invitations/chatuna` | הזמנות | רבות | 2 | — | journey משותף עם בית | — | — | — | PublicAutoplay | ייחודיות מול בית | PARTIAL |
| `/seating-explained` | הושבה | רבות | 1 | — | — | — | מפת seating ישנה הוחלפה חלקית | — | SeatingDemoVideo | מובייל | PARTIAL |
| `/event-management` | ניהול אירוע | רבות | 4 | — | — | — | — | — | unmuted→policy | מובייל | PARTIAL |
| `/pricing` | מחירון | כמה | 0 | — | — | — | — | אופציונלי | — | — | NOT VERIFIED |
| `/faq` | שאלות | 0–מעט | 0 | — | — | — | — | — | — | — | NOT VERIFIED |
| `/info/about` | אודות | 0–מעט | 0 | — | — | — | — | — | — | — | NOT VERIFIED |
| `/info/guides` | אינדקס מדריכים | — | 0 | — | — | — | — | — | — | — | NOT VERIFIED |
| `/contact` | יצירת קשר | עיצוב | 0 | — | — | — | — | — | — | — | NOT VERIFIED |
| `/credit-gifts` | מתנות | כמה | 0 | — | hero משותף עם bit guide | — | — | סרטון מתנה | — | סרטון | FAIL media |
| `/wedding-website` | אתר חתונה | רבות | 1 | — | — | — | — | — | aspect fix | — | PARTIAL |
| `/terms` | תקנון | 0 | 0 | — | — | — | — | — | — | — | PASS (טקסט) |
| `/privacy` | פרטיות | 0 | 0 | — | — | — | — | — | — | — | PASS (טקסט) |
| `/accessibility` | נגישות | 0 | 0 | — | — | — | — | — | — | — | PASS (טקסט) |

### שירות נוסף

| URL | שם | הערות | סטטוס |
| --- | --- | --- | --- |
| `/services/alcohol-management` | ניהול אלכוהול | תמונות בקבוקים עם ATTRIBUTIONS — לא צילום מוצר Invistimo | FAIL media / NOT VERIFIED UX |

### מדריכים (`/info/guides/*`)

| URL | סרטונים לפני | אחרי | תמונות כפולות שטופלו | סטטוס |
| --- | --- | --- | --- | --- |
| `/info/guides/cost-rsvp-wedding` | 0 | 0 | dashboard→דמו | PARTIAL |
| `/info/guides/when-to-send-rsvp` | 0 | 0 | invite מותג | PARTIAL |
| `/info/guides/send-digital-invitation` | 2 | 2 | dashboard→דמו | PARTIAL |
| `/info/guides/bit-paybox-wedding-invitation` | 0 | 0 | hero משותף credit | FAIL media |
| `/info/guides/seating-plan` | 0 | **+1** demo-seating | seating-map→דמו | PARTIAL |
| `/info/guides/save-the-date-vs-invitation` | 1 | 1 | — | PARTIAL |
| `/info/guides/guest-list` | 0 | 0 | seating→דמו | PARTIAL |
| `/info/guides/guests-who-dont-reply` | 0 | **+1** demo-guests | dashboard→דמו+וידאו | PARTIAL |
| `/info/guides/wedding-planning` | 0 | 0 | hero-reception פנים־עמוד | PARTIAL |
| `/info/guides/event-management-vs-production` | 0 | 0 | dashboard+hall→דמו | PARTIAL |
| `/info/guides/wedding-vendors-contracts` | 0 | 0 | — | NOT VERIFIED |
| `/info/guides/wedding-venue-guest-guarantee` | 0 | 0 | dashboard→דמו | PARTIAL |
| `/info/guides/wedding-seating-arrangements` | 0 | 0 | seating→דמו | PARTIAL |
| `/info/guides/wedding-alcohol-calculator` | 0 | 0 | בקבוקים חיצוניים | FAIL media |
| `/info/guides/whatsapp-vs-sms-rsvp` | 0 | 0 | — | FAIL media |
| `/info/guides/how-to-choose-rsvp-company` | 0 | 0 | dashboard+seating→דמו | PARTIAL |
| `/info/guides/table-number-message` | 0 | 0 | try-seating→דמו | PARTIAL |
| `/info/guides/event-day-checklist` | 0 | 0 | guests/seating→דמו | PARTIAL |

---

## ממצאים חוצי־אתר

1. **מיחזור תמונות:** `invite-wedding-mia-alon.webp` עדיין ב־13 מופעים — נכס מותג דמו; נשאר במכוון בהזמנות/STD.  
2. **צילומי אווירה** (`hero-reception`, `venue`, `hall-tables`) עדיין חוזרים במדריכי תכנון — לא צילום מוצר; דורשים החלפה או צמצום.  
3. **עמודי אירוע־סוג** (בר מצווה, ברית, שיחות, מתנות, אלכוהול) ללא סרטון מוצר ייעודי.  
4. **LCP Hero:** poster ראשון + טעינת webm אחרי idle — נשמר; נדרש אימות מובייל שאין «פוסטר תקוע» יותר מדי זמן.  
5. **תוויות SEO גלויות:** טופלו בעבר (ראה `docs/seo/public-internal-labels-audit.md`); בדיקת רגרסיה ב־`test:seo`.

## Before / After

| לפני | אחרי |
| --- | --- |
| `object-cover` + Play גדול / ללא autoplay אחיד | `PublicAutoplayVideo` contain + השהיה/הגדלה |
| `dashboard-guests.jpg` של chatuna ב־5+ מדריכים | צילומי דמו מבודדים לפי נושא |
| מדריך seating-plan בלי סרטון | + `demo-seating-map.webm` |
| מדריך guests-who-dont-reply בלי סרטון | + `demo-guests-dashboard.webm` |

קבצי ראיות: `public/images/marketing-captures/demo/*`, `public/videos/marketing-captures/*`, `docs/seo/public-video-policy/MEDIA-INVENTORY.json`

## מה נשאר להשלמת המשימה המקורית

1. Visual QA מובייל+טאבלט מלא לכל עמודי וידאו (PASS/FAIL מתועד).  
2. צילומים/סרטונים ייעודיים ל: bar-bat-mitzvah, brit-brita, calls, credit-gifts, alcohol, whatsapp-vs-sms, bit-paybox.  
3. פירוק סופי של `hero-reception` / `hall-tables` / `venue` בין מדריכי תכנון.  
4. צילומי חינה ייעודיים במקום נכסי chatuna שנותרו.  
5. גלריית Before/After מפורסמת ב־PR עם צילומי מסך ציבוריים.  
6. אישור מפורש לפני Merge/Deploy.
