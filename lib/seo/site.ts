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
    title: "אישורי הגעה וסידורי הושבה | Invistimo",
    description:
      "אישורי הגעה וסידורי הושבה במקום אחד: הזמנה דיגיטלית, מעקב אחרי מי מגיע, והמשך למפת השולחנות. האורחים עונים בקישור, בלי אפליקציה.",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/rsvp",
    title: "אישורי הגעה לאירועים | מערכת ושירות | Invistimo",
    description:
      "שירות ומערכת אישורי הגעה לאירועים: קישור אישי, סבבי הודעות ומעקב תשובות. לחתונה יש עמוד נפרד, ולמחיר יש מדריך נפרד.",
    changeFrequency: "monthly",
    priority: 0.95,
  },
  {
    path: "/rsvp/chatuna",
    title: "אישורי הגעה לחתונה | וואטסאפ, שיחות והושבה | Invistimo",
    description:
      "אישורי הגעה לחתונה: וואטסאפ עם קישור אישי, SMS לתזכורת, שיחות למי שלא ענה, וספירת מגיעים מול האולם. אחר כך ממשיכים להושבה.",
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
      "אישורי הגעה בוואטסאפ: הודעה עם קישור אישי, שני סבבים בחבילת ההודעות ומעקב תשובות. האישור בעמוד שנפתח מהקישור — לא בגוף ההודעה.",
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
    title: "Save the Date | סייב דה דייט לחתונה | Invistimo",
    description:
      "מה זה Save the Date (סייב דה דייט), מתי שולחים ומה כותבים. הודעת וואטסאפ מוקדמת לחתונה — לא הזמנה ולא אישור הגעה.",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/invitations/chatuna",
    title: "הזמנה דיגיטלית לחתונה | מובייל וקישור אישי | Invistimo",
    description:
      "הזמנה דיגיטלית לחתונה שנפתחת בטלפון, עם קישור אישי ואפשרות לאשר הגעה מתוך ההזמנה. דוגמאות ושליחה ב־WhatsApp. ההזמנה כלולה בחבילה.",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/seating-explained",
    title: "סידורי הושבה לחתונה | סידור שולחנות ו־LIVE | Invistimo",
    description:
      "סידורי הושבה וסידור שולחנות לחתונה: חלוקה, מקומות פנויים, מספר שולחן ושינוי ברגע האחרון. מתחילים אחרי אישורי ההגעה.",
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
    title: "חבילות אישורי הגעה | מה כלול במחיר | Invistimo",
    description:
      "חבילות אישורי הגעה לפי רשומות, בלי מסלול חינם. מה כלול, איפה מתנסים במסכים, ואיך זה שונה מגיליון או מקבוצת וואטסאפ. כל המחירים כוללים מע״מ.",
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
    path: "/blog",
    title: "המגזין של Invistimo | אירועים, חתונות ואישורי הגעה",
    description:
      "המגזין של Invistimo: מדריכים לתכנון אירוע, אישורי הגעה, הזמנות דיגיטליות, סידורי הושבה וניהול אורחים בישראל.",
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
    path: "/cookies",
    title: "מדיניות עוגיות | Invistimo",
    description:
      "אילו עוגיות וטכנולוגיות אחסון פועלות באתר Invistimo, לאיזו מטרה, וכיצד מאשרים, דוחים או משנים את הבחירה.",
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
