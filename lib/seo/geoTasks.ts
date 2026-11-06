/**
 * Internal tasks for the search-intelligence layer.
 * Not rendered on public pages. There is no Search Console API in this repo.
 *
 * Status is frozen after PR #519 (merged 6 Nov 2026, 22:54 Asia/Jerusalem).
 * The before-numbers live in docs/seo/monitoring/pr-519-gsc-baseline-2026-11-05.json.
 * Do not treat a recommendation here as a new page change. The next step is a
 * fresh manual export, not another copy edit and not a paid AI measurement.
 */

export type GeoTaskPriority = "high" | "medium";

export type GeoTaskStatus = "done_awaiting_measure";

export type GeoTask = {
  id: string;
  query: string;
  primaryPath: string;
  priority: GeoTaskPriority;
  status: GeoTaskStatus;
  evidence: string;
  recommendation: string;
};

export const GEO_TASKS: GeoTask[] = [
  {
    id: "rsvp-and-seating",
    query: "אישורי הגעה וסידורי הושבה",
    primaryPath: "/",
    priority: "high",
    status: "done_awaiting_measure",
    evidence:
      "לפני #519, Search Console ל־8.8.2026–5.11.2026: חשיפה אחת, 0 קליקים, מיקום 35, והחשיפה היחידה על מדריך ההושבה. כותרת ה־H2 על דף הבית נוספה ב־#519. אין מדידה אחרי המיזוג.",
    recommendation:
      "בוצע ב־#519. ממתין למדידה מחדש. הבית נשאר היעד לביטוי המשולב. לא לפתוח URL חדש ולא להעביר את הביטוי אל /rsvp או אל המדריך.",
  },
  {
    id: "wedding-rsvp",
    query: "אישורי הגעה לחתונה",
    primaryPath: "/rsvp",
    priority: "high",
    status: "done_awaiting_measure",
    evidence:
      "לפני #519, Search Console ל־8.8.2026–5.11.2026: 81 חשיפות, 5 קליקים, 6.2%, מיקום 35.8. /rsvp קיבל 42 חשיפות ו־4 קליקים במיקום 26.3, מדריך המחיר 29 חשיפות וקליק אחד, ו־/rsvp/chatuna 9 חשיפות ו־0 קליקים במיקום 45.8.",
    recommendation:
      "בוצע ב־#519. ממתין למדידה מחדש. היעד נשאר /rsvp. עמוד החתונה נשאר פירוט לאולם ולמנות, לא יעד שני לאותו ביטוי. לא לשנות כותרת, H1 או canonical.",
  },
  {
    id: "wedding-seating",
    query: "סידורי הושבה לחתונה",
    primaryPath: "/seating-explained",
    priority: "high",
    status: "done_awaiting_measure",
    evidence:
      "לפני #519, Search Console ל־8.8.2026–5.11.2026: 27 חשיפות, 0 קליקים, מיקום 29.6. המדריך קיבל 25 חשיפות במיקום 25.1. /seating-explained לא הופיע. נתון ישן עד 2.11.2026 (5 חשיפות, מיקום 29.8) הוחלף בחלון הזה.",
    recommendation:
      "בוצע ב־#519. ממתין למדידה מחדש. המדריך נשאר עמוד המידע שכבר קיבל את החשיפות, ו־/seating-explained נשאר עמוד השירות. לא ליצור עמוד נוסף ולא להעביר את הביטוי בכותרת.",
  },
  {
    id: "rsvp-system",
    query: "מערכת אישורי הגעה",
    primaryPath: "/rsvp",
    priority: "high",
    status: "done_awaiting_measure",
    evidence:
      "הביטוי לא הופיע בייצוא עד 2.11.2026, ו־#519 לא פרסם עבורו ספירה חדשה. כותרת /rsvp כבר הייתה «מערכת אישורי הגעה לאירועים» ונשארה כך.",
    recommendation:
      "בוצע לפני #519 ונשמר שם. ממתין למדידה מחדש. /rsvp נשאר היעד. לא ליצור עמוד מערכת נוסף ולא להוסיף את הביטוי לכותרת של עמוד אחר.",
  },
  {
    id: "whatsapp-rsvp",
    query: "אישורי הגעה בוואטסאפ",
    primaryPath: "/rsvp/whatsapp",
    priority: "medium",
    status: "done_awaiting_measure",
    evidence:
      "לפני #519, Search Console ל־8.8.2026–5.11.2026: 35 חשיפות, 0 קליקים, מיקום 35.8. /rsvp/whatsapp קיבל 12 חשיפות במיקום 39.3, ו־/rsvp קיבל 6 חשיפות במיקום 19.3. נתון ישן עד 2.11.2026 (8 חשיפות, מיקום 24.25) הוחלף בחלון הזה. כותרת עמוד הוואטסאפ לא שונתה.",
    recommendation:
      "בוצע ב־#519 לעניין ההפרדה מעמוד החתונה. ממתין למדידה מחדש. היעד נשאר /rsvp/whatsapp. לא לשנות את הכותרת ולא למדוד תשובות AI בכלי בתשלום.",
  },
  {
    id: "guest-system",
    query: "מערכת לניהול מוזמנים",
    primaryPath: "/rsvp",
    priority: "medium",
    status: "done_awaiting_measure",
    evidence:
      "הביטוי המדויק לא נמדד ב־#519. «ניהול מוזמנים לאירועים עסקיים» הופיע פעם אחת במיקום 37 בייצוא עד 2.11.2026. כותרת «ניהול מוזמנים» נוספה על /rsvp. קישור מ־/event-management לא נוסף.",
    recommendation:
      "בוצע ב־#519 על /rsvp. ממתין למדידה מחדש. לא להעביר את הביטוי המסחרי אל /event-management, כי העמוד הזה עוסק במשימות ובספקים.",
  },
];
