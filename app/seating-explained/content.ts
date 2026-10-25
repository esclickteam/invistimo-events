import { INVISTIMO_WHATSAPP_PHONE, SEATING_ADDON_ILS } from "@/lib/pricing/packageQuote";

export const SEATING_PATH = "/seating-explained";

export const SEATING_META = {
  title: "סידורי הושבה לחתונה | הושבה דיגיטלית ו־LIVE | Invistimo",
  description:
    "סידורי הושבה דיגיטליים לחתונה עם מפת שולחנות, שיבוץ אורחים, ניהול הגעה בזמן אמת, מקומות פנויים, רזרבות ואנשי צוות. הכירו את Invistimo.",
} as const;

export const UPDATED_AT = "2026-10-25";

export const STAFF_WHATSAPP_MESSAGE =
  "שלום, אשמח לקבל פרטים והצעת מחיר לצוותי הושבה וניהול LIVE ביום האירוע. מה השירות כולל?";

export const STAFF_WHATSAPP_URL = `https://wa.me/${INVISTIMO_WHATSAPP_PHONE}?text=${encodeURIComponent(
  STAFF_WHATSAPP_MESSAGE
)}`;

export const LINKS = {
  pricing: "/pricing",
  rsvp: "/rsvp",
  chatuna: "/rsvp/chatuna",
  guestList: "/info/guides/guest-list",
  whenToSend: "/info/guides/when-to-send-rsvp",
  noReply: "/info/guides/guests-who-dont-reply",
  venueGuarantee: "/info/guides/wedding-venue-guest-guarantee",
  costGuide: "/info/guides/cost-rsvp-wedding",
  seatingPlan: "/info/guides/seating-plan",
  tableMessage: "/info/guides/table-number-message",
  contact: "/contact",
  trySeating: "/try/dashboard/seating",
  staffWhatsapp: STAFF_WHATSAPP_URL,
} as const;

export const MEDIA = {
  hall: "/images/rsvp/guides/venue-guarantee-hall.jpg",
  /** Demo floor-plan map only (tables + capacity + free seats). */
  map: "/images/seating/seating-map.png",
  /** Demo guest-assignment sidebar (list, table select, unassigned). */
  assign: "/images/seating/seating-assign.png",
  /** Hero product preview — full seating UI with map + sidebar. */
  heroProduct: "/marketing/product/webp/desktop-try-seating.webp",
  seatingPoster: "/images/rsvp/chatuna/video-seating-poster.jpg",
  mapVideo: "/videos/tablesit.mp4",
  eventVideo: "/videos/eventsit.mp4",
  smartVideo: "/videos/smartsit.mp4",
} as const;

export const PROCESS_STEPS = [
  "רשימת מוזמנים",
  "אישורי הגעה",
  "תכנון שולחנות",
  "שיבוץ אורחים",
  "קבלת פנים",
  "סימון הגעה בפועל",
  "ניהול מקומות פנויים",
  "שימוש ברזרבות",
] as const;

export const WHY_POINTS = [
  "שמירה על קבוצות ומשפחות יחד",
  "ניצול מסודר של קיבולת השולחנות",
  "זיהוי אורחים שעדיין לא שובצו",
  "אפשרות לשינויים לפני האירוע",
  "הפחתת בלבול בכניסה לאולם",
  "ניהול מסודר של מקומות פנויים",
  "תכנון רזרבות",
  "תמונת מצב טובה יותר לצוות ההושבה",
] as const;

export const DIGITAL_CAPABILITIES = [
  "יצירת שולחנות והגדרת קיבולת לכל שולחן",
  "שיבוץ אורחים לשולחנות והעברת שיבוצים",
  "הצגת מספר משובצים מתוך קיבולת — לא סימון «מלא» לפני שהשולחן באמת מלא",
  "הצגת מקומות פנויים ורשימת אורחים שעדיין לא שובצו",
  "הצגת מפת אולם עם שינוי תצוגה וזום",
  "התאמת סידורי ההושבה לנתוני רשימת המוזמנים ואישורי ההגעה",
] as const;

export const TABLE_EXAMPLES = [
  { name: "שולחן 12", seated: 8, capacity: 10 },
  { name: "שולחן 13", seated: 10, capacity: 10 },
  { name: "שולחן 14", seated: 6, capacity: 12 },
] as const;

export const LIVE_CAPABILITIES = [
  "איתור אורח ברשימת המוזמנים וצפייה בשולחן שאליו שובץ",
  "סימון הגעה בפועל, כולל הגעה חלקית לרשומה",
  "הפרדה בין אישור הגעה מוקדם לבין נוכחות ביום האירוע",
  "צפייה במצב השולחנות ומעקב אחר מספר המגיעים בפועל",
  "עדכון שיבוצים במהלך האירוע לפי הרשאות",
  "שחרור מפורש של כיסאות עודפים אחרי שסומנה הגעה בפועל — בלי שחרור אוטומטי למי שעדיין לא הגיע",
] as const;

