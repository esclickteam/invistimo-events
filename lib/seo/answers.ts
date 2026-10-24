import type { KeywordRow } from "@/lib/seo/keywordMap";
import { PRODUCT_SHOTS } from "@/lib/seo/productVisuals";

export type FactTable = {
  caption: string;
  headers: string[];
  rows: string[][];
};

export type AnswerVisual = {
  src: string;
  alt: string;
  device: "laptop" | "phone";
};

/**
 * Human mid-page headings for overview copy (AEO/GEO).
 * Headings must read as natural section titles, not robot-style SEO labels.
 */
export const PAGE_ANSWER_HEADINGS: Record<string, string> = {
  "/": "איך אינויסטימו עובדת?",
  "/rsvp": "איך מתבצע תהליך אישור ההגעה?",
  "/rsvp/chatuna": "איך מאשרים הגעה לחתונה?",
  "/rsvp/whatsapp": "מה כוללים סבבי הוואטסאפ?",
  "/invitations/chatuna": "איך נראית הזמנה דיגיטלית?",
  "/wedding-website": "מה מקבלים באתר חתונה?",
  "/rsvp/save-the-date": "מה חשוב לדעת על Save the Date?",
  "/seating-explained": "איך מנהלים סידורי הושבה?",
  "/event-management": "מה כולל ניהול האירוע?",
  "/pricing": "איך נקבע המחיר?",
  "/faq": "מה חשוב לדעת לפני שמתחילים?",
  "/info/about": "מי אנחנו ומה המערכת עושה?",
  "/info/guides/cost-rsvp-wedding": "איך מחשבים את עלות אישורי ההגעה?",
  "/info/guides/when-to-send-rsvp": "מתי כדאי להתחיל לאסוף אישורים?",
  "/info/guides/send-digital-invitation": "איך שולחים הזמנה דיגיטלית?",
  "/info/guides/seating-plan": "איך בונים תוכנית הושבה?",
  "/info/guides/save-the-date-vs-invitation": "מה ההבדל בין Save the Date להזמנה?",
  "/info/guides/reduce-meal-waste": "איך הרשימה עוזרת מול האולם?",
  "/info/guides/guest-list": "כל מה שצריך לניהול המוזמנים",
  "/info/guides/guests-who-dont-reply": "מה עושים עם מי שלא עונה?",
  "/info/guides/table-number-message": "איך האורח מקבל את מספר השולחן?",
  "/info/guides/event-day-checklist": "מה לסגור לפני יום האירוע?",
  "/rsvp/sms": "מתי משתמשים ב־SMS?",
  "/rsvp/calls": "מתי מוסיפים חבילת שיחות?",
  "/rsvp/reminders": "איך עובדת תזכורת לפני האירוע?",
  "/rsvp/thank-you-messages": "מתי נשלחת הודעת התודה?",
  "/rsvp/guest-list": "כל מה שצריך לניהול המוזמנים",
  "/info/demo": "מה תראו בדמו?",
  "/for/bar-mitzvah": "איך מנהלים אישורי הגעה לבר מצווה?",
  "/for/bat-mitzvah": "איך מנהלים אישורי הגעה לבת מצווה?",
  "/for/brit": "מה מתאים לברית ולבריתה?",
  "/for/henna": "איך מנהלים מוזמנים לחינה?",
  "/for/birthday": "מה מתאים ליום הולדת ואירוע פרטי?",
  "/for/private-party": "מה חשוב לדעת למסיבה פרטית?",
  "/for/corporate": "איך מנהלים אירוע חברה?",
  "/info/guides/when-to-send-save-the-date": "מתי שולחים Save the Date?",
  "/info/guides/when-to-send-invitation": "מתי שולחים את ההזמנה?",
  "/info/guides/how-many-rsvp-rounds": "כמה סבבי אישור באמת צריך?",
  "/info/guides/build-wedding-website": "איך בונים אתר חתונה?",
  "/info/guides/bar-mitzvah-rsvp-plan": "איך מתכננים אישורים לבר מצווה?",
  "/info/guides/manage-corporate-event": "איך מנהלים אירוע חברה במערכת?",
  "/info/guides/send-reminder-messages": "איך מגדירים תזכורת לאורחים?",
};

