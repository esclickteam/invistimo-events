/**
 * Internal tasks for the search-intelligence layer.
 * Not rendered on public pages. There is no Search Console API in this repo.
 *
 * Wave of 11 Nov 2026 is marked done and waiting for a fresh measurement.
 * Do not edit the same pages again on the same day only because ranks have not moved.
 * The before-numbers for the earlier wave live in docs/seo/monitoring/pr-519-gsc-baseline-2026-11-05.json.
 * The 7/14/28 checkpoints for this wave live in lib/seo/geoMeasurements.ts.
 * A checkpoint records a verdict only. It does not change titles, pages, or links.
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
    primaryPath: "/rsvp/chatuna",
    priority: "high",
    status: "done_awaiting_measure",
    evidence:
      "לפני #519, Search Console ל־8.8.2026–5.11.2026: 81 חשיפות, 5 קליקים, 6.2%, מיקום 35.8. ב־11.11.2026 היעד הועבר ל־/rsvp/chatuna כי נפח החיפוש המדווח הוא כ־1,600 והעמוד הכללי נשאר ל«אישורי הגעה».",
    recommendation:
      "בוצע ב־11.11.2026. ממתין למדידה מחדש. היעד הוא /rsvp/chatuna. /rsvp נשאר כללי. לא לפתוח URL נוסף ולא למדוד מחדש באותו יום.",
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
  {
    id: "rsvp-head",
    query: "אישורי הגעה",
    primaryPath: "/rsvp",
    priority: "high",
    status: "done_awaiting_measure",
    evidence:
      "נפח מדווח כ־2,400. מדריך המחיר החזיק ניסוחים של «כמה עולה», והעמוד הכללי לא הוביל בכותרת. ב־11.11.2026 הכותרת וה־H1 עברו לאישורי הגעה לאירועים.",
    recommendation:
      "בוצע ב־11.11.2026. ממתין למדידה מחדש. היעד הוא /rsvp. מדריך המחיר נשאר רק לשאלות מחיר.",
  },
  {
    id: "rsvp-events",
    query: "אישורי הגעה לאירועים",
    primaryPath: "/rsvp",
    priority: "high",
    status: "done_awaiting_measure",
    evidence: "נפח מדווח כ־480. אותו עמוד כמו «אישורי הגעה», בלי URL נפרד לאירועים.",
    recommendation: "בוצע ב־11.11.2026. ממתין למדידה מחדש. לא ליצור עמוד אירועים נוסף.",
  },
  {
    id: "rsvp-service",
    query: "שירות אישורי הגעה",
    primaryPath: "/rsvp",
    priority: "medium",
    status: "done_awaiting_measure",
    evidence: "הביטוי בלי «לחתונה» יושב על העמוד הכללי. גרסת החתונה נשארת ב־/rsvp/chatuna.",
    recommendation: "בוצע ב־11.11.2026. ממתין למדידה מחדש. לא להעביר את הביטוי הכללי לעמוד החתונה.",
  },
  {
    id: "save-the-date",
    query: "Save the Date",
    primaryPath: "/rsvp/save-the-date",
    priority: "high",
    status: "done_awaiting_measure",
    evidence: "נפח מדווח כ־3,600. הכתיב «סייב דה דייט» מדווח כ־1,000 ויושב על אותו URL.",
    recommendation: "בוצע ב־11.11.2026. ממתין למדידה מחדש. לא ליצור עמוד נפרד לכתיב העברי.",
  },
  {
    id: "digital-invite-wedding",
    query: "הזמנה דיגיטלית לחתונה",
    primaryPath: "/invitations/chatuna",
    priority: "medium",
    status: "done_awaiting_measure",
    evidence: "נפח מדווח כ־260, עם חשיפות בלי קליקים. הכותרת עברה לצורת היחיד ולקישור אישי בטלפון.",
    recommendation: "בוצע ב־11.11.2026. ממתין למדידה מחדש. לא לפתוח URL שני להזמנה.",
  },
  {
    id: "seating-tables",
    query: "סידור שולחנות לחתונה",
    primaryPath: "/seating-explained",
    priority: "medium",
    status: "done_awaiting_measure",
    evidence: "«סידורי הושבה» ו«סידור שולחנות לחתונה» חולקים את עמוד השירות. המדריך נשאר להחלטות התכנון.",
    recommendation: "בוצע ב־11.11.2026. ממתין למדידה מחדש. לא ליצור עמוד שולחנות נוסף.",
  },
  {
    id: "free-rsvp",
    query: "אישורי הגעה חינם",
    primaryPath: "/pricing",
    priority: "medium",
    status: "done_awaiting_measure",
    evidence: "נפח מדווח כ־390, ועוד כ־320 ל«אפליקציה אישורי הגעה חינם». אין מוצר חינם באתר.",
    recommendation:
      "בוצע ב־11.11.2026. ממתין למדידה מחדש. העמוד מסביר מחיר והדגמה. לא לכתוב שהשירות חינם ולא לפתוח עמוד חינם.",
  },
  {
    id: "excel-guest-list",
    query: "רשימת מוזמנים לחתונה אקסל",
    primaryPath: "/info/guides/wedding-guest-list-excel",
    priority: "medium",
    status: "done_awaiting_measure",
    evidence: "נוסף מדריך אחד לגיליון. ניהול הרשימה נשאר ב־/info/guides/guest-list, וההעלאה ב־/info/guides/import-guest-list.",
    recommendation: "בוצע ב־11.11.2026. ממתין למדידה מחדש. לא לפצל טבלה, רשימת אורחים ורשימת מוזמנים לשלושה עמודים.",
  },
];
