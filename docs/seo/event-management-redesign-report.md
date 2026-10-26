# דוח שדרוג עמוד ניהול והפקת אירוע

**URL:** `/event-management`  
**סטטוס:** מוכן ל־Preview → Deploy לפרודקשן לפי בקשת הלקוח.

## SEO Title
מערכת לניהול והפקת אירועים עצמאית | Invistimo

## Meta Description
נהלו את האירוע במקום אחד עם Invistimo: משימות, ספקים, תקציב, תשלומים ולוח זמנים. מערכת עצמאית עם אפשרות לליווי מקצועי וניהול ביום האירוע.

## GEO/AEO
- תשובות ישירות בתוך התוכן הגלוי (בלי תוויות SEO/AEO לגולש)
- הוסר AnswerFirst chrome (כבר no-op באתר)
- Schema: Organization, BreadcrumbList, SoftwareApplication, Service, FAQPage, WebPage
- OG image: צילום דשבורד אמיתי (`hero-dashboard.webp`)

## תמונות שהוסרו / הוחלפו
| ישן | סיבה | חדש |
|---|---|---|
| hero-reception.jpg כרקע מלא | טקסט נבלע, אווירה לא מוצר | Hero בהיר + דשבורד אמיתי |
| dashboard-guests.jpg כהדגמת הפקה | RSVP בלבד | overview-dashboard.webp |
| sit1.png כלוח בקרה | הושבה, לא דשבורד הפקה | overview / logistics |
| photographer.jpg / meeting / handshake / contract | סטוק לא רלוונטי | מסכי ספקים/תקציב אמיתיים |
| toast / hall-tables כתחליף למסכים | אווירה במקום מוצר | logistics-timeline / product shots |

## תמונות מוצר חדשות
- `public/images/event-management/product/overview-dashboard.webp`
- `planning-concept.webp`
- `suppliers-budget.webp`
- `calendar-schedule.webp`
- `logistics-timeline.webp`
- `hero-dashboard.webp`
- `guests-dashboard.webp` / `seating-map.webp` (מודולי אורחים נפרדים)

## סרטונים (הקלטות אמיתיות מהדמו)
1. `system-overview.webm` + poster + VTT
2. `tasks-flow.webm` + poster + VTT
3. `budget-flow.webm` + poster + VTT
4. `event-day.webm` + poster + VTT

הקלטות Playwright מתוך `/try/event-management` עם נתוני תצוגה מבודדים.

## בעיות שלא נפתרו / מגבלות
- באנר «מצב דמו» מופיע בצילומים כחלק מ־UI הדמו (לא ניתן להסרה בלי לשנות מצב דמו).
- אייקוני נגישות/WhatsApp צפים עלולים להופיע בקצה צילומי הדמו.
- סרטונים ללא קריינות קולית — עם כתוביות VTT בעברית.