/** Optional product visual paired with the mid-page overview. */
export const PAGE_ANSWER_VISUALS: Record<string, AnswerVisual> = {
  "/": {
    src: PRODUCT_SHOTS.dashboard,
    alt: "דשבורד Invistimo עם מעקב אישורי הגעה",
    device: "laptop",
  },
  "/rsvp": {
    src: PRODUCT_SHOTS.guestRsvp,
    alt: "מסך אישור הגעה של אורח בקישור אישי",
    device: "phone",
  },
  "/rsvp/chatuna": {
    src: PRODUCT_SHOTS.guestRsvpMobile,
    alt: "אישור הגעה לחתונה במסך האורח",
    device: "phone",
  },
  "/rsvp/whatsapp": {
    src: PRODUCT_SHOTS.messagesSms,
    alt: "ממשק שליחת הודעות במערכת",
    device: "laptop",
  },
  "/invitations/chatuna": {
    src: PRODUCT_SHOTS.messagesSaveTheDate,
    alt: "שליחת הזמנה דיגיטלית מהמערכת",
    device: "laptop",
  },
  "/wedding-website": {
    src: PRODUCT_SHOTS.weddingEternal,
    alt: "תבנית אתר חתונה Eternal Gold",
    device: "laptop",
  },
  "/rsvp/save-the-date": {
    src: PRODUCT_SHOTS.messagesSaveTheDate,
    alt: "ממשק שליחת Save the Date",
    device: "laptop",
  },
  "/seating-explained": {
    src: PRODUCT_SHOTS.seating,
    alt: "מפת סידורי הושבה במערכת",
    device: "laptop",
  },
  "/event-management": {
    src: PRODUCT_SHOTS.eventMgmt,
    alt: "מסך ניהול אירוע",
    device: "laptop",
  },
  "/pricing": {
    src: PRODUCT_SHOTS.dashboard,
    alt: "דשבורד האירוע ליד בחירת חבילה",
    device: "laptop",
  },
  "/rsvp/sms": {
    src: PRODUCT_SHOTS.messagesSmsReminder,
    alt: "תזכורת SMS לפני האירוע",
    device: "laptop",
  },
  "/rsvp/reminders": {
    src: PRODUCT_SHOTS.messagesSmsReminder,
    alt: "ממשק תזכורת SMS",
    device: "laptop",
  },
  "/rsvp/guest-list": {
    src: PRODUCT_SHOTS.dashboard,
    alt: "רשימת מוזמנים וסטטוסים בדשבורד",
    device: "laptop",
  },
  "/info/guides/seating-plan": {
    src: PRODUCT_SHOTS.seating,
    alt: "תוכנית הושבה במערכת",
    device: "laptop",
  },
  "/info/guides/guest-list": {
    src: PRODUCT_SHOTS.dashboard,
    alt: "ניהול רשימת מוזמנים",
    device: "laptop",
  },
  "/info/guides/build-wedding-website": {
    src: PRODUCT_SHOTS.weddingEternalMobile,
    alt: "אתר חתונה בתצוגת נייד",
    device: "phone",
  },
  "/for/bar-mitzvah": {
    src: PRODUCT_SHOTS.guestRsvp,
    alt: "אישור הגעה לבר מצווה",
    device: "phone",
  },
  "/for/bat-mitzvah": {
    src: PRODUCT_SHOTS.guestRsvpMobile,
    alt: "אישור הגעה לבת מצווה",
    device: "phone",
  },
  "/for/corporate": {
    src: PRODUCT_SHOTS.eventMgmt,
    alt: "ניהול אירוע חברה",
    device: "laptop",
  },
};

