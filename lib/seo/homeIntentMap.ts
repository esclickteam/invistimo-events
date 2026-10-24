/**
 * Homepage search-intent ownership (Hebrew).
 * Volumes/rankings are intentionally omitted — no invented metrics.
 * Service deep-dives stay on their primary paths to avoid cannibalization.
 */

export type IntentBucket = {
  theme: string;
  exampleQueries: string[];
  /** Where this intent should rank / be answered in depth */
  primaryPath: string;
  /** What the homepage may cover (hub / orientation only) */
  homepageRole: string;
};

/** Themes the homepage orients; depth lives on service pages. */
export const HOME_INTENT_MAP: IntentBucket[] = [
  {
    theme: "אישורי הגעה לאירועים ולחתונה",
    exampleQueries: [
      "אישורי הגעה לאירועים",
      "אישורי הגעה לחתונה",
      "מערכת אישורי הגעה",
      "Invistimo אישורי הגעה",
    ],
    primaryPath: "/rsvp",
    homepageRole:
      "הגדרת המותג והמערכת כמקום אחד לאישורים + קישור לעמוד אישורי הגעה ולחתונה.",
  },
  {
    theme: "אישורי הגעה בוואטסאפ וב־SMS",
    exampleQueries: [
      "אישורי הגעה בוואטסאפ",
      "סבבי וואטסאפ לאישור הגעה",
      "תזכורת SMS לאירוע",
    ],
    primaryPath: "/rsvp/whatsapp",
    homepageRole:
      "הסבר קצר: סבבי אישור בוואטסאפ; SMS לתזכורת/תודה — פירוט ב־/rsvp/whatsapp ו־/rsvp/sms.",
  },
  {
    theme: "הזמנות דיגיטליות לחתונה ולאירועים",
    exampleQueries: [
      "הזמנה דיגיטלית לחתונה",
      "הזמנות דיגיטליות לאירועים",
    ],
    primaryPath: "/invitations/chatuna",
    homepageRole: "הצגת סטודיו הזמנות + קישור לעמוד ההזמנות; לא מדריך עיצוב מלא.",
  },
  {
    theme: "Save the Date",
    exampleQueries: [
      "Save the Date לחתונה",
      "מתי שולחים Save the Date",
    ],
    primaryPath: "/rsvp/save-the-date",
    homepageRole:
      "הבחנה: שמירת תאריך ≠ אישור הגעה; קישור לעמוד ולמדריך התזמון.",
  },
  {
    theme: "סידורי הושבה",
    exampleQueries: ["סידורי הושבה", "מפת הושבה לחתונה", "מספר שולחן לאורחים"],
    primaryPath: "/seating-explained",
    homepageRole: "חיבור בין אישורים להושבה כתוספת; פירוט בעמוד ההושבה.",
  },
  {
    theme: "אתר חתונה",
    exampleQueries: ["אתר חתונה", "אתר חתונה עם אישורי הגעה"],
    primaryPath: "/wedding-website",
    homepageRole: "מוצר משלים להזמנה ולאישורים; לא מחליף סבבי וואטסאפ.",
  },
  {
    theme: "ניהול מוזמנים ואירועים",
    exampleQueries: [
      "ניהול רשימת מוזמנים",
      "ניהול אירוע",
      "דשבורד אישורי הגעה",
    ],
    primaryPath: "/event-management",
    homepageRole:
      "סקירת דשבורד ורשימה אחת; פירוט ב־/rsvp/guest-list ו־/event-management.",
  },
];

/**
 * Compact homepage FAQs — hub only; expansions live on /faq and service pages.
 * Must match visible FAQ markup 1:1 when used in FAQPage schema.
 */
export const HOME_FAQS: { q: string; a: string }[] = [
  {
    q: "איך עובדים אישורי הגעה דיגיטליים?",
    a: "יוצרים אירוע, מוסיפים את רשימת המוזמנים ושולחים לאורחים הודעה עם קישור אישי. כל אורח יכול להשיב דרך הקישור, והתשובות מתעדכנות במערכת כדי שתוכלו לעקוב אחר ההגעה.",
  },
  {
    q: "האם האורחים צריכים להוריד אפליקציה?",
    a: "לא. האורחים יכולים לפתוח את הקישור האישי ולהשיב דרך הדפדפן בטלפון שלהם, ללא התקנת אפליקציה.",
  },
  {
    q: "מתי כדאי לשלוח Save the Date?",
    a: "בחתונות נהוג לעיתים לשלוח הודעת Save the Date כשלושה עד שישה חודשים לפני האירוע, כדי לאפשר לאורחים לשריין את התאריך. המועד המתאים תלוי באופי האירוע ובאורחים.",
  },
  {
    q: "מתי כדאי לשלוח את ההזמנה?",
    a: "אפשר לשלוח את ההזמנה המעוצבת כחודש עד חודש וחצי לפני החתונה, כדי לשתף את פרטי האירוע ולאפשר לאורחים להיערך מראש.",
  },
  {
    q: "מתי כדאי להתחיל אישורי הגעה?",
    a: "בחתונות רבות כדאי להתחיל כשבועיים עד שבועיים וחצי לפני האירוע. בשלב הזה לאורחים קל יותר לדעת אם יוכלו להגיע, ואפשר להשאיר זמן לתזכורות ולמעקב אחר מי שעדיין לא השיב.",
  },
  {
    q: "האם אפשר לנהל גם סידורי הושבה?",
    a: "כן. Invistimo כוללת אפשרות לניהול סידורי הושבה, בהתאם לשירותים שנבחרו, כך שניתן לתכנן שולחנות ולשבץ אורחים במקום אחד.",
  },
  {
    q: "האם אפשר לשלוח הודעות ב־WhatsApp?",
    a: "כן. המערכת תומכת בשליחת הודעות WhatsApp כחלק משירותי אישורי ההגעה, בהתאם לחבילה ולתהליך השליחה המוגדר.",
  },
  {
    q: "כמה עולה להשתמש ב־Invistimo?",
    a: "המחיר תלוי בשירותים ובחבילה שנבחרו. בעמוד החבילות והמחירים אפשר לראות את האפשרויות ולבחור את הפתרון המתאים לאירוע.",
  },
];
