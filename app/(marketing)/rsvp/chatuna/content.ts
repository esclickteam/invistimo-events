import {
  PACKAGES,
  SEATING_ADDON_ILS,
  servicePrice,
  type PackageId,
} from "@/lib/pricing/packageQuote";

/** Example guest-record count for illustrative package pricing (links to live calculator). */
export const EXAMPLE_RECORDS = 250;

export const CHATUNA_PATH = "/rsvp/chatuna";

export const CHATUNA_META = {
  title: "אישורי הגעה לחתונה בוואטסאפ | Invistimo",
  description:
    "אישורי הגעה לחתונה עם הודעות WhatsApp, קישור אישי לכל אורח, מעקב תשובות ואפשרות לשלב שיחות וסידורי הושבה. גלו איך Invistimo עובדת.",
} as const;

export const JOURNEY_VIDEO = {
  src: "/videos/rsvp-steps-wa.mp4",
  poster: "/images/rsvp/chatuna/video-journey-poster.jpg",
  title: "מסע אישור ההגעה — מהודעת WhatsApp עד לדשבורד",
  description:
    "המחשה מתוך המערכת: הודעת WhatsApp עם קישור אישי, הזמנת חתונה, בחירת הגעה, מסך תודה והופעת התשובה בדשבורד.",
  uploadDate: "2026-10-25",
} as const;

export const GUESTS_VIDEO = {
  src: "/videos/chatuna-guests.mp4",
  poster: "/images/rsvp/chatuna/video-guests-poster.jpg",
  title: "ניהול רשימת המוזמנים במערכת",
  description: "המחשה של רשימת מוזמנים, סטטוסים ומעקב אחרי מי שעדיין לא ענה.",
  uploadDate: "2026-10-25",
} as const;

export const SEATING_VIDEO = {
  src: "/videos/smartsit.mp4",
  poster: "/images/rsvp/chatuna/video-seating-poster.jpg",
  title: "סידורי הושבה מתוך רשימת המגיעים",
  description: "המחשה של שיבוץ אורחים לשולחנות במפת האולם של Invistimo.",
  uploadDate: "2026-10-25",
} as const;

export const TIMING_VIDEO = {
  src: "/videos/chatuna-timing.mp4",
  poster: "/images/rsvp/chatuna/video-timing-poster.jpg",
  title: "מתי שולחים אישורי הגעה לחתונה — ציר זמן",
  description:
    "המחשת ציר זמן: Save the Date, הזמנה רשמית, סבבי אישורי הגעה וסגירת מספרים מול האולם.",
  uploadDate: "2026-10-25",
} as const;

export const JOURNEY_STEPS = [
  {
    id: "01",
    startSec: 0,
    endSec: 7,
    title: "הודעת WhatsApp עם קישור אישי",
    body: "האורח מקבל הודעה עם קישור שמוביל להזמנה ולאישור ההגעה שלו.",
  },
  {
    id: "02",
    startSec: 7,
    endSec: 10,
    title: "פתיחת הקישור האישי",
    body: "בלי אפליקציה — לחיצה אחת ועוברים להזמנה המעוצבת.",
  },
  {
    id: "03",
    startSec: 10,
    endSec: 18.5,
    title: "הזמנת חתונה מעוצבת",
    body: "תאריך, שעה, מקום ופרטי האירוע במקום אחד וברור.",
  },
  {
    id: "04",
    startSec: 18.5,
    endSec: 25.5,
    title: "בחירת הגעה ומספר מגיעים",
    body: "האורח מסמן מגיעים או לא מגיעים, ואת מספר המגיעים לפי ההגדרות.",
  },
  {
    id: "05",
    startSec: 25.5,
    endSec: 34,
    title: "מסך התודה",
    body: "התשובה נשמרת והאורח רואה שהפעולה הושלמה.",
  },
  {
    id: "06",
    startSec: 34,
    endSec: 42,
    title: "התשובה מופיעה בדשבורד",
    body: "אתם רואים מי אישר, מי לא מגיע וממי עדיין מחכים לתשובה.",
  },
] as const;

export const HOW_STEPS = [
  {
    n: "01",
    title: "מכינים את רשימת המוזמנים",
    body: "שמות, מספרי טלפון וקבוצות לפי הצורך.",
  },
  {
    n: "02",
    title: "מגדירים את פרטי החתונה",
    body: "תאריך, שעה, מקום והזמנה.",
  },
  {
    n: "03",
    title: "שולחים הודעות WhatsApp",
    body: "עם קישור אישי לאישור הגעה.",
  },
  {
    n: "04",
    title: "האורחים משיבים",
    body: "מגיעים, לא מגיעים ומספר המגיעים בהתאם להזמנה.",
  },
  {
    n: "05",
    title: "המערכת מרכזת תשובות",
    body: "רואים את מצב האישורים במקום אחד.",
  },
  {
    n: "06",
    title: "מתקדמים להושבה ולסגירת מספרים",
    body: "לפי השירותים שנבחרו בחבילה.",
  },
] as const;

