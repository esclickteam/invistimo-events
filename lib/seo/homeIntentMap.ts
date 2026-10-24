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

/** Compact homepage FAQs — must stay consistent with service pages. */
export const HOME_FAQS: { q: string; a: string }[] = [
  {
    q: "מה זה Invistimo?",
    a: "Invistimo היא מערכת ישראלית לאישורי הגעה עם קישור אישי לכל אורח, הזמנות דיגיטליות, Save the Date, סידורי הושבה וניהול אירוע. בחבילת ההודעות: שני סבבי וואטסאפ לאישור, תזכורת SMS והודעת תודה. האורח לא מתקין אפליקציה. המחיר במחשבון לפי מספר רשומות וחבילה — בלי מחיר אחיד לכל אירוע.",
  },
  {
    q: "לאילו אירועים המערכת מתאימה?",
    a: "לחתונה, בר/בת מצווה, ברית, חינה, ימי הולדת, מסיבות ואירועי חברה. לכל סוג אירוע יש עמוד ייעודי תחת «לאירוע שלכם», ופירוט אישורי הגעה בעמוד /rsvp.",
  },
  {
    q: "איך האורח מאשר הגעה?",
    a: "האורח פותח קישור אישי מההודעה, רואה את ההזמנה, מסמן אם הוא מגיע, כמה מגיעים, ויכול להוסיף הערה. התשובה נשמרת בדשבורד שלכם.",
  },
  {
    q: "מה ההבדל בין וואטסאפ ל־SMS?",
    a: "בחבילת ההודעות סבבי אישור ההגעה יוצאים בוואטסאפ. SMS משמש לתזכורת לפני האירוע (כולל מספר שולחן כשיש הושבה) ולהודעת תודה אחריו — לא כערוץ ראשי לאיסוף מגיע/לא מגיע.",
  },
  {
    q: "מתי שולחים Save the Date ומתי מתחילים אישורי הגעה?",
    a: "Save the Date נשלח אחרי שננעל התאריך, כדי לשמור את המועד — בלי לאסוף מגיע/לא מגיע. אישורי הגעה מתחילים כשהתאריך, השעה והמיקום בהזמנה מדויקים, ועם מרווח לסבב שני לפני שהאולם צריך מספר מנות.",
  },
  {
    q: "איך אישורי הגעה מתחברים להושבה?",
    a: "אחרי שיש תשובות ברשימה אפשר לשבץ שולחנות אם נרכשה תוספת ההושבה. מספר השולחן יכול להופיע גם בתזכורת ה־SMS. בלי תוספת הושבה אין להניח שהמפה פתוחה.",
  },
  {
    q: "איך נקבע המחיר?",
    a: "אין מחיר אחיד לכל אירוע. במחשבון בוחרים מספר רשומות וסוג חבילה (הודעות, שיחות מוקלטות, אנושיות או משולבות) ורואים את הסכום שם.",
  },
];
