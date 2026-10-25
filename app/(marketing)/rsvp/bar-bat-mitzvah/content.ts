export const MITZVAH_PATH = "/rsvp/bar-bat-mitzvah";

export const MITZVAH_META = {
  title: "אישורי הגעה לבר ובת מצווה וסידורי הושבה | Invistimo",
  description:
    "אישורי הגעה לבר ובת מצווה: הזמנות דיגיטליות, אישור דרך ההורים, רשומות בלי טלפון שלא נגרעות מהמכסה, ומעקב מוזמנים. סידורי הושבה והושבה חיה — בהתאם לחבילה.",
} as const;

export const MITZVAH_H1 =
  "אישורי הגעה לבר ובת מצווה — הזמנות, מוזמנים וסידורי הושבה";

export const WHY_POINTS = [
  {
    title: "מספר מגיעים ברור",
    body: "משפחה, חברים לכיתה ואורחים נוספים — בלי לנחש כמה מקומות להכין.",
  },
  {
    title: "פחות רדיפה אחרי תשובות",
    body: "קישור אישי והורים שמאשרים עבור הילדים, במקום עשרות הודעות בקבוצת הכיתה.",
  },
  {
    title: "הושבה מסודרת",
    body: "משפחה ליד משפחה, חברים ליד חברים — כשיש תשובות מעודכנות.",
  },
  {
    title: "רשומות גמישות",
    body: "אפשר לשמור שמות בלי טלפון לרשימה הפנימית — בלי לגרוע ממכסת הרשומות בתשלום.",
  },
] as const;

export const WHO_TO_INVITE = [
  {
    title: "משפחה משני הצדדים",
    body: "סבים, דודים, בני דודים וקרובים שמגיעים עם בני זוג וילדים — רשומה אחת יכולה לייצג משפחה שלמה.",
  },
  {
    title: "חברים לכיתה ולחוג",
    body: "ההזמנה מגיעה להורים; הם מאשרים הגעה ומספר מגיעים. אין צורך שהילד ינהל את הרשימה.",
  },
  {
    title: "חברים של ההורים",
    body: "שכנים, חברים מהעבודה ומכרים קרובים — עם מעקב סטטוס כמו בכל אירוע.",
  },
  {
    title: "אורחים מיוחדים",
    body: "מורות, מדריכים או אורחים שרוצים לכלול ברשימה גם בלי מספר טלפון לשליחה.",
  },
] as const;

export const CLASSMATES_POINTS = [
  {
    title: "קבוצת WhatsApp של הכיתה",
    body: "אפשר לשתף שם קישור כללי או לבקש מההורים להישאר מעודכנים — אבל האישור עצמו נעשה בקישור האישי, לא כ«סריקה» אוטומטית של הקבוצה.",
  },
  {
    title: "ההורים מאשרים",
    body: "ברוב המקרים ההורה פותח את הקישור, בוחר אם מגיעים וכמה, ושולח. זה מתאים במיוחד כשהמוזמנים הם ילדים.",
  },
  {
    title: "בלי ייבוא אוטומטי מוואטסאפ",
    body: "Invistimo לא סורקת קבוצות WhatsApp ולא מייבאת אנשי קשר לבד. הרשימה נבנית על ידיכם — ואז נשלחות הודעות מסודרות.",
  },
] as const;

export const QUOTA_EXAMPLES = [
  {
    title: "רשומה עם טלפון",
    body: "משפחת כהן עם מספר נייד — נשלחת הודעה ונספרת במכסת הרשומות של החבילה.",
  },
  {
    title: "רשומה בלי טלפון",
    body: "שם של חבר לכיתה לשריון מקום פנימי — נשמר ברשימה, לא נגרע מהמכסה, ולא ניתן להוסיף לו טלפון אחר כך.",
  },
  {
    title: "ראש = לא בהכרח רשומה",
    body: "משפחה של ארבעה יכולה להיות רשומה אחת עם מספר מגיעים. החיוב הוא לפי רשומות עם טלפון, לא לפי ספירת ראשים.",
  },
] as const;

export const RECORD_VS_HEADCOUNT = [
  {
    label: "רשומה",
    body: "יחידת ניהול ברשימה — אדם, זוג או משפחה. כשיש טלפון היא יכולה לקבל הודעה ונגרעת מהמכסה.",
  },
  {
    label: "משתתפים / מגיעים",
    body: "מספר האנשים שצפויים להגיע בפועל — חשוב לאולם, לאוכל ולהושבה, אבל לא זהה למספר הרשומות המחויבות.",
  },
] as const;

export const SEATING_POINTS = [
  {
    title: "משפחה וחברים בנפרד",
    body: "אפשר לקבץ שולחנות למשפחה מצד אחד, חברים לכיתה מצד שני, ואורחים נוספים — לפי מה שנוח לכם.",
  },
  {
    title: "הושבה במערכת",
    body: "כשהתוספת פעילה, אפשר לשבץ לפי רשימת המאשרים ולשלוח מספר שולחן בהתאם לשירותים שנבחרו.",
  },
  {
    title: "הושבה חיה וצוות",
    body: "שירותי הושבה חיה (LIVE) וצוות באולם קיימים במוצר — וזמינים בהתאם לחבילה ולמה שסוכם. לא כל מסלול כולל אותם אוטומטית.",
  },
] as const;

