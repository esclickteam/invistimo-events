import type { Metadata } from "next";
import { resolveAppEnv } from "@/lib/env/appEnv";

export const SITE_URL = "https://www.invistimo.com";
export const SITE_NAME = "Invistimo";

/** Preview/Staging must not claim indexability in HTML (align with Vercel x-robots-tag). */
export function defaultPublicIndexable() {
  const env = resolveAppEnv();
  return env !== "preview" && env !== "staging";
}

export function absoluteUrl(path: string) {
  // Home canonical/sitemap use the apex without a trailing slash so they match
  // what Next.js emits in <link rel="canonical">.
  if (path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const OG_IMAGE = {
  url: absoluteUrl("/og-invistimo.jpg"),
  width: 1200,
  height: 630,
  alt: "Invistimo",
} as const;

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  /** Absolute URL or site path for Open Graph / Twitter image */
  image?: string;
}): Metadata {
  const index =
    input.index !== undefined ? input.index : defaultPublicIndexable();
  const url = absoluteUrl(input.path);
  const follow = index;
  const ogImage = input.image
    ? {
        url: input.image.startsWith("http")
          ? input.image
          : absoluteUrl(input.image),
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: input.title,
      }
    : OG_IMAGE;

  return {
    title: { absolute: input.title },
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: SITE_NAME,
      locale: "he_IL",
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [ogImage.url],
    },
    robots: {
      index,
      follow,
      googleBot: { index, follow },
    },
  };
}

export const NOINDEX: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export type PublicRoute = {
  path: string;
  title: string;
  description: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
};