/** Direct answer shown in a natural mid-page section. Visible text, not hidden. */
export const PAGE_ANSWERS: Record<string, string> = {
  "/":
    "Invistimo היא מערכת ישראלית לאישורי הגעה, הזמנות דיגיטליות, סידורי הושבה וניהול אירוע. האורח מקבל קישור אישי בלי להתקין אפליקציה. המחיר נקבע במחשבון לפי מספר רשומות וחבילה.",
  "/rsvp":
    "אישור הגעה ב־Invistimo הוא קישור אישי לכל אורח. האורח מסמן אם הוא מגיע, כמה אנשים מגיעים, ויכול להוסיף הערה. בחבילת ההודעות יוצאים שני סבבי וואטסאפ ותזכורת SMS. מתאים לחתונה, בר/בת מצווה, ברית, חינה, ימי הולדת ואירועי חברה.",
  "/rsvp/chatuna":
    "אישור הגעה לחתונה ב־Invistimo הוא קישור אישי לכל אורח. האורח מסמן אם הוא מגיע, כמה אנשים מגיעים, ויכול להוסיף הערה. בחבילת ההודעות יוצאים שני סבבי וואטסאפ, ואחר כך תזכורת SMS.",
  "/rsvp/whatsapp":
    "בחבילת ההודעות נשלחים שני סבבי וואטסאפ אוטומטיים לאישור הגעה. התשובה נשמרת במערכת. שיחה למי שלא ענה היא חבילה נפרדת, לא חלק מחבילת ההודעות בלבד.",
  "/invitations/chatuna":
    "ההזמנה הדיגיטלית נפתחת מקישור אישי של האורח. אפשר להעלות הזמנה קיימת או לערוך את ההזמנה שבמערכת כל עוד האירוע פעיל. אתר חתונה אישי הוא מוצר נפרד — ראו /wedding-website.",
  "/wedding-website":
    "אתר חתונה ב־Invistimo הוא אתר מעוצב לאירוע עם תבניות אמיתיות מהמוצר, עורך ויזואלי וקישור אורח. הוא משלים הזמנה דיגיטלית ואישורי הגעה, ואינו מחליף את סבבי הוואטסאפ. הזמינות תלויה בהרשאה בחשבון.",
  "/rsvp/save-the-date":
    "Save the Date ב־Invistimo הוא הודעת וואטסאפ אחת, כשהאפשרות פתוחה בחשבון. היא לא אוספת מגיע או לא מגיע, והיא לא נספרת כסבב אישור הגעה.",
  "/seating-explained":
    "סידורי הושבה ב־Invistimo מתחילים מסקיצת האולם: ממקמים שולחנות, משבצים ידנית או לפי קבוצות, ואפשר לשלוח לכל אורח הודעה עם מספר השולחן. ההושבה היא תוספת במחשבון החבילות.",
  "/event-management":
    "מערכת ניהול האירוע ב־Invistimo מרכזת משימות, ספקים, תקציב, תשלומים ולוח זמנים לצד אישורי הגעה והושבה. אפשר להשתמש בה עצמאית, ואפשר להוסיף ליווי וניהול באולם לפי מה שסוכם.",
  "/pricing":
    "מחיר Invistimo מחושב במחשבון לפי מספר רשומות וסוג חבילה: הודעות, שיחות מוקלטות, שיחות אנושיות או משולבות. אין מחיר אחיד לכל חתונה. הסכום מוצג רק אחרי שבוחרים כמות ותוספות.",
  "/faq":
    "בעמוד הזה מרוכזות שאלות על אישורי הגעה, וואטסאפ, הזמנות, Save the Date, הושבה, חבילות ותמיכה — לחתונות ולאירועים נוספים. התשובות מבוססות על מה שהמערכת באמת עושה. לשאלה שלא מופיעה כאן — עמוד יצירת הקשר.",
  "/info/about":
    "Invistimo היא מערכת ישראלית לאישורי הגעה, הזמנות דיגיטליות, הושבה וניהול אירוע. המפעיל לפי התקנון הוא עוסק 316576578. לתמיכה: support@invistimo.com או 055-503-9072.",
  "/info/guides/cost-rsvp-wedding":
    "אין מחיר אחד לחתונה. במחשבון בוחרים מספר רשומות וחבילה, והסכום מוצג שם. המדריך הזה מסביר מה נספר, בלי להחליף את המחשבון.",
  "/info/guides/when-to-send-rsvp":
    "שולחים אחרי שהתאריך, השעה והמיקום בהזמנה נכונים, ועם מספיק זמן לסבב שני לפני שהאולם צריך מספר מנות. אין במערכת יום קבוע לפני החתונה.",
  "/info/guides/send-digital-invitation":
    "מעלים הזמנה או משתמשים בהזמנה שבמערכת, בודקים את פרטי האירוע, ושולחים קישור אישי. בחבילת ההודעות השליחה לאישור ההגעה היא שני סבבי וואטסאפ.",
  "/info/guides/seating-plan":
    "מעלים סקיצה, ממקמים שולחנות, ומשבצים ידנית או לפי קבוצות. אחר כך אפשר לשלוח לכל אורח את מספר השולחן. ההושבה היא תוספת במחשבון.",
  "/info/guides/save-the-date-vs-invitation":
    "Save the Date מודיע שהתאריך נשמר ואינו אוסף תשובה. ההזמנה והקישור האישי הם השלב שבו האורח רואה פרטים ומאשר כמה מגיעים.",
  "/info/guides/reduce-meal-waste":
    "המערכת מראה מי מגיע, כמה אנשים באישור, ומי עדיין בלי תשובה. היא לא מבטיחה סכום שייחסך, ואת המספר מעבירים לאולם בעצמכם.",
  "/info/guides/guest-list":
    "רשימה אחת שומרת שם, טלפון, סטטוס, מספר מגיעים והערות. ממנה יוצאות ההודעות ואליה חוזרות התשובות. חבילה אחת מיועדת לאירוע אחד, אלא אם סוכם אחרת.",
  "/info/guides/guests-who-dont-reply":
    "מתחילים לאסוף אישורים כשהאירוע מתקרב — לא חודשים מראש. מי שלא ענה נשאר מסומן בדשבורד. סבב וואטסאפ שני כלול בחבילת ההודעות; שיחות מוקלטות/אנושיות/משולבות הן חבילות נפרדות. תזכורת SMS לא מחליפה סבב אישור.",
  "/info/guides/table-number-message":
    "אחרי השיבוץ אפשר לשלוח לכל אורח הודעה אישית עם מספר השולחן. בתזכורת ה־SMS של חבילת ההודעות מופיע גם מספר שולחן כשיש הושבה. בלי תוספת הושבה אין להניח שהמפה פתוחה.",
  "/info/guides/event-day-checklist":
    "לפני יום האירוע סוגרים רשימה, מסיימים סבבי אישור, מעדכנים הושבה אם יש, ומוודאים שהתזכורת והודעת התודה מוגדרות. המערכת לא מחליפה מפיק באולם אלא אם סוכם ליווי.",
  "/rsvp/sms":
    "בחבילת ההודעות סבבי אישור ההגעה הם בוואטסאפ. SMS משמש לתזכורת לפני האירוע (כולל מספר שולחן כשיש הושבה) ולהודעת תודה אחריו — לא כערוץ ראשי לאיסוף מגיע/לא מגיע.",
  "/rsvp/calls":
    "חבילות שיחה (מוקלטת, אנושית או משולבת) מתווספות לבסיס ההודעות ומיועדות בעיקר למי שלא ענה בסבבי הוואטסאפ. הסכום במחשבון לפי רשומות.",
  "/rsvp/reminders":
    "תזכורת SMS בחבילת ההודעות מזכירה את המועד לקראת האירוע. היא לא מחליפה סבב אישור. מספר שולחן יכול להופיע כשיש הושבה ושיבוץ.",
  "/rsvp/thank-you-messages":
    "הודעת תודה ב־SMS אחרי האירוע כלולה בחבילת ההודעות. היא נשלחת אחרי המועד על אותה רשימת מוזמנים — לא במקום אישור הגעה.",
  "/rsvp/guest-list":
    "רשימת מוזמנים אחת שומרת שם, טלפון, סטטוס, מספר מגיעים והערות. ממנה יוצאות ההודעות ואליה חוזרות התשובות. חבילה אחת מיועדת לאירוע אחד אלא אם סוכם אחרת.",
  "/info/demo":
    "הדמו ב־/try מציג מסכי מערכת אמיתיים עם אירוע לדוגמה. מסלול /try עצמו מסומן noindex; העמוד הזה מסביר מה תראו ומקשר פנימה.",
  "/for/bar-mitzvah":
    "בבר מצווה מנהלים רשימת משפחה וחברים בקישור אישי לכל אורח, עם סבבי וואטסאפ ומספר מגיעים לפני סגירה מול האולם. אתר חתונה לא חובה.",
  "/for/bat-mitzvah":
    "בבת מצווה מאחדים תשובות ממשפחה, חברות והורים בדשבורד אחד, עם הזמנה דיגיטלית וסבבי אישור לפני סגירת מספר מול האולם.",
  "/for/brit":
    "לברית ולבריתה מספיקים לרוב הזמנה ושני סבבי וואטסאפ על רשימה קצרה. אין חובה ב־Save the Date או באתר אישי. הושבה רק אם יש שולחנות ונרכשה התוספת.",
  "/for/henna":
    "לחינה מנהלים מוזמנים משני צדדים עם קישור אישי, ואפשר להוסיף הושבה כשיש שולחנות. אישור החינה נפרד מאישורי החתונה כדי לא לערבב סטטוסים.",
  "/for/birthday":
    "ליום הולדת ולאירוע פרטי — כולל ימי הולדת עגולים — משתמשים בהזמנה דיגיטלית ובאישורי הגעה עם קישור אישי, בלי לבנות מסע חתונה מלא.",
  "/for/private-party":
    "למסיבה ואירוע פרטי מתמקדים בהזמנה, אישורי הגעה ותזכורת לפי החבילה. הושבה וניהול אירוע רק אם באמת צריך.",
  "/for/corporate":
    "לאירוע חברה או כנס: רשימת מוזמנים, סטטוסי הגעה ותזכורות. ניהול אירוע כתוספת למשימות ותקציב. לא מחליף מערכת כנסים עם סשנים מקבילים.",
  "/info/guides/when-to-send-save-the-date":
    "שולחים Save the Date אחרי שננעל התאריך ולפני איסוף אישורי הגעה. זו הודעת שמירת תאריך בלבד, כשהאפשרות פתוחה בחשבון — לא סבב אישור.",
  "/info/guides/when-to-send-invitation":
    "שולחים הזמנה דיגיטלית כשהתאריך, השעה והמיקום מדויקים. אחר כך או יחד עם הקישור האישי מתחילים סבבי אישור בזמן הנכון.",
  "/info/guides/how-many-rsvp-rounds":
    "בחבילת ההודעות כלולים שני סבבי וואטסאפ. חבילות שיחה מוסיפות סבבים למי שלא ענה. תזכורת SMS אינה סבב אישור.",
  "/info/guides/build-wedding-website":
    "בוחרים תבנית בעורך, ממלאים תוכן, ובודקים את תצוגת האורח. האתר משלים הזמנה ואישורים ואינו מחליף את סבבי הוואטסאפ. הזמינות תלויה בהרשאה בחשבון.",
  "/info/guides/bar-mitzvah-rsvp-plan":
    "מאחדים רשימת משפחה וחברים, שולחים הזמנה, מתחילים אישורים עם מרווח לסבב שני, ומעבירים מספר לאולם. הושבה רק אם נרכשה.",
  "/info/guides/manage-corporate-event":
    "מעלים רשימה, שולחים קישור לאישור, עוקבים אחרי סטטוסים, ומוסיפים ניהול אירוע או הושבה רק כשצריך. לא מערכת כנסים מלאה.",
  "/info/guides/send-reminder-messages":
    "אחרי סגירת פתוחים והושבה אם יש — מגדירים תזכורת SMS לקראת האירוע. היא מזכירה מועד ולא אוספת מגיע/לא מגיע מחדש.",
};

