import { INVISTIMO_WHATSAPP_PHONE } from "@/lib/pricing/packageQuote";

export const CONTACT_EMAIL = "support@invistimo.com";

export const BUSINESS_HOURS = [
  { label: "א׳–ה׳", value: "09:00–18:00" },
  { label: "שישי וערבי חג", value: "09:00–12:00" },
] as const;

export const WHATSAPP_PREFILL =
  "היי, אשמח לקבל עזרה עם Invistimo ✨\nרוצה להבין איזו חבילה מתאימה לאירוע שלי.";

export const WHATSAPP_URL = `https://wa.me/${INVISTIMO_WHATSAPP_PHONE}?text=${encodeURIComponent(
  WHATSAPP_PREFILL
)}`;

/** Direct AEO answer — also mirrored in PAGE_ANSWERS / answers.json */
export const CONTACT_DIRECT_ANSWER =
  "ניתן ליצור קשר עם Invistimo באמצעות WhatsApp, טופס יצירת הקשר באתר או בדוא״ל support@invistimo.com. אפשר לפנות בשאלות על חבילות, הזמנות דיגיטליות, אישורי הגעה, סידורי הושבה ותמיכה טכנית.";

export const QUICK_HELP_LINKS = [
  {
    href: "/pricing",
    label: "חבילות ומחירים",
    hint: "מחשבון חבילות לפי מספר רשומות",
  },
  {
    href: "/info/guides",
    label: "מרכז המדריכים",
    hint: "מדריכים מעשיים לתכנון האירוע",
  },
  {
    href: "/rsvp",
    label: "אישורי הגעה",
    hint: "WhatsApp, SMS ושיחות לפי חבילה",
  },
  {
    href: "/seating-explained",
    label: "סידורי הושבה",
    hint: "מפת שולחנות ו־LIVE ביום האירוע",
  },
] as const;

export const CONTACT_FAQS: { q: string; a: string }[] = [
  {
    q: "איך אפשר ליצור קשר עם Invistimo?",
    a: "אפשר לפנות ב־WhatsApp העסקי, בטופס יצירת הקשר באתר, או בדוא״ל support@invistimo.com. שלושת הערוצים מגיעים לצוות השירות.",
  },
  {
    q: "מהן שעות הפעילות?",
    a: "ימים א׳–ה׳ בין 09:00 ל־18:00, ובשישי וערבי חג בין 09:00 ל־12:00. פניות מחוץ לשעות ייענו בהקדם האפשרי.",
  },
  {
    q: "איך מקבלים תמיכה טכנית?",
    a: "כתבו בטופס או ב־WhatsApp את פרטי החשבון והבעיה (מסך, שלב בתהליך, או צילום מסך אם רלוונטי). לפנייה בדוא״ל השתמשו ב־support@invistimo.com.",
  },
  {
    q: "האם אפשר לקבל מידע על חבילות לפני רכישה?",
    a: "כן. אפשר לבדוק מחיר במחשבון החבילות, או לפנות אלינו ב־WhatsApp / בטופס עם מספר המוזמנים המשוער ונעזור להתאים חבילה.",
  },
  {
    q: "איך פונים בנושא חיוב ותשלום?",
    a: "שלחו פנייה עם פרטי ההזמנה או החשבון בדוא״ל או בטופס, וציינו את נושא החיוב. נחזור אליכם לכתובת הדוא״ל שתשאירו.",
  },
  {
    q: "האם אפשר לקבל עזרה עם אישורי הגעה?",
    a: "כן. אפשר לפנות לגבי שליחה, מעקב תשובות, תזכורות או התאמת חבילה. לעיון מקדים ראו גם את עמוד אישורי ההגעה ומרכז המדריכים.",
  },
  {
    q: "האם אפשר לקבל עזרה עם סידורי הושבה?",
    a: "כן. נשמח לעזור בשאלות על מפת השולחנות, שיבוץ אורחים או LIVE ביום האירוע — בהתאם למה שכלול בחבילה שלכם.",
  },
  {
    q: "איך פונים בנושא שיתוף פעולה?",
    a: "כתבו בטופס עם הנושא \"שיתוף פעולה\" ופרטו את סוג הפנייה (אולם, ספק, שותף עסקי). אפשר גם לשלוח לדוא״ל support@invistimo.com.",
  },
];

export const CONTACT_BREADCRUMBS = [
  { name: "בית", path: "/" },
  { name: "יצירת קשר", path: "/contact" },
] as const;

export const HERO_IMAGE = {
  src: "/images/contact/hero-rings.webp",
  fallback: "/images/contact/hero-rings.jpg",
  alt: "ידיים של זוג עם טבעות על זר ורדים בגווני שמפניה — צילום editorial לחתונה",
  width: 720,
  height: 900,
} as const;