export const CORE_PUBLIC_ROUTES: PublicRoute[] = [
  {
    path: "/",
    title: "Invistimo | אישורי הגעה, הזמנות דיגיטליות, הושבה וניהול אירוע",
    description:
      "Invistimo — מערכת ישראלית להזמנות דיגיטליות, אישורי הגעה לאירועים ולחתונה, Save the Date, סידורי הושבה וניהול מוזמנים. WhatsApp, SMS וחוויית אורח פשוטה בלי אפליקציה.",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/rsvp",
    title: "אישורי הגעה לחתונה ולאירועים ב־WhatsApp | Invistimo",
    description:
      "עמוד השירות הראשי לאישורי הגעה: איך עובדים קישור אישי, מעקב תשובות ושיחות לפי החבילה — וממנו עוברים לחתונה, חינה, בר/בת מצווה או ברית/בריתה.",
    changeFrequency: "monthly",
    priority: 0.95,
  },
  {
    path: "/rsvp/chatuna",
    title: "אישורי הגעה לחתונה בוואטסאפ | Invistimo",
    description:
      "אישורי הגעה לחתונה מול האולם והמנות: WhatsApp עם קישור אישי, סבבי תזכורת ושיחות לפי החבילה, מעקב מגיעים וחיבור להושבה.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/rsvp/hina",
    title: "אישורי הגעה לחינה וסידורי הושבה | Invistimo",
    description:
      "אישורי הגעה לחינה למשפחה קרובה: מעקב מגיעים, הושבה לפי קרבה ונוחות, והזמנה דיגיטלית גם באירוע קטן מחתונה.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/rsvp/bar-bat-mitzvah",
    title: "אישורי הגעה לבר ובת מצווה וסידורי הושבה | Invistimo",
    description:
      "אישורי הגעה לבר ובת מצווה עם אישור דרך ההורים, מעקב משפחה מול חברים לכיתה, ורשומות בלי טלפון שלא נגרעות מהמכסה.",
    changeFrequency: "monthly",
    priority: 0.88,
  },
  {
    path: "/rsvp/brit-brita",
    title: "אישורי הגעה לברית ובריתה | הזמנות דיגיטליות | Invistimo",
    description:
      "אישורי הגעה לברית ובריתה בזמן קצר: הזמנה דיגיטלית, מספר מגיעים לבית/מסעדה/אולם קטן — בלי תאריך משוער כמחייב עד שהוא סגור.",
    changeFrequency: "monthly",
    priority: 0.88,
  },
  {
    path: "/rsvp/whatsapp",
    title: "אישורי הגעה בוואטסאפ לאירועים | Invistimo",
    description:
      "אישורי הגעה ב־WhatsApp עם קישור אישי, שני סבבים בחבילת ההודעות ומעקב תשובות. האישור בעמוד שנפתח מהקישור — לא בגוף ההודעה.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/rsvp/calls",
    title: "אישורי הגעה בשיחות טלפון | שיחות AI ומוקד אנושי — Invistimo",
    description:
      "אישורי הגעה בשיחות מוקלטות עם קריינות AI, במוקד אנושי או בשילוב. משלימות WhatsApp למי שלא השיב — בלי הבטחת מענה מלא.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/rsvp/save-the-date",
    title: "Save the Date לחתונה ולאירועים | Invistimo",
    description:
      "Save the Date ב־WhatsApp עם תמונה מעוצבת, מרשימת המוזמנים. לא אוסף אישורי הגעה ולא נספר כסבב אישור. זמין כשהאפשרות פתוחה בחשבון.",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/invitations/chatuna",
    title: "הזמנות דיגיטליות לחתונה | עיצובים ואנימציות | Invistimo",
    description:
      "הזמנה דיגיטלית לחתונה היא העיצוב והקישור שהאורח פותח — נפרד מסבבי אישורי ההגעה. עיצובים, העלאת קובץ ואפשרות חיבור לאישורי הגעה.",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/seating-explained",
    title: "סידורי הושבה לחתונה | הושבה דיגיטלית ו־LIVE | Invistimo",
    description:
      "עמוד השירות להושבה דיגיטלית: מפת שולחנות, שיבוץ מאשרים ו־LIVE ביום האירוע. להחלטות תכנון ולמדריך ביצוע יש מדריכים נפרדים במרכז הידע.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/event-management",
    title: "פלטפורמה לניהול אירועים | Invistimo",
    description:
      "מערכת לניהול האירוע: משימות, ספקים, תקציב ותשלומים במקום אחד. ניהול עצמאי, וליווי או ניהול באולם רק אם סוכמו. אישורי הגעה והושבה בנפרד.",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/pricing",
    title: "מחירון אישורי הגעה לחתונה | חבילות ומחירים – Invistimo",
    description:
      "כמה עולים אישורי הגעה לחתונה? השוו חבילות Invistimo, בחרו מספר רשומות וראו מחירים לאישורי הגעה, שיחות, הזמנות דיגיטליות וסידורי הושבה.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/faq",
    title: "שאלות ותשובות על אישורי הגעה, הושבה והזמנות | Invistimo",
    description:
      "כל התשובות על שירותי Invistimo: אישורי הגעה, הזמנות דיגיטליות, סידורי הושבה, WhatsApp, QR, מחירים וניהול אירועים. מדריכים והסברים במקום אחד.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/info/about",
    title: "אודות Invistimo | אישורי הגעה וניהול אירועים",
    description:
      "Invistimo היא מערכת ישראלית לאישורי הגעה, הזמנות דיגיטליות, סידורי הושבה וניהול אירוע. פרטי המפעיל והקשר כפי שמופיעים באתר.",
    changeFrequency: "yearly",
    priority: 0.6,
  },
  {
    path: "/info/guides",
    title: "מדריכים לאישורי הגעה, הזמנות והושבה | Invistimo",
    description:
      "מרכז הידע של Invistimo: בחירת חברה, רשימת מוזמנים, מחיר, תזמון, אורחים שלא עונים, הושבה LIVE, אתר חתונה וניהול מוזמנים — מדריך אחד לכל כוונת חיפוש.",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    path: "/contact",
    title: "יצירת קשר עם Invistimo | שירות לקוחות ותמיכה",
    description:
      "צריכים עזרה עם Invistimo? צרו קשר ב־WhatsApp, בדוא״ל או באמצעות טופס הפנייה. מידע על חבילות, הזמנות דיגיטליות, אישורי הגעה וסידורי הושבה.",
    changeFrequency: "yearly",
    priority: 0.5,
  },
  {
    path: "/credit-gifts",
    title: "מתנות לחתונה באשראי, bit ו־PayBox | Invistimo",
    description:
      "מתנות לחתונה באשראי דרך RSVP, קישור PayBox ומספר bit להעתקה. הכירו את שלוש אפשרויות המתנה הדיגיטליות ב־Invistimo ואיך משלבים אותן בהזמנה ובאישורי ההגעה.",
    changeFrequency: "monthly",
    priority: 0.72,
  },
  {
    path: "/wedding-website",
    title: "אתר חתונה אישי ומעוצב | תבניות ואתרי חתונה | Invistimo",
    description:
      "אתר חתונה אישי: סיפור, תמונות ופרטי האירוע בקישור משותף. נפרד מהזמנה דיגיטלית ומקישור RSVP אישי. תבניות מוכנות או בדיקת עיצוב אישי.",
    changeFrequency: "monthly",
    priority: 0.88,
  },
  {
    path: "/services/alcohol-management",
    title: "ניהול אלכוהול לאירועים | אנשי צוות ומערכת ממוחשבת | Invistimo",
    description:
      "ניהול אלכוהול לחתונות ולאירועים עם אנשי צוות ומערכת ממוחשבת: ספירת מלאי, הקצאת בקבוקים לברים ולשולחנות, תיעוד פתיחה ודוח סיום. הצעת מחיר מותאמת.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/terms",
    title: "תקנון שימוש | Invistimo",
    description: "תקנון השימוש באתר ובמערכת Invistimo.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/privacy",
    title: "מדיניות פרטיות | Invistimo",
    description: "מדיניות הפרטיות של אתר Invistimo ושל השימוש במערכת.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/accessibility",
    title: "הצהרת נגישות | Invistimo",
    description: "הצהרת הנגישות של אתר Invistimo.",
    changeFrequency: "yearly",
    priority: 0.2,
  },
];

export function findCoreRoute(path: string) {
  return CORE_PUBLIC_ROUTES.find((route) => route.path === path);
}