export const PACKAGE_COMPARISON: FactTable = {
  caption: "מה כלול בכל חבילה ב־Invistimo. הסכום עצמו מופיע רק במחשבון.",
  headers: ["חבילה", "הזמנה וסבבי וואטסאפ", "תזכורת והודעת תודה", "שיחות"],
  rows: [
    ["הודעות בלבד", "הזמנה דיגיטלית ושני סבבי וואטסאפ", "SMS עם מספר שולחן, ותודה ב־SMS", "לא כלולות"],
    ["שיחות מוקלטות", "אותו בסיס הודעות", "אותו בסיס הודעות", "שלושה סבבים מוקלטים"],
    ["שיחות אנושיות", "אותו בסיס הודעות", "אותו בסיס הודעות", "שלושה סבבים במוקד אנושי"],
    ["שיחות משולבות", "אותו בסיס הודעות", "אותו בסיס הודעות", "שני סבבים מוקלטים וסבב אנושי אחד"],
  ],
};

const PACKAGE_TABLE_PATHS = new Set([
  "/info/guides/cost-rsvp-wedding",
  "/rsvp/whatsapp",
  "/rsvp",
  "/pricing",
]);

export function answerFor(path: string) {
  return PAGE_ANSWERS[path] || "";
}

export function answerHeadingFor(path: string) {
  if (PAGE_ANSWER_HEADINGS[path]) return PAGE_ANSWER_HEADINGS[path];
  if (path.startsWith("/info/guides/")) return "מה חשוב לדעת במדריך הזה?";
  if (path.startsWith("/for/")) return "מה מתאים לסוג האירוע הזה?";
  if (path.startsWith("/rsvp/")) return "איך מתבצע תהליך אישור ההגעה?";
  return "מה חשוב לדעת לפני שמתחילים?";
}

export function answerVisualFor(path: string): AnswerVisual | null {
  if (PAGE_ANSWER_VISUALS[path]) return PAGE_ANSWER_VISUALS[path];
  if (path.startsWith("/for/")) {
    return {
      src: PRODUCT_SHOTS.guestRsvp,
      alt: "מסך אישור הגעה של אורח",
      device: "phone",
    };
  }
  if (path.startsWith("/info/guides/")) {
    return {
      src: PRODUCT_SHOTS.dashboard,
      alt: "דשבורד Invistimo",
      device: "laptop",
    };
  }
  return null;
}

export function tableFor(path: string) {
  if (PACKAGE_TABLE_PATHS.has(path)) {
    return PACKAGE_COMPARISON;
  }
  return null;
}

export function assertKeywordCoverage(rows: KeywordRow[]) {
  return rows.every((row) => row.volume === null && row.competition === null && row.primaryPath.startsWith("/"));
}
