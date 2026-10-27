import type { Metadata } from "next";
import { resolveAppEnv } from "@/lib/env/appEnv";

export const SITE_URL = "https://www.invistimo.com";
export const SITE_NAME = "Invistimo";
export const CONTENT_UPDATED = new Date("2026-10-27T10:00:00.000Z");

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
      "אישורי הגעה לחתונה ולאירועים עם הודעות WhatsApp, קישור אישי לכל אורח, מעקב תשובות בזמן אמת ואפשרות לשיחות ותזכורות. הכירו את Invistimo.",
    changeFrequency: "monthly",
    priority: 0.95,
  },
  {
    path: "/rsvp/chatuna",
    title: "אישורי הגעה לחתונה בוואטסאפ | Invistimo",
    description:
      "אישורי הגעה לחתונה עם הודעות WhatsApp, קישור אישי לכל אורח, מעקב תשובות ואפשרות לשלב שיחות וסידורי הושבה. גלו איך Invistimo עובדת.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/rsvp/hina",
    title: "אישורי הגעה לחינה וסידורי הושבה | Invistimo",
    description:
      "מתכננים חינה? אישורי הגעה, הזמנות דיגיטליות וסידורי הושבה לחינה — גם לאירוע קטן. מנהלים מוזמנים, שולחנות והגעה בפועל עם Invistimo.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/rsvp/bar-bat-mitzvah",
    title: "אישורי הגעה לבר ובת מצווה וסידורי הושבה | Invistimo",
    description:
      "אישורי הגעה לבר ובת מצווה: הזמנות דיגיטליות, אישור דרך ההורים, רשומות בלי טלפון שלא נגרעות מהמכסה, ומעקב מוזמנים. סידורי הושבה והושבה חיה — בהתאם לחבילה.",
    changeFrequency: "monthly",
    priority: 0.88,
  },
  {
    path: "/rsvp/brit-brita",
    title: "אישורי הגעה לברית ובריתה | הזמנות דיגיטליות | Invistimo",
    description:
      "אישורי הגעה לברית ולבריתה: הזמנה דיגיטלית מהירה, איסוף תשובות, מספר מגיעים והושבה משפחתית. מתאים לתכנון בזמן קצר — בלי להציג תאריך משוער כמחייב.",
    changeFrequency: "monthly",
    priority: 0.88,
  },
  {
    path: "/rsvp/whatsapp",
    title: "אישורי הגעה בוואטסאפ לאירועים | Invistimo",
    description:
      "אישורי הגעה ב־WhatsApp עם קישור אישי לאורחים, סבבי הודעות ומעקב תשובות במקום אחד. גלו איך Invistimo עוזרת לנהל את רשימת המוזמנים.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/rsvp/calls",
    title: "אישורי הגעה בשיחות טלפון | שיחות AI ומוקד אנושי — Invistimo",
    description:
      "אישורי הגעה בשיחות מוקלטות עם קריינות AI ובמוקד אנושי. מעקב אחרי מי שלא ענה, שיחות חוזרות ושילוב עם WhatsApp. הכירו את Invistimo.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/rsvp/save-the-date",
    title: "Save the Date לחתונה ולאירועים | Invistimo",
    description:
      "Save the Date ב־Invistimo הוא הודעת וואטסאפ מוקדמת וחד־פעמית שמודיעה שהתאריך נשמר. לא אוסף אישורי הגעה. זמין כשהאפשרות פתוחה בחשבון.",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/invitations/chatuna",
    title: "הזמנות דיגיטליות לחתונה | עיצובים ואנימציות | Invistimo",
    description:
      "הזמנות דיגיטליות לחתונה בעיצובים יוקרתיים, תבניות מוכנות ואפשרויות התאמה אישית. צפו בדוגמאות, הכירו הזמנות מונפשות ושלבו אישורי הגעה.",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/seating-explained",
    title: "סידורי הושבה לחתונה | הושבה דיגיטלית ו־LIVE | Invistimo",
    description:
      "סידורי הושבה דיגיטליים לחתונה עם מפת שולחנות, שיבוץ אורחים, ניהול הגעה בזמן אמת, מקומות פנויים, רזרבות ואנשי צוות. הכירו את Invistimo.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/event-management",
    title: "מערכת לניהול והפקת אירועים עצמאית | Invistimo",
    description:
      "נהלו את האירוע במקום אחד עם Invistimo: משימות, ספקים, תקציב, תשלומים ולוח זמנים. מערכת עצמאית עם אפשרות לליווי מקצועי וניהול ביום האירוע.",
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
      "מדריכים מעשיים בעברית: מתי שולחים אישורי הגעה, איך עובדת הזמנה דיגיטלית, סידורי הושבה, Save the Date ורשימת מוזמנים.",
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
      "אתר חתונה אישי בעיצוב יוקרתי עם תמונות, סיפור זוגי ופרטי האירוע. צפו בדוגמאות לאתרי חתונה ובחרו עיצוב שמתאים לחתונה שלכם.",
    changeFrequency: "monthly",
    priority: 0.88,
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