export const WHY_POINTS = [
  {
    title: "תכנון מספר המנות",
    body: "הבנה טובה יותר של מספר המגיעים הצפוי לפני מסירת המספרים לאולם.",
  },
  {
    title: "סידורי הושבה",
    body: "אפשר להתחיל לשבץ את האורחים שאישרו ולהתאים את סידור השולחנות.",
  },
  {
    title: "פחות אי־ודאות",
    body: "רואים מי ענה, מי לא מגיע וממי עדיין מחכים לתשובה.",
  },
  {
    title: "פחות עומס על הזוג והמשפחה",
    body: "תהליך מסודר במקום לרדוף ידנית אחרי כל אורח.",
  },
] as const;

export const CHAOS_QUOTES = [
  "אנחנו כנראה מגיעים, נעדכן.",
  "תזכירי לי באיזה יום החתונה?",
  "אנחנו ארבעה או חמישה, עוד לא סגור.",
  "שלחתי תשובה לאמא שלך.",
] as const;

export const FOLLOW_UP_PATHS = [
  {
    title: "הודעות WhatsApp",
    body: "סבבי אישורי הגעה עם קישור אישי — שני סבבים בחבילת ההודעות.",
  },
  {
    title: "שיחות מוקלטות",
    body: "מסלול שיחות בהתאם לחבילה ולתהליך המוגדר במערכת.",
  },
  {
    title: "מוקד שיחות אנושי",
    body: "אפשרות להשלמת אישורים באמצעות נציגים, בהתאם לחבילה.",
  },
] as const;

export const TIMELINE = [
  {
    when: "כמה חודשים לפני",
    title: "Save the Date",
    body: "כאשר רוצים לאפשר לאורחים לשריין את התאריך.",
  },
  {
    when: "כחודש עד חודש וחצי לפני",
    title: "הזמנה רשמית",
    body: "בהתאם למועד שבו פרטי האירוע סגורים.",
  },
  {
    when: "כשבועיים עד שבועיים וחצי לפני",
    title: "תחילת סבבי אישורי ההגעה",
    body: "בהתאם לתוכנית ולדדליין של האולם.",
  },
  {
    when: "לפני מסירת המספרים",
    title: "השלמת פניות",
    body: "עדכון הרשימה לפני שמעבירים מספר מנות לאולם.",
  },
] as const;

export const SEASON_CARDS = [
  {
    title: "חתונת קיץ",
    body: "חופשות משפחתיות, טיסות והחופש הגדול יכולים להשפיע על זמינות האורחים. כדאי להודיע על התאריך מוקדם, אך להפריד בין שריון התאריך לבין אישור ההגעה הסופי.",
  },
  {
    title: "חתונה סמוך לחגים",
    body: "פסח, חגי תשרי וחופשות יכולים להשפיע על תוכניות המשפחה ועל זמינות האורחים. יש להתחשב בלוח השנה ובמועד שבו האולם מבקש תשובות.",
  },
  {
    title: "אורחים שמגיעים מחו״ל",
    body: "מי שצריך להזמין טיסה ומלון זקוק להודעה מוקדמת יותר. אפשר לשלוח מידע על התאריך זמן רב מראש ולאסוף אישור סופי בשלב מתאים בהמשך.",
  },
] as const;

export const PREP_ITEMS = [
  "רשימת מוזמנים מעודכנת עם מספרי טלפון.",
  "תאריך, שעה ומיקום סופיים של החתונה.",
  "מועד אחרון למסירת מספר המנות לאולם.",
  "החלטה לגבי סוג חבילת אישורי ההגעה והאם נדרשות שיחות.",
] as const;

export const STORY_STEPS = [
  {
    title: "שלב ראשון",
    body: "מכינים רשימת מוזמנים ומוודאים שהפרטים נכונים.",
  },
  {
    title: "שלב שני",
    body: "שולחים את ההזמנה ומתחילים סבב אישורי הגעה במועד המתאים.",
  },
  {
    title: "שלב שלישי",
    body: "האורחים מאשרים הגעה דרך הקישור האישי.",
  },
  {
    title: "שלב רביעי",
    body: "עוקבים אחרי מי שעדיין לא ענה ומבצעים סבבים נוספים לפי החבילה.",
  },
  {
    title: "שלב חמישי",
    body: "מרכזים את מספר המגיעים ומתקדמים לסידורי ההושבה.",
  },
  {
    title: "שלב שישי",
    body: "מגיעים ליום החתונה עם רשימה מעודכנת יותר.",
  },
] as const;

