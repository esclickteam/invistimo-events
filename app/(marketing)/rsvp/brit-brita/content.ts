export const BRIT_PATH = "/rsvp/brit-brita";

export const BRIT_META = {
  title: "אישורי הגעה לברית ובריתה | הזמנות דיגיטליות | Invistimo",
  description:
    "אישורי הגעה לברית ולבריתה: הזמנה דיגיטלית מהירה, איסוף תשובות, מספר מגיעים והושבה משפחתית. מתאים לתכנון בזמן קצר — בלי להציג תאריך משוער כמחייב.",
} as const;

export const BRIT_H1 = "אישורי הגעה לברית ובריתה — מארגנים את השמחה בקלות";

export const WHY_POINTS = [
  {
    title: "גם באירוע קטן חשוב לדעת מי מגיע",
    body: "רשימה קצרה עדיין מתפזרת בין הודעות. אישור מסודר חוסך בלבול מול המקום והמשפחה.",
  },
  {
    title: "תכנון בזמן קצר",
    body: "ברית ובריתה לעיתים מתארגנות במהירות. הזמנה דיגיטלית וקישור אישי עוזרים לאסוף תשובות בלי לחכות לדפוס.",
  },
  {
    title: "מספר מגיעים מדויק יותר",
    body: "למסעדה, לאולם קטן או לבית — חשוב לדעת כמה מבוגרים וכמה ילדים צפויים.",
  },
  {
    title: "נוחות לסבים ולמשפחה",
    body: "קישור ברור בטלפון, בלי אפליקציה, עם אפשרות לעדכן תשובה אם משהו משתנה.",
  },
] as const;

export const BRIT_VS_BRITA = [
  {
    title: "ברית",
    body: "לעיתים התאריך תלוי בשיקולים רפואיים והלכתיים. אל תציגו תאריך משוער כמחייב בהזמנה עד שהוא סגור באמת.",
  },
  {
    title: "בריתה",
    body: "לרוב גמישות רבה יותר בבחירת המועד — עדיין כדאי לאשר הגעה כשהפרטים (שעה, מקום, כתובת) יציבים.",
  },
  {
    title: "משותף לשניהם",
    body: "אותו מודל: רשימת מוזמנים, הזמנה דיגיטלית, קישור אישי ואיסוף תשובות במקום אחד.",
  },
] as const;

export const WHO_TO_INVITE = [
  {
    title: "משפחה קרובה",
    body: "הורים, סבים, אחים ובני דודים — לעיתים עם ילדים קטנים שדורשים מקום והתאמות.",
  },
  {
    title: "חברים קרובים",
    body: "מעגל אינטימי יותר מחתונה — עדיין שווה לאשר הגעה כדי לא להכין מנות מיותרות.",
  },
  {
    title: "שכנים ומכרים",
    body: "מי שחשוב לכם לשתף בשמחה, עם מעקב סטטוס פשוט.",
  },
] as const;

export const FAST_FLOW = [
  {
    n: "01",
    title: "מעלים רשימה קצרה",
    body: "שמות ומספרי טלפון למי שצריך לקבל הודעה.",
  },
  {
    n: "02",
    title: "שולחים הזמנה דיגיטלית",
    body: "פרטי המקום והשעה — כשהם סגורים מספיק.",
  },
  {
    n: "03",
    title: "אוספים תשובות",
    body: "כל אורח מאשר בקישור האישי; אתם רואים את התמונה במערכת.",
  },
  {
    n: "04",
    title: "סוגרים מספר מגיעים",
    body: "מול הבית, המסעדה או האולם — עם רשימה מעודכנת.",
  },
] as const;

