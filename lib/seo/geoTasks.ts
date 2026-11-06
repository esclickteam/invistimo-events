/**
 * Internal tasks for the search-intelligence layer.
 * Not rendered on public pages. Evidence is from the manual Search Console
 * export through 2026-11-02; there is no API connection in this repo.
 */

export type GeoTaskPriority = "high" | "medium";

export type GeoTask = {
  id: string;
  query: string;
  primaryPath: string;
  priority: GeoTaskPriority;
  evidence: string;
  recommendation: string;
};

export const GEO_TASKS: GeoTask[] = [
  {
    id: "rsvp-and-seating",
    query: "אישורי הגעה וסידורי הושבה",
    primaryPath: "/",
    priority: "high",
    evidence:
      "הביטוי המדויק לא הופיע בייצוא Search Console ל־3 חודשים עד 2.11.2026. וריאציה קרובה, «אישורי הגעה וסידור שולחנות», הופיעה 2 פעמים במיקום ממוצע 27 בלי קליקים. הבית לא החזיק את הביטוי בכותרת או בפסקה הראשונה.",
    recommendation:
      "להשאיר את הבית כעמוד היעד לחיבור בין השירותים, ואת העומק ב־/rsvp, ב־/seating-explained ובמדריך ההושבה. אחרי פרסום: לבדוק ב־Search Console אם השאילתה מופיעה ועל איזה URL.",
  },
  {
    id: "wedding-rsvp",
    query: "אישורי הגעה לחתונה",
    primaryPath: "/rsvp",
    priority: "high",
    evidence:
      "Search Console, 8.8.2026 עד 5.11.2026: 81 חשיפות, 5 קליקים, שיעור הקלקה 6.2%, מיקום 35.8. מתוכן /rsvp קיבל 42 חשיפות ו־4 קליקים במיקום 26.3. /rsvp/chatuna קיבל 9 חשיפות, 0 קליקים, מיקום 45.8.",
    recommendation:
      "/rsvp הוא עמוד היעד. /rsvp/chatuna נשאר פירוט על האולם והמנות, עם קישור חזרה למערכת. לא לפתוח עמוד נוסף.",
  },
  {
    id: "wedding-seating",
    query: "סידורי הושבה לחתונה",
    primaryPath: "/seating-explained",
    priority: "high",
    evidence:
      "Search Console עד 2.11.2026: 0 קליקים, 5 חשיפות, מיקום ממוצע 29.8. לעמוד השירות ולמדריך יש כותרות שפותחות באותו ביטוי, עם תפקיד שונה: מערכת מול הסבר.",
    recommendation:
      "לשמור את /seating-explained כיעד המסחרי ואת המדריך כיעד לשאלות תכנון. לא לפצל URL נוסף. במעקב: חשיפות, CTR והאם גוגל בוחר את המדריך במקום את עמוד השירות.",
  },
  {
    id: "rsvp-system",
    query: "מערכת אישורי הגעה",
    primaryPath: "/rsvp",
    priority: "high",
    evidence:
      "הביטוי לא הופיע בייצוא עד 2.11.2026. עמוד /rsvp דיבר על חתונה ועל אירועים באותה כותרת, בלי «מערכת» בכותרת הגלויה.",
    recommendation:
      "להשאיר את /rsvp כיעד למי שמחפש מערכת, עם קישור מפורש לעמוד החתונה, לוואטסאפ ולהושבה. לא ליצור עמוד מערכת נוסף.",
  },
  {
    id: "whatsapp-rsvp",
    query: "אישורי הגעה בוואטסאפ",
    primaryPath: "/rsvp/whatsapp",
    priority: "medium",
    evidence:
      "Search Console עד 2.11.2026: 0 קליקים, 8 חשיפות, מיקום ממוצע 24.25. הכותרת כבר התאימה, וכותרת ה־H1 השתמשה ב־WhatsApp ולא ב«בוואטסאפ».",
    recommendation:
      "להשאיר את /rsvp/whatsapp כיעד. אחרי פרסום לבדוק אם המיקום הממוצע זז ואם מתחילים קליקים. לא למדוד תשובות AI בכלי בתשלום.",
  },
  {
    id: "guest-system",
    query: "מערכת לניהול מוזמנים",
    primaryPath: "/rsvp",
    priority: "medium",
    evidence:
      "הביטוי המדויק לא הופיע בייצוא. «ניהול מוזמנים לאירועים עסקיים» הופיע פעם אחת במיקום 37. מדריך רשימת המוזמנים הוא הסברי, לא עמוד המערכת.",
    recommendation:
      "יעד מסחרי: /rsvp. המדריך נשאר תשובה לשאלות «איך מנהלים רשימה». לא להעביר את הביטוי המסחרי אל /event-management, כי שם מדובר במשימות וספקים.",
  },
];
