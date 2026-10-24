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
    q: "מה זה Invistimo?",
    a: "מערכת ישראלית לאישורי הגעה עם קישור אישי לכל אורח, יחד עם הזמנות דיגיטליות, Save the Date, הושבה וניהול אירוע. האורח לא מתקין אפליקציה.",
  },
  {
    q: "איך האורח מאשר הגעה?",
    a: "פותח קישור אישי מההודעה, מסמן אם מגיע וכמה, ויכול להוסיף הערה. התשובה נשמרת בדשבורד שלכם.",
  },
  {
    q: "מה ההבדל בין וואטסאפ ל־SMS?",
    a: "סבבי אישור ההגעה יוצאים בוואטסאפ. SMS משמש לתזכורת לפני האירוע ולהודעת תודה — לא כערוץ ראשי לאיסוף מגיע/לא מגיע.",
  },
  {
    q: "מתי שולחים Save the Date ומתי מתחילים אישורי הגעה?",
    a: "Save the Date אחרי שננעל התאריך, בלי לאסוף מגיע/לא מגיע. אישורי הגעה כשהתאריך, השעה והמיקום בהזמנה מדויקים.",
  },
  {
    q: "איך נקבע המחיר?",
    a: "אין מחיר אחיד לכל אירוע. במחשבון החבילות בוחרים מספר רשומות וסוג חבילה ורואים את הסכום שם.",
  },
];