export const COMFORT_POINTS = [
  {
    title: "נגישות לסבים",
    body: "בדקו חניה, מעלית, כיסאות נוחים ומרחק קצר מהכניסה לשולחן.",
  },
  {
    title: "נוחות לתינוקות וילדים",
    body: "פינת החתלה, שקט יחסי, עגלות ומקום לעגלה — משפיעים על כמה משפחות יישארו לאורך האירוע.",
  },
  {
    title: "בית / מסעדה / אולם",
    body: "בבית חשובה קיבולת אמיתית; במסעדה — הזמנת שולחנות; באולם קטן — דד־ליין למנות.",
  },
] as const;

export const VENUE_CHECKS = [
  "קיבולת ריאלית למספר המוזמנים",
  "נגישות להורים מבוגרים",
  "מקום לעגלות ולתינוקות",
  "חניה או הגעה בתחבורה",
  "שעה שמתאימה גם לילדים קטנים",
  "מדיניות עדכון מספר מנות / ביטולים",
] as const;

export const CHECKLIST_ITEMS = [
  { id: "date-open", label: "התאריך סגור מספיק להזמנה (לא רק הערכה)" },
  { id: "list", label: "רשימת משפחה וחברים מוכנה" },
  { id: "phones", label: "מספרי טלפון למי שצריך הודעה" },
  { id: "venue", label: "מקום ושעה סופיים (בית / מסעדה / אולם)" },
  { id: "access", label: "נגישות לסבים ולעגלות נבדקה" },
  { id: "invite", label: "הזמנה דיגיטלית מוכנה" },
  { id: "send", label: "שליחת הזמנות / אישורי הגעה" },
  { id: "count", label: "סגירת מספר מגיעים מול המקום" },
] as const;

export const CHECKLIST_STORAGE_KEY = "invistimo-brit-brita-checklist-v1";

export const HOW_STEPS = [
  {
    n: "01",
    title: "מכינים רשימה",
    body: "גם אם היא קצרה — עדיף במקום אחד.",
  },
  {
    n: "02",
    title: "מגדירים פרטים",
    body: "תאריך סגור, שעה, כתובת והערות הגעה.",
  },
  {
    n: "03",
    title: "שולחים קישור אישי",
    body: "WhatsApp לפי החבילה — בלי ייבוא אוטומטי מקבוצות.",
  },
  {
    n: "04",
    title: "האורחים משיבים",
    body: "מגיעים / לא מגיעים ומספר משתתפים.",
  },
  {
    n: "05",
    title: "עוקבים ומשלימים",
    body: "רואים מי בהמתנה ומזכירים לפי הצורך.",
  },
  {
    n: "06",
    title: "סוגרים מול המקום",
    body: "מספר מעודכן להושבה משפחתית או הזמנת שולחנות.",
  },
] as const;

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
  mitzvah: "/rsvp/bar-bat-mitzvah",
  chatuna: "/rsvp/chatuna",
} as const;

export const MEDIA = {
  invite: "/marketing/invites/invite-brit.webp",
  phoneWhatsapp: "/images/rsvp/brit-brita/phone-whatsapp.jpg",
  phoneRsvp: "/images/rsvp/brit-brita/phone-rsvp-form.jpg",
  dashboard: "/images/rsvp/brit-brita/dashboard-guests.jpg",
  seating: "/images/rsvp/brit-brita/dashboard-seating.jpg",
  og: "/images/rsvp/brit-brita/og-cover.webp",
} as const;

export const FAQ_TOPICS = [
  {
    id: "basics",
    title: "יסודות לברית ובריתה",
    ids: ["why-small", "short-notice", "brit-vs-brita", "date-medical", "who"],
  },
  {
    id: "flow",
    title: "הזמנה ותשובות",
    ids: ["fast-invite", "when", "update", "app", "no-scrape"],
  },
  {
    id: "place",
    title: "מקום, נגישות והושבה",
    ids: ["home", "restaurant", "grandparents", "babies", "seating"],
  },
  {
    id: "ops",
    title: "רשימה ומחיר",
    ids: ["headcount", "records", "price", "mobile", "same-system"],
  },
] as const;
