/**
 * Public Footer link columns — ready marketing pages only.
 * Keep in sync with published routes; never add Preview/WIP URLs.
 */

export type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

export type FooterColumn = {
  id: string;
  title: string;
  links: FooterLink[];
};

export const FOOTER_WHATSAPP_HREF = "https://wa.me/972555039072";

export const FOOTER_HOURS = [
  { label: "א׳–ה׳", value: "09:00–18:00" },
  { label: "שישי וערבי חג", value: "09:00–12:00" },
] as const;

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    id: "services",
    title: "השירותים שלנו",
    links: [
      { href: "/rsvp", label: "אישורי הגעה" },
      { href: "/seating-explained", label: "סידורי הושבה" },
      { href: "/invitations/chatuna", label: "הזמנות דיגיטליות" },
      { href: "/rsvp/save-the-date", label: "Save the Date" },
      { href: "/event-management", label: "ניהול והפקת אירוע" },
      { href: "/wedding-website", label: "אתרי חתונה" },
      { href: "/services/alcohol-management", label: "ניהול אלכוהול" },
      { href: "/credit-gifts", label: "מתנות באשראי" },
    ],
  },
  {
    id: "guides",
    title: "מדריכים וכלים",
    links: [
      { href: "/info/guides", label: "מרכז המדריכים" },
      { href: "/info/guides/when-to-send-rsvp", label: "מדריך אישורי הגעה" },
      { href: "/info/guides/seating-plan", label: "מדריך סידורי הושבה" },
      { href: "/faq", label: "שאלות נפוצות" },
      { href: "/pricing", label: "חבילות ומחירים" },
    ],
  },
  {
    id: "company",
    title: "החברה",
    links: [
      { href: "/info/about", label: "אודות" },
      { href: "/accessibility", label: "הצהרת נגישות" },
      { href: "/privacy", label: "מדיניות פרטיות" },
      { href: "/terms", label: "תנאי שימוש" },
    ],
  },
  {
    id: "help",
    title: "עזרה ויצירת קשר",
    links: [
      {
        href: FOOTER_WHATSAPP_HREF,
        label: "WhatsApp",
        external: true,
      },
      { href: "/contact", label: "יצירת קשר" },
    ],
  },
];

export const FOOTER_LEGAL_LINKS: FooterLink[] = [
  { href: "/privacy", label: "פרטיות" },
  { href: "/terms", label: "תקנון" },
  { href: "/accessibility", label: "נגישות" },
];

export function collectFooterHrefs(): string[] {
  const hrefs = new Set<string>();
  for (const column of FOOTER_COLUMNS) {
    for (const link of column.links) {
      if (!link.external) hrefs.add(link.href);
    }
  }
  for (const link of FOOTER_LEGAL_LINKS) hrefs.add(link.href);
  return [...hrefs].sort();
}
