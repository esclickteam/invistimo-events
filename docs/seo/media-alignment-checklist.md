# Checklist — התאמת מדיה לתוכן (PR #382)

עודכן: 2026-10-24 (Asia/Jerusalem). אין Merge/Deploy לפרודקשן.

Preview יציב: https://invistimo-events-git-cursor-premium-ma-aa38ce-esclicks-projects.vercel.app

## אירוע דוגמה

`/try` — החתונה של מאיה ואיתי (12.11.2026, גן ורדים). הזמנה מעוצבת, STD, 10 אורחים פיקטיביים, שולחנות, דשבורד. בלי שליחה חיצונית.

## סרטוני תהליך חדשים

| סרטון | קובץ | שימוש עיקרי |
| --- | --- | --- |
| מסע אורח | `process-rsvp-guest-journey.webm` | `/rsvp`, מדריכי RSVP |
| דשבורד חי | `process-dashboard-live.webm` | `/rsvp`, מעקב |
| פתיחת הזמנה | `process-invitation-open.webm` | `/invitations/chatuna` |
| Save the Date | `process-save-the-date.webm` | `/rsvp/save-the-date` |
| הושבה | `process-seating.webm` | `/seating-explained` |

## מה שונה לפי אזור

| עמוד | שינוי קצר |
| --- | --- |
| `/` | רווח Hero↓; טלפון מציג הזמנה (לא טעינה) |
| `/rsvp` | מסע אורח + דשבורד חי; Hero עם הזמנה טעונה |
| `/invitations/chatuna` | הזמנות מעוצבות + סרטון פתיחה (לא דשבורד) |
| `/rsvp/save-the-date` | סרטון STD + הדמיית הודעה |
| `/rsvp/calls` | השוואת מוקד/IVR/שילוב |
| `/seating-explained` | סרטון שיבוץ מאירוע הדוגמה; רווח Hero↓ |
| `/wedding-website` | נשאר אתר חתונה (מובחן מקישור אישי) |
| `/for/*` | הזמנות לפי סוג אירוע + סרטון אישור |
| 17 מדריכים | וידאו/מדיה לפי נושא (RSVP / STD / הושבה / אתר / מעקב) |
| `/faq`, שירותים | רווחי Hero מצומצמים; מדיה תואמת שירות |

## הבחנות מוצר

- **הזמנה דיגיטלית** = עיצוב שנפתח בקישור אישי  
- **קישור אישי** = token לאורח + אישור הגעה  
- **אתר חתונה** = אתר אירוע מלא (תבניות `/wedding-website`)  
- **Save the Date** = הודעה מוקדמת, לא סבב אישור  
