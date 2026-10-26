/**
 * Public Header navigation — ONLY ready, published marketing pages.
 *
 * Rule for future pages: build content → desktop/mobile QA → SEO check →
 * owner approval → publish → then add the link here. Never add Preview/WIP URLs.
 */

export type HeaderNavLink = {
  href: string;
  label: string;
  description?: string;
};

export type HeaderNavColumn = {
  id: string;
  title: string;
  links: HeaderNavLink[];
};

export type HeaderNavItem =
  | { id: string; label: string; href: string; kind: "link" }
  | {
      id: string;
      label: string;
      kind: "mega" | "dropdown";
      columns: HeaderNavColumn[];
      footerLink?: HeaderNavLink;
    };

/** Service pages that exist with real content today. */
export const SERVICE_COLUMNS: HeaderNavColumn[] = [
  {
    id: "invites-rsvp",
    title: "הזמנות ואישורי הגעה",
    links: [
      {
        href: "/invitations/chatuna",
        label: "הזמנות דיגיטליות",
        description: "עיצובים, תבניות ושליחה לאורחים",
      },
      {
        href: "/rsvp/save-the-date",
        label: "Save the Date",
        description: "הודעה מוקדמת לשריון התאריך",
      },
      {
        href: "/rsvp",
        label: "אישורי הגעה",
        description: "רשימה אחת, מעקב תשובות וסבבים",
      },
      {
        href: "/rsvp/whatsapp",
        label: "אישורי הגעה ב־WhatsApp",
        description: "קישור אישי וסבבי הודעות",
      },
      {
        href: "/rsvp/calls",
        label: "שיחות מוקלטות ומוקד אנושי",
        description: "למי שלא עונה להודעה",
      },
    ],
  },
  {
    id: "seating-ops",
    title: "הושבה וניהול",
    links: [
      {
        href: "/seating-explained",
        label: "סידורי הושבה",
        description: "מפת שולחנות, שיבוץ והושבה חיה",
      },
      {
        href: "/event-management",
        label: "ניהול אירוע",
        description: "ספקים, תקציב, משימות ולוח זמנים",
      },
      {
        href: "/services/alcohol-management",
        label: "ניהול אלכוהול",
        description: "בר מסודר לאורך כל האירוע",
      },
    ],
  },
  {
    id: "experience",
    title: "שירותים נוספים",
    links: [
      {
        href: "/wedding-website",
        label: "אתרי חתונה",
        description: "אתר אישי עם תבניות חיות",
      },
      {
        href: "/credit-gifts",
        label: "מתנות באשראי, bit ו־PayBox",
        description: "אשראי דרך RSVP, PayBox ומספר bit בהזמנה",
      },
    ],
  },
];

/** Event-type landing pages that exist today. */
export const EVENT_LINKS: HeaderNavLink[] = [
  { href: "/rsvp/chatuna", label: "חתונה" },
  { href: "/rsvp/hina", label: "חינה" },
  { href: "/rsvp/bar-bat-mitzvah", label: "בר ובת מצווה" },
  { href: "/rsvp/brit-brita", label: "ברית ובריתה" },
];

/**
 * All published guides, each listed once under a single topic.
 * Hub `/info/guides` remains the full index.
 */
export const GUIDE_COLUMNS: HeaderNavColumn[] = [
  {
    id: "planning",
    title: "תכנון חתונה",
    links: [
      {
        href: "/info/guides/wedding-planning",
        label: "המדריך המלא לתכנון חתונה",
      },
      {
        href: "/info/guides/event-management-vs-production",
        label: "ניהול אירוע או הפקת אירוע",
      },
      {
        href: "/info/guides/event-day-checklist",
        label: "בדיקה לפני יום האירוע",
      },
      {
        href: "/info/guides/send-digital-invitation",
        label: "איך שולחים הזמנה דיגיטלית",
      },
      {
        href: "/info/guides/bit-paybox-wedding-invitation",
        label: "bit ו־PayBox בהזמנה",
      },
      {
        href: "/info/guides/save-the-date-vs-invitation",
        label: "Save the Date מול הזמנה",
      },
    ],
  },
  {
    id: "vendors-budget",
    title: "ספקים, חוזים ותקציב",
    links: [
      {
        href: "/info/guides/wedding-vendors-contracts",
        label: "בחירת ספקים וחוזים",
      },
      {
        href: "/info/guides/cost-rsvp-wedding",
        label: "כמה עולים אישורי הגעה",
      },
    ],
  },
  {
    id: "guests-rsvp",
    title: "רשימות מוזמנים ואישורי הגעה",
    links: [
      { href: "/info/guides/guest-list", label: "ניהול רשימת מוזמנים" },
      {
        href: "/info/guides/how-to-choose-rsvp-company",
        label: "איך בוחרים חברת אישורי הגעה",
      },
      {
        href: "/info/guides/when-to-send-rsvp",
        label: "מתי שולחים אישורי הגעה",
      },
      {
        href: "/info/guides/guests-who-dont-reply",
        label: "אורחים שלא עונים",
      },
      {
        href: "/info/guides/whatsapp-vs-sms-rsvp",
        label: "WhatsApp או SMS",
      },
    ],
  },
  {
    id: "venues-seating",
    title: "אולמות וסידורי הושבה",
    links: [
      {
        href: "/info/guides/wedding-seating-arrangements",
        label: "סידורי הושבה לחתונה — המדריך המלא",
      },
      { href: "/info/guides/seating-plan", label: "איך מכינים סידורי הושבה" },
      {
        href: "/info/guides/table-number-message",
        label: "הודעת מספר שולחן לאורחים",
      },
      {
        href: "/info/guides/wedding-venue-guest-guarantee",
        label: "כמה אורחים להתחייב לאולם",
      },
    ],
  },
  {
    id: "tools",
    title: "כלים ומחשבונים",
    links: [
      {
        href: "/info/guides/wedding-alcohol-calculator",
        label: "מחשבון אלכוהול לחתונה",
      },
    ],
  },
];

export const HEADER_PRIMARY: HeaderNavItem[] = [
  { id: "home", label: "ראשי", href: "/", kind: "link" },
  {
    id: "services",
    label: "השירותים שלנו",
    kind: "mega",
    columns: SERVICE_COLUMNS,
  },
  {
    id: "events",
    label: "לאירועים",
    kind: "dropdown",
    columns: [
      {
        id: "event-types",
        title: "סוגי אירועים",
        links: EVENT_LINKS,
      },
    ],
  },
  {
    id: "guides",
    label: "מדריכים",
    kind: "mega",
    columns: GUIDE_COLUMNS,
    footerLink: {
      href: "/info/guides",
      label: "כל המדריכים",
    },
  },
  { id: "pricing", label: "חבילות ומחירים", href: "/pricing", kind: "link" },
  { id: "contact", label: "צור קשר", href: "/contact", kind: "link" },
];

/** Flat list of every href the Header can surface (for tests / audits). */
export function collectHeaderHrefs(): string[] {
  const hrefs = new Set<string>();

  for (const item of HEADER_PRIMARY) {
    if (item.kind === "link") {
      hrefs.add(item.href);
      continue;
    }
    for (const column of item.columns) {
      for (const link of column.links) hrefs.add(link.href);
    }
    if (item.footerLink) hrefs.add(item.footerLink.href);
  }

  hrefs.add("/login");
  hrefs.add("/try/dashboard");
  hrefs.add("/try/event-management");

  return [...hrefs].sort();
}

export function isHeaderPathActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