export const LIVE_STATUS_LEGEND = [
  {
    label: "הגיע בפועל",
    detail: "נוכחות מאומתת במערכת.",
  },
  {
    label: "עדיין לא הגיע",
    detail: "המקום נשמר — אין שחרור אוטומטי.",
  },
  {
    label: "אושר שלא יגיע",
    detail: "אחרי בירור אפשר לשקול שחרור מקום.",
  },
  {
    label: "שוחרר לרזרבה",
    detail: "כיסא שעודכן כזמין בפעולה מפורשת.",
  },
] as const;

export const STAFF_TASKS = [
  "מקבלים את האורחים ומאתרים אותם ברשימה",
  "בודקים לאיזה שולחן שובצו ומסייעים בהכוונה",
  "מעדכנים הגעה בפועל בהתאם להרשאות",
  "מטפלים בשינויים ובהפרשי כמות",
  "מסייעים בניהול מקומות רזרבה",
  "מתאמים החלטות עם האחראי על ההושבה",
] as const;

export const TIMELINE = [
  {
    title: "לפני האירוע",
    body: "מכינים את רשימת המוזמנים ומבצעים אישורי הגעה.",
  },
  {
    title: "לאחר קבלת התשובות",
    body: "משבצים את האורחים בשולחנות ומתכננים מקומות רזרבה.",
  },
  {
    title: "לפני פתיחת קבלת הפנים",
    body: "בודקים שהמפה והרשימות מעודכנות.",
  },
  {
    title: "בתחילת קבלת הפנים",
    body: "הצוות מאתר אורחים ומסמן הגעה בפועל.",
  },
  {
    title: "במהלך קבלת הפנים",
    body: "מזהים פערים בין מספר המאשרים למספר המגיעים.",
  },
  {
    title: "לאחר בירור",
    body: "אם ברור שחלק מהאורחים לא יגיעו, משחררים את המקומות שלהם בפעולה מפורשת במערכת.",
  },
  {
    title: "בהמשך האירוע",
    body: "ממשיכים לעקוב אחר מצב ההושבה ומבצעים שינויים לפי הצורך.",
  },
] as const;

export const SERVICE_TIERS = [
  {
    id: "digital",
    title: "סידורי הושבה דיגיטליים",
    subtitle: "תכנון לפני האירוע",
    body: "מתאים למי שרוצה לתכנן את השולחנות ולנהל את השיבוצים מראש במפת הושבה דיגיטלית.",
    includes: [
      "מפת שולחנות וקיבולת",
      "שיבוץ אורחים",
      "רשימת לא־משובצים",
      `תוספת במחשבון: ${SEATING_ADDON_ILS} ₪`,
    ],
  },
  {
    id: "live",
    title: "סידורי הושבה עם LIVE",
    subtitle: "ניהול ביום האירוע",
    body: "מתאים למי שרוצה גם לנהל הגעה בפועל ומצב שולחנות בזמן האירוע, בהתאם לחבילה ולהרשאות.",
    includes: [
      "כל יכולות התכנון הדיגיטלי",
      "סימון הגעה בפועל",
      "שחרור מפורש של כיסאות עודפים",
      "תלוי מודולים והרשאות שנפתחו",
    ],
  },
  {
    id: "staff",
    title: "הושבה עם אנשי צוות",
    subtitle: "סיוע פיזי באולם",
    body: "מתאים למי שמעדיף דיילות או צוות קבלה שעובדים עם המערכת ומנהלים את האורחים באולם.",
    includes: [
      "קבלת פנים והכוונה",
      "עבודה מול הרשימה והמפה",
      "תמיכה בניהול רזרבות",
      "מחיר לפי הצעה — לא כלול אוטומטית",
    ],
  },
] as const;

export const COMPARE_ROWS = [
  { feature: "מפת שולחנות ושיבוץ מראש", digital: true, live: true, staff: true },
  { feature: "סימון הגעה בפועל ביום האירוע", digital: false, live: true, staff: true },
  { feature: "שחרור מפורש של כיסאות עודפים", digital: false, live: true, staff: true },
  { feature: "אנשי צוות פיזיים באולם", digital: false, live: false, staff: true },
  { feature: "מופיע במחשבון החבילות הציבורי", digital: true, live: false, staff: false },
] as const;

export const EARLY_RESERVE_POINTS = [
  "תמונת מצב מוקדמת יותר כבר בקבלת הפנים",
  "פחות הסתמכות על ניחושים",
  "אפשרות לתכנון רזרבות דינמי",
  "סיוע בקבלת החלטות לצוות",
  "ניצול טוב יותר של מקומות ישיבה",
  "הפחתת הצורך בשינויים מאוחרים",
] as const;

export const DISTINCTIONS = [
  { label: "מספר רשומות", detail: "שורות ברשימת המוזמנים" },
  { label: "מספר שאישרו הגעה", detail: "כמה אנשים תוכננו להגיע" },
  { label: "מספר ששובצו", detail: "כיסאות שהוקצו במפה" },
  { label: "מספר שהגיעו בפועל", detail: "נוכחות ביום האירוע" },
] as const;
