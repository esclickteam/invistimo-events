import {
  PACKAGES,
  SEATING_ADDON_ILS,
  servicePrice,
  type PackageId,
} from "@/lib/pricing/packageQuote";

/** Illustrative guest-record count for a typical family henna (links to live calculator). */
export const EXAMPLE_RECORDS = 120;

export const HINA_PATH = "/rsvp/hina";

export const HINA_META = {
  title: "אישורי הגעה לחינה וסידורי הושבה | Invistimo",
  description:
    "מתכננים חינה? אישורי הגעה, הזמנות דיגיטליות וסידורי הושבה לחינה — גם לאירוע קטן. מנהלים מוזמנים, שולחנות והגעה בפועל עם Invistimo.",
} as const;

export const CONTENT_UPDATED_LABEL = "עודכן ב־25 באוקטובר 2026";

export const LINKS = {
  pricing: "/pricing",
  rsvp: "/rsvp",
  chatuna: "/rsvp/chatuna",
  whatsapp: "/rsvp/whatsapp",
  invitations: "/invitations/chatuna",
  seating: "/seating-explained",
  eventManagement: "/event-management",
  whenToSend: "/info/guides/when-to-send-rsvp",
  guestList: "/info/guides/guest-list",
  seatingGuide: "/info/guides/seating-plan",
  noReply: "/info/guides/guests-who-dont-reply",
  guides: "/info/guides",
  contact: "/contact",
} as const;

export const MEDIA = {
  heroAtmosphere: "/images/rsvp/hina/hero-atmosphere.jpg",
  reception: "/images/rsvp/hina/reception-atmosphere.jpg",
  inviteHenna: "/marketing/invites/invite-henna.webp",
  phoneWhatsapp: "/images/rsvp/chatuna/phone-whatsapp.jpg",
  phoneRsvp: "/images/rsvp/chatuna/phone-rsvp-form.jpg",
  phoneThanks: "/images/rsvp/chatuna/phone-thanks.jpg",
  dashboardGuests: "/images/marketing-captures/demo/hina-dashboard.webp",
  dashboardSeating: "/images/rsvp/chatuna/dashboard-seating.jpg",
  seatingVideoPoster: "/images/rsvp/chatuna/video-seating-poster.jpg",
  rsvpDashboardPoster: "/images/rsvp/rsvp-steps-live-poster.jpg",
  og: "/images/rsvp/hina/og-hina.jpg",
} as const;

export const SEATING_VIDEO = {
  src: "/videos/smartsit.mp4",
  poster: MEDIA.seatingVideoPoster,
  title: "סידורי הושבה דיגיטליים לחינה — מפת שולחנות במערכת",
  description:
    "המחשה מתוך מערכת Invistimo: שיבוץ אורחים לשולחנות ומעקב אחר מקומות משובצים ופנויים.",
  uploadDate: "2026-10-25",
} as const;

export const RSVP_BENEFITS = [
  "יודעים מי אישר הגעה.",
  "יודעים כמה משתתפים צפויים בכל רשומה.",
  "מזהים אורחים שעדיין לא השיבו.",
  "מתכננים טוב יותר את מספר המקומות.",
  "מעדכנים את רשימת המוזמנים כשיש שינויים.",
  "מתכוננים לאירוע בצורה מסודרת יותר.",
] as const;

export const SEATING_CAPABILITIES = [
  "הגדרת שולחנות וקיבולת.",
  "שיבוץ אורחים.",
  "העברת אורחים בין שולחנות.",
  "הצגת מספר משובצים מתוך הקיבולת.",
  "זיהוי אורחים שלא שובצו.",
  "מפת הושבה דיגיטלית.",
  "מעקב אחר מקומות פנויים.",
] as const;

export const FAMILY_CONSIDERATIONS = [
  "בני משפחה שרוצים לשבת יחד.",
  "משפחות משני הצדדים.",
  "אורחים מבוגרים.",
  "אורחים עם צרכי נגישות.",
  "משפחות שמגיעות עם ילדים.",
  "חברים שמכירים זה את זה.",
  "אורחים שמעדיפים מקום שקט יותר.",
  "מרחק מרחבת הריקודים ומהמוזיקה.",
] as const;

