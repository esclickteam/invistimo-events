# שינויי פרודקשן 1.11.2026–16.11.2026

הזמנים בשעון ישראל (UTC+2).

## מה נקרא

נקראו רשומות Deployment ש־Vercel כתב ל־GitHub:

```bash
gh api --paginate repos/esclickteam/invistimo-events/deployments?per_page=100
gh api repos/esclickteam/invistimo-events/deployments/<id>/statuses
git log --first-parent --since=2026-10-31T22:00:00Z --until=2026-11-16T22:00:00Z origin/main
```

תוצאה: 73 ניסיונות Production, אחד לכל commit של `main` בחלון. 67 הצליחו. 6 נכשלו ולא שירתו משתמשים: `6aed794` (#473), `addcaaa` (#492), `9cd818e` (#532), `690b85e` (#533), `cf13f20` (#534), `f635e9f` (#538).

אין ברשומות האלה deploy שני של SHA ישן.

## מה לא נקרא

`vercel whoami` החזיר Logged out. לא נקראו מסך Deployments של Vercel, שיוך `www.invistimo.com`, Promote, Rollback, Activity Log, או היסטוריית משתני סביבה. הצלחת Build ב־GitHub אינה הוכחה איזה Deployment החזיק את הדומיין בכל דקה.

לא נקראו יומן Cloudinary, היסטוריית תבניות 360dialog, או גרסת אפליקציית WhatsApp. לא אומת שהשירותים האלה לא השתנו.

## שינויים שנגעו בתמונה או בשליחה

| הופעל לפי סטטוס Vercel ב־GitHub | Commit | תוצאה | מה נכנס לקוד |
|---|---|---|---|
| 1.11 14:54 | `6aed794` #473 | failure | טלפונים בינלאומיים. לא עלה |
| 1.11 15:43 | `353f69f` #475 | success | ביטול SMS fallback ל־Save the Date |
| 16.11 11:34 | `895c2a3` #545 | success | `sharp` 0.34.5. העלאה חדשה בלי `lpad` |
| 16.11 11:58 | `c710749` #546 | success | ייצוא קנבס לפי גבולות העיצוב |
| 16.11 12:52 | `1dd4ee0` #548 | success | שליחת קובץ מקורי כשהוא כבר תקין |
| 16.11 18:22 | `6fd44b9` #550 | success | בחירת קישור או מזהה מדיה, כבויה כברירת מחדל |
| 16.11 19:07 | `ade07db` #551 | success | כלי בדיקה למנהל |
| 16.11 20:33 | `b8784ae` #553 | success | כיבוי כלי הבדיקה. זה ה־SHA שנבדק כאן |

#552 ו־#554 לא נמצאים ב־`main`.

כפתור ה־URL ב־`sendRsvpTemplateMedia.ts` קיים בקובץ מאז `cb6f09c4` ב־8.10.2026, לפני החלון הזה.

שאר הפריסות שהצליחו הן אתר, SEO, הושבה, בלוג ופונטים. הן לא משנות את `assembleTemplate`.
