/**
 * Pillar pages and the existing articles that support them.
 * A path appears in one cluster only, so two Invistimo URLs are not assigned
 * the same job.
 */
export type ClusterLink = { path: string; label: string };

export type ContentPillar = {
  id: "rsvp" | "invitations" | "seating" | "events";
  name: string;
  path: string;
  summary: string;
  clusters: ClusterLink[];
};

export const PILLARS: ContentPillar[] = [
  {
    id: "rsvp",
    name: "אישורי הגעה",
    path: "/rsvp",
    summary: "קישור אישי, סבבי וואטסאפ, תזכורת, ורשימה אחת של מי ענה.",
    clusters: [
      { path: "/rsvp/chatuna", label: "אישורי הגעה לחתונה" },
      { path: "/rsvp/whatsapp", label: "אישורי הגעה בוואטסאפ" },
      { path: "/info/guides/when-to-send-rsvp", label: "מתי שולחים" },
      { path: "/info/guides/cost-rsvp-wedding", label: "איך מחושב המחיר" },
      { path: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
      { path: "/info/guides/whatsapp-vs-sms-rsvp", label: "WhatsApp או SMS" },
      { path: "/info/guides/guest-list", label: "רשימת מוזמנים" },
      { path: "/info/guides/wedding-venue-guest-guarantee", label: "התחייבות לאולם" },
      { path: "/info/guides/reduce-meal-waste", label: "מספר מנות לאולם" },
    ],
  },
  {
    id: "invitations",
    name: "הזמנות דיגיטליות",
    path: "/invitations/chatuna",
    summary: "ההזמנה שהאורח פותח מהקישור, ו־Save the Date כהודעה מוקדמת נפרדת.",
    clusters: [
      { path: "/rsvp/save-the-date", label: "Save the Date" },
      { path: "/info/guides/send-digital-invitation", label: "איך שולחים הזמנה" },
      { path: "/info/guides/save-the-date-vs-invitation", label: "Save the Date מול הזמנה" },
    ],
  },
  {
    id: "seating",
    name: "סידורי הושבה",
    path: "/seating-explained",
    summary: "סקיצת אולם, שיבוץ ידני או לפי קבוצות, והודעה עם מספר שולחן.",
    clusters: [
      { path: "/info/guides/seating-plan", label: "איך מכינים הושבה" },
      { path: "/info/guides/table-number-message", label: "הודעת מספר שולחן" },
    ],
  },
  {
    id: "events",
    name: "ניהול אירועים",
    path: "/event-management",
    summary: "משימות, ספקים, תקציב, תשלומים ולוח זמנים, לצד האישורים וההושבה.",
    clusters: [
      { path: "/info/guides/event-day-checklist", label: "בדיקה לפני יום האירוע" },
      { path: "/info/guides/wedding-alcohol-calculator", label: "מחשבון אלכוהול לחתונה" },
    ],
  },
];

export function pillarForPath(path: string) {
  return PILLARS.find((pillar) => pillar.path === path || pillar.clusters.some((item) => item.path === path));
}

export function clusterSiblings(path: string): ClusterLink[] {
  const pillar = pillarForPath(path);
  if (!pillar) return [];
  const links = [{ path: pillar.path, label: pillar.name }, ...pillar.clusters];
  return links.filter((item) => item.path !== path);
}