export const PLANNING_TIPS = [
  {
    id: "guest-list",
    eyebrow: "רשימת המוזמנים",
    title: "למי שולחים הזמנה לחינה?",
    body: "לפני שסוגרים מספר מנות, כדאי להכין רשימה מסודרת של המשפחה הקרובה, המשפחה המורחבת והחברים. חשוב לתאם בין שתי המשפחות ולנהל אישורי הגעה כדי לדעת כמה משתתפים צפויים להגיע.",
    image: "/images/rsvp/hina/tip-guests.jpg",
    imageAlt:
      "אורחים ומשפחה בחגיגת חינה — לבוש חגיגי ואווירת אירוח חמה",
    href: "/rsvp" as string | null,
    linkLabel: "לאישורי הגעה" as string | null,
  },
  {
    id: "venue",
    eyebrow: "המקום והאווירה",
    title: "איך בוחרים מקום שמתאים לחינה?",
    body: "כדאי לבדוק את גודל המקום, אזור הטקס, רחבת הריקודים, הנגישות והמקום לתלבושות. העיצוב, המוזיקה והתאורה צריכים להשתלב עם האופי והמסורת של המשפחה.",
    image: "/images/rsvp/hina/tip-venue.jpg",
    imageAlt:
      "מתחם חינה יוקרתי בעיצוב מרוקאי — פנסים, בדים, פרחים ותאורה חמה",
    href: null,
    linkLabel: null,
  },
  {
    id: "evening",
    eyebrow: "מהלך הערב",
    title: "מה כדאי לתכנן מראש?",
    body: "קבלת הפנים, טקס החינה, החלפת התלבושות, הברכות והריקודים. תכנון סדר הערב עוזר לספקים ולמשפחה לדעת מה צפוי ומתי, בלי להפוך את האירוע לנוקשה.",
    image: "/images/rsvp/hina/tip-ceremony.jpg",
    imageAlt:
      "טקס חינה מסורתי — מגש חינה, תלבושות חגיגיות ואלמנטים אותנטיים",
    href: null,
    linkLabel: null,
  },
  {
    id: "seating",
    eyebrow: "סידורי ההושבה",
    title: "איך דואגים שלכולם יהיה נוח?",
    body: "כדאי לתכנן מראש את חלוקת השולחנות בין המשפחות והחברים, להתחשב באורחים מבוגרים ובצרכים מיוחדים, ולהכין מקומות רזרבה בהתאם למספר המשתתפים.",
    image: "/images/rsvp/hina/tip-seating.jpg",
    imageAlt:
      "שולחנות ערוכים לחינה — בורדו, זהב, כלי הגשה ופרחים",
    href: "/seating-explained" as string | null,
    linkLabel: "לסידורי הושבה" as string | null,
  },
] as const;

export const RSVP_SEND_POINTS = [
  "הודעות WhatsApp בהתאם לשירות הפעיל.",
  "קישור אישי לאישור הגעה.",
  "מעקב אחר תשובות.",
  "מספר משתתפים בכל רשומה.",
  "סבבים נוספים ושיחות בהתאם לחבילה.",
] as const;

export const WORKFLOW_STEPS = [
  {
    n: "01",
    title: "מכינים רשימת מוזמנים",
    body: "שמות, פרטי קשר וקבוצות לפי הצורך.",
  },
  {
    n: "02",
    title: "בוחרים הזמנה דיגיטלית",
    body: "עיצוב שמשקף את אווירת החינה שלכם.",
  },
  {
    n: "03",
    title: "שולחים אישורי הגעה",
    body: "פנייה מסודרת עם קישור אישי, לפי החבילה.",
  },
  {
    n: "04",
    title: "מרכזים תשובות ומספרי משתתפים",
    body: "רואים מי אישר וכמה מגיעים בכל רשומה.",
  },
  {
    n: "05",
    title: "מתכננים סידורי הושבה",
    body: "כשהתוספת נרכשה — משבצים שולחנות ומשפחות.",
  },
  {
    n: "06",
    title: "בודקים מקומות פנויים ורזרבות",
    body: "מתכוננים לשינויים לפני יום החינה.",
  },
  {
    n: "07",
    title: "ביום החינה — קבלת פנים והגעה בפועל",
    body: "אם נבחר שירות LIVE המתאים — עוקבים בזמן אמת.",
  },
  {
    n: "08",
    title: "נהנים מהאירוע",
    body: "המשפחה מתמקדת בשמחה, לא בלוגיסטיקה.",
  },
] as const;

/** Demo illustration only — not real customer data. */
export const DEMO_GUEST_ROWS = [
  { name: "משפחת כהן", group: "משפחת הכלה", status: "מגיעים", count: 4 },
  { name: "משפחת לוי", group: "משפחת החתן", status: "מגיעים", count: 3 },
  { name: "דוד וסבתא מרים", group: "משפחה", status: "מגיעים", count: 2 },
  { name: "נועה ואורי", group: "חברים", status: "טרם השיבו", count: 2 },
  { name: "משפחת אברהם", group: "משפחת הכלה", status: "חלקית", count: 3 },
] as const;

/** Demo table card matching product seating UI pattern (not a fake screenshot). */
export const DEMO_TABLE = {
  label: "שולחן 4",
  seated: 8,
  capacity: 10,
  note: "דוגמת דמו לחינה — 8 מתוך 10 מקומות משובצים",
  family: "משפחת כהן · 4 אורחים יחד",
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

export const FAQ_TOPICS = [
  {
    id: "rsvp-basics",
    title: "אישורי הגעה לחינה",
    ids: ["need-rsvp", "why-not-call", "when-send", "whatsapp", "personal-link", "track-pending"],
  },
  {
    id: "seating",
    title: "סידורי הושבה",
    ids: [
      "need-seating",
      "free-seating",
      "arrange-tables",
      "families-together",
      "elderly",
      "sides-separate",
      "change-table",
      "free-seats",
    ],
  },
  {
    id: "day-of",
    title: "יום החינה, LIVE וצוות",
    ids: ["different-count", "what-is-live", "live-for-hina", "staff", "reserves"],
  },
  {
    id: "product-price",
    title: "הזמנות, רשומות ומחיר",
    ids: ["record-vs-people", "invite-plus-rsvp", "price", "seating-included", "size-80-150"],
  },
] as const;