/** Demo illustration only — not real customer data. */
export const DEMO_GUEST_ROWS = [
  { name: "נועה כהן", side: "צד הכלה", status: "מגיעה", count: 2 },
  { name: "יוסי לוי", side: "צד החתן", status: "מגיע", count: 3 },
  { name: "משפחת אברהם", side: "צד הכלה", status: "טרם ענו", count: 4 },
  { name: "דנה מזרחי", side: "חברים", status: "לא מגיעה", count: 1 },
  { name: "אורי שמש", side: "צד החתן", status: "מגיע", count: 2 },
] as const;

export const LINKS = {
  pricing: "/pricing",
  rsvp: "/rsvp",
  whatsapp: "/rsvp/whatsapp",
  invitations: "/invitations/chatuna",
  seating: "/seating-explained",
  whenToSend: "/info/guides/when-to-send-rsvp",
  noReply: "/info/guides/guests-who-dont-reply",
  mealWaste: "/info/guides/reduce-meal-waste",
  contact: "/contact",
} as const;

export const MEDIA = {
  invite: "/marketing/invites/invite-wedding-mia-alon.webp",
  phoneWhatsapp: "/images/rsvp/chatuna/phone-whatsapp.jpg",
  phoneInvite: "/images/rsvp/chatuna/phone-invite.jpg",
  phoneRsvp: "/images/rsvp/chatuna/phone-rsvp-form.jpg",
  phoneThanks: "/images/rsvp/chatuna/phone-thanks.jpg",
  dashboard: "/images/rsvp/chatuna/dashboard-guests.jpg",
  seating: "/images/rsvp/chatuna/dashboard-seating.jpg",
  og: "/images/rsvp/chatuna/og-chatuna.jpg",
} as const;

export type PackageCard = {
  id: PackageId;
  name: string;
  hebrewName: string;
  badge: string;
  description: string;
  features: string[];
  waRounds: string;
  callRounds: string;
  seating: string;
  examplePriceIls: number;
};

export const PACKAGE_CARDS: PackageCard[] = (
  ["messages", "voice", "personal"] as PackageId[]
).map((id) => {
  const pkg = PACKAGES[id];
  const callRounds =
    id === "messages"
      ? "ללא שיחות בחבילה זו"
      : id === "voice"
        ? "3 סבבי שיחות מוקלטות"
        : "3 סבבי שיחות במוקד אנושי";
  return {
    id,
    name: pkg.name,
    hebrewName: pkg.hebrewName,
    badge: pkg.badge,
    description: pkg.description,
    features: pkg.features,
    waRounds: "2 סבבי WhatsApp לאישור הגעה",
    callRounds,
    seating: `הושבה דיגיטלית בתוספת ${SEATING_ADDON_ILS} ₪`,
    examplePriceIls: servicePrice(id, EXAMPLE_RECORDS),
  };
});

export const COMPARE_OPTIONS = [
  {
    id: "messages" as const,
    title: "הודעות בלבד",
    body: "מתאים למי שמעדיפים תהליך דיגיטלי ומעקב אחרי התשובות.",
  },
  {
    id: "voice" as const,
    title: "הודעות ושיחות מוקלטות",
    body: "מתאים למי שרוצים להוסיף פנייה טלפונית למוזמנים שעדיין לא השיבו.",
  },
  {
    id: "personal" as const,
    title: "הודעות ומוקד אנושי",
    body: "מתאים למי שמעוניינים לשלב גם פנייה אנושית כחלק מהשלמת התשובות.",
  },
] as const;

export const FAQ_TOPICS = [
  {
    id: "basics",
    title: "יסודות",
    ids: ["why", "when", "why-not-early", "std-diff", "small"],
  },
  {
    id: "whatsapp",
    title: "WhatsApp ואורחים",
    ids: ["how-wa", "app", "multi", "update", "abroad", "summer"],
  },
  {
    id: "followup",
    title: "מי שלא עונה ושיחות",
    ids: ["no-reply", "calls", "who-pending", "rounds", "reminder"],
  },
  {
    id: "ops",
    title: "רשימה, הושבה ומחיר",
    ids: ["sides", "seating", "table", "money", "no-show", "price", "export", "mobile", "invite-diff"],
  },
] as const;
