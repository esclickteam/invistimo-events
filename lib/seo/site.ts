import type { Metadata } from "next";
import { resolveAppEnv } from "@/lib/env/appEnv";

export const SITE_URL = "https://www.invistimo.com";
export const SITE_NAME = "Invistimo";
export const CONTENT_UPDATED = new Date("2026-10-25T22:00:00.000Z");

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
}): Metadata {
  const index =
    input.index !== undefined ? input.index : defaultPublicIndexable();
  const url = absoluteUrl(input.path);
  const follow = index;

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
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [OG_IMAGE.url],
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
    title: "מערכת ניהול אירועים | Invistimo",
    description:
      "מערכת עצמאית לניהול אירוע: משימות, ספקים, תקציב, תשלומים, לוח זמנים, אישורי הגעה והושבה. אפשר להוסיף ליווי וניהול באולם.",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/pricing",
    title: "חבילות ומחירים לאישורי הגעה | Invistimo",
    description:
      "מחיר Invistimo מחושב לפי מספר רשומות והחבילה: הודעות, שיחות מוקלטות, שיחות אנושיות או משולבות, ותוספות שמופיעות במחשבון.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/faq",
    title: "שאלות ותשובות על אישורי הגעה | Invistimo",
    description:
      "תשובות על אישורי הגעה, וואטסאפ, הזמנות דיגיטליות, הושבה, חבילות ותמיכה במערכת Invistimo.",
    changeFrequency: "monthly",
    priority: 0.75,
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
    title: "יצירת קשר | Invistimo",
    description:
      "דברו עם Invistimo בטופס, בוואטסאפ או בדוא״ל support@invistimo.com על חבילה, אישורי הגעה או ניהול האירוע.",
    changeFrequency: "yearly",
    priority: 0.5,
  },
  {
    path: "/credit-gifts",
    title: "מתנות באשראי לאירוע | Invistimo",
    description:
      "מתנות באשראי דרך ספק סליקה חיצוני. האורח משלם, כולל עמלת סליקה של 2.5% מגובה המתנה, כפי שמפורט בעמוד השירות.",
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    path: "/wedding-website",
    title: "אתר חתונה אישי | בניית אתר חתונה דיגיטלי | Invistimo",
    description:
      "אתר חתונה אישי ב־Invistimo: תבניות חיות, עורך ויזואלי, חוויית אורח, וחיבור להזמנה דיגיטלית ולאישורי הגעה. דוגמאות פעילות מהמוצר.",
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