export const PLANNING_CARDS = [
  {
    title: "בחירת מקום",
    body: "אולם, גן, מסעדה או חלל קהילתי — בדקו קיבולת, נגישות להורים וסבים, ואזור פעילות לילדים.",
  },
  {
    title: "אוכל ופעילויות",
    body: "תפריט מבוגרים וילדים, עמדת פעילות או מוזיקה — ככל שיש תשובות מוקדמות, קל יותר להיערך מול הספקים.",
  },
  {
    title: "בטיחות והסעות",
    body: "מי מביא את החברים לכיתה, מי אוסף, והאם נדרש ליווי של מבוגר. אפשר לציין הערות ברשומה.",
  },
  {
    title: "מתי שולחים",
    body: "הזמנה כשהפרטים סגורים; אישורי הגעה לרוב קרוב יותר לאירוע — עם זמן לסבב נוסף לפני סגירת המספרים.",
  },
] as const;

export const HOW_STEPS = [
  {
    n: "01",
    title: "בונים רשימת מוזמנים",
    body: "משפחה, כיתה ואורחים נוספים — עם או בלי טלפון לפי הצורך.",
  },
  {
    n: "02",
    title: "מגדירים את האירוע",
    body: "תאריך, שעה, מקום והזמנה דיגיטלית לבר או לבת מצווה.",
  },
  {
    n: "03",
    title: "שולחים קישור אישי",
    body: "הודעת WhatsApp להורים או לאורחים — בלי ייבוא אוטומטי מקבוצות.",
  },
  {
    n: "04",
    title: "מאשרים הגעה",
    body: "ההורים בוחרים מגיעים / לא מגיעים ומספר משתתפים.",
  },
  {
    n: "05",
    title: "עוקבים בדשבורד",
    body: "רואים מי ענה, מי בהמתנה וכמה מגיעים מצטברים.",
  },
  {
    n: "06",
    title: "מתקדמים להושבה",
    body: "שיבוץ, הושבה חיה או צוות — בהתאם לחבילה שנבחרה.",
  },
] as const;

export const CHECKLIST_ITEMS = [
  { id: "list", label: "רשימת משפחה וחברים לכיתה מוכנה" },
  { id: "phones", label: "מספרי טלפון להורים שצריכים לקבל הודעה" },
  { id: "nophone", label: "שמות פנימיים בלי טלפון — אם צריך שריון מקום בלבד" },
  { id: "venue", label: "מקום, שעה ותאריך סגורים מספיק להזמנה" },
  { id: "invite", label: "הזמנה דיגיטלית מוכנה (בר או בת)" },
  { id: "deadline", label: "יודעים מתי המקום מבקש מספר סופי" },
  { id: "transport", label: "הסעות / ליווי לחברים לכיתה מסודרים" },
  { id: "seating", label: "החלטה אם נדרשת הושבה / הושבה חיה בחבילה" },
  { id: "send", label: "מועד לשליחת אישורי הגעה נקבע" },
  { id: "followup", label: "זמן לסבב תזכורת לפני סגירת המספרים" },
] as const;

export const CHECKLIST_STORAGE_KEY = "invistimo-bar-bat-mitzvah-checklist-v1";

export const LINKS = {
  pricing: "/pricing",
  rsvp: "/rsvp",
  whatsapp: "/rsvp/whatsapp",
  invitations: "/invitations/chatuna",
  seating: "/seating-explained",
  whenToSend: "/info/guides/when-to-send-rsvp",
  guestList: "/info/guides/guest-list",
  venueGuarantee: "/info/guides/wedding-venue-guest-guarantee",
  costGuide: "/info/guides/cost-rsvp-wedding",
  contact: "/contact",
  chatuna: "/rsvp/chatuna",
} as const;

export const MEDIA = {
  barInvite: "/marketing/invites/invite-bar-mitzvah.webp",
  batInvite: "/marketing/invites/invite-bat-mitzvah.webp",
  barHero: "/images/rsvp/bar-mitzvah/hero-atmosphere.jpg",
  batHero: "/images/rsvp/bat-mitzvah/hero-atmosphere.jpg",
  barClassmates: "/images/rsvp/bar-mitzvah/classmates-tables.jpg",
  batClassmates: "/images/rsvp/bat-mitzvah/classmates-tables.jpg",
  phoneWhatsapp: "/images/rsvp/bar-mitzvah/phone-whatsapp.jpg",
  phoneRsvp: "/images/rsvp/bar-mitzvah/phone-rsvp-form.jpg",
  phoneThanks: "/images/rsvp/bar-mitzvah/phone-thanks.jpg",
  dashboard: "/images/rsvp/bar-mitzvah/dashboard-guests.jpg",
  seating: "/images/rsvp/bar-mitzvah/dashboard-seating.jpg",
  og: "/images/rsvp/bar-mitzvah/og-cover.jpg",
} as const;

export const FAQ_TOPICS = [
  {
    id: "basics",
    title: "יסודות לבר ובת מצווה",
    ids: ["why", "bar-vs-bat", "who", "when", "invite-first"],
  },
  {
    id: "class",
    title: "כיתה והורים",
    ids: ["parents", "whatsapp-group", "no-scrape", "kids-phones", "update"],
  },
  {
    id: "quota",
    title: "רשומות, טלפון ומחיר",
    ids: ["no-phone", "cannot-add-phone", "record-vs-people", "price", "family-one"],
  },
  {
    id: "ops",
    title: "הושבה, מקום ותפעול",
    ids: ["seating", "live-seating", "safety", "venue", "app", "mobile", "export"],
  },
] as const;
