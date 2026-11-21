# השוואת שתי התבניות

Commit קוד: `b8784ae2295d2139023fd428dda742920b155936`.

## מה אומת בקוד ובמסד

שאילתה ל־`invite.whatsappqueues` (קריאה בלבד) מצאה שלושה קבצים זהים שנשלחו גם כ־`event_invitation` וגם כ־`rsvp_invitation_media`. דוגמאות שנמדדו עם `sharp`:

| hash של 12 תווים | מידות | פורמט | בתים | נראה בשתי התבניות |
|---|---|---|---|---|
| `164aa7933dcb` | 1080×1920 | png | 661786 | כן |
| `e300fc154342` | 1080×1920 | jpeg | 1336434 | כן |
| `3e13f70a9ed1` | 1080×1920 | png | 1002466 | כן |

הכתובות השמורות הן `res.cloudinary.com`, תיקייה `invistimo/invitations`, בלי `c_limit` ובלי `lpad`.

הרכבת השליחה:

| רכיב | `event_invitation` | `rsvp_invitation_media` |
|---|---|---|
| בחירת תמונה | `preRsvpMedia.invitationOnlyImageUrl` | `headerImageUrl` ואז תמונות תצוגה |
| כותרת בזמן שליחה | `headerForRecipient` שורה 330 | אותה פונקציה |
| גוף | שלושה משתנים | שלושה משתנים בסבב 1 |
| כפתור | אין קריאה ל־`buildUrlButtonComponent` | יש, שורה 449, יעד `https://www.invistimo.com/invite/{{1}}` |
| ספק בקוד | `dialog` כברירת מחדל | אותו קובץ |
| `tap_target_configuration` בקוד | לא קיים במאגר | לא קיים במאגר |

חיפוש `tap_target` ו־`TAP_TARGET` בכל המאגר לא מצא התאמה.

## מה לא אומת

`curl` אל `https://www.invistimo.com/api/admin/whatsapp-header-probe` החזיר `401`. לא נקראו מזהי Meta, קטגוריה חיה, תמונת דוגמה, רכיבי התבנית אצל 360dialog, או `TAP_TARGET_CONFIGURATION` אם הוא שמור רק אצל Meta.

לכן לא הוכח שהכפתור גורם למסגרת. הוכח רק שהוא ההבדל בהרכבה, לצד שם התבנית, ושהקובץ יכול להיות זהה.
