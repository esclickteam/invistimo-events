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
      { path: "/rsvp/hina", label: "אישורי הגעה לחינה" },
      { path: "/rsvp/bar-bat-mitzvah", label: "אישורי הגעה לבר ובת מצווה" },
      { path: "/rsvp/brit-brita", label: "אישורי הגעה לברית ובריתה" },
      { path: "/rsvp/whatsapp", label: "אישורי הגעה בוואטסאפ" },
      { path: "/rsvp/calls", label: "אישורי הגעה בשיחות טלפון" },
      { path: "/info/guides/when-to-send-rsvp", label: "מתי שולחים" },
      { path: "/info/guides/cost-rsvp-wedding", label: "איך מחושב המחיר" },
      { path: "/info/guides/guests-who-dont-reply", label: "אורחים שלא עונים" },
      { path: "/info/guides/whatsapp-vs-sms-rsvp", label: "WhatsApp או SMS" },
      { path: "/info/guides/how-to-choose-rsvp-company", label: "איך בוחרים חברת אישורי הגעה" },
      { path: "/info/guides/guest-list", label: "רשימת מוזמנים" },
      { path: "/info/guides/wedding-venue-guest-guarantee", label: "כמה אורחים כדאי להתחייב לאולם?" },
      { path: "/info/guides/tracking-rsvp-responses", label: "מעקב אחרי תשובות" },
      { path: "/info/guides/how-phone-rsvp-works", label: "איך עובדות שיחות אישור" },
      { path: "/info/guides/import-guest-list", label: "בניית וייבוא רשימת מוזמנים" },
      { path: "/info/guides/last-minute-guest-changes", label: "שינויי הגעה ברגע האחרון" },
      { path: "/info/guides/plus-ones-and-kids-rsvp", label: "+1 וילדים באישורי הגעה" },
      { path: "/info/guides/overseas-guests-rsvp", label: "אורחים מחו״ל" },
      { path: "/info/guides/personal-rsvp-link", label: "קישור אישי לאישור הגעה" },
      { path: "/info/guides/rsvp-reminder-rounds", label: "סבבי תזכורת" },
      { path: "/info/guides/manage-guests-after-rsvp", label: "ניהול מוזמנים אחרי תחילת האישורים" },
      { path: "/info/guides/reduce-meal-waste", label: "תכנון מנות לפי אישורים" },
    ],
  },
  {
    id: "invitations",
    name: "הזמנות דיגיטליות",
    path: "/invitations/chatuna",
    summary: "ההזמנה שהאורח פותח מהקישור, ו־Save the Date כהודעה מוקדמת נפרדת.",
    clusters: [
      { path: "/rsvp/save-the-date", label: "Save the Date" },
      { path: "/credit-gifts", label: "מתנות באשראי, bit ו־PayBox" },
      { path: "/info/guides/send-digital-invitation", label: "איך שולחים הזמנה" },
      { path: "/info/guides/bit-paybox-wedding-invitation", label: "bit ו־PayBox בהזמנה" },
      { path: "/info/guides/save-the-date-vs-invitation", label: "Save the Date מול הזמנה" },
      { path: "/info/guides/whatsapp-invitation-wording", label: "ניסוח הודעת WhatsApp" },
      { path: "/info/guides/when-to-send-save-the-date", label: "מתי שולחים Save the Date" },
      { path: "/info/guides/wedding-website-vs-digital-invitation", label: "אתר חתונה מול הזמנה דיגיטלית" },
    ],
  },
  {
    id: "seating",
    name: "סידורי הושבה",
    path: "/seating-explained",
    summary: "סקיצת אולם, שיבוץ ידני או לפי קבוצות, והודעה עם מספר שולחן.",
    clusters: [
      {
        path: "/info/guides/wedding-seating-arrangements",
        label: "סידורי הושבה לחתונה — המדריך המלא",
      },
      { path: "/info/guides/seating-plan", label: "איך מכינים הושבה במערכת" },
      {
        path: "/info/guides/seating-cards-vs-qr",
        label: "פתקיות הושבה או QR דיגיטלי",
      },
      { path: "/info/guides/table-number-message", label: "הודעת מספר שולחן" },
      { path: "/info/guides/seating-live-day-of", label: "הושבה LIVE ביום האירוע" },
      { path: "/info/guides/seating-families-groups", label: "הושבה לפי משפחות וקבוצות" },
      { path: "/info/guides/venue-guest-check-in", label: "קליטת אורחים בכניסה" },
    ],
  },
  {
    id: "events",
    name: "ניהול אירועים",
    path: "/event-management",
    summary: "משימות, ספקים, תקציב, תשלומים ולוח זמנים, לצד האישורים וההושבה.",
    clusters: [
      { path: "/info/guides/wedding-planning", label: "המדריך המלא לתכנון חתונה" },
      {
        path: "/info/guides/event-management-vs-production",
        label: "ניהול אירוע או הפקת אירוע",
      },
      { path: "/info/guides/wedding-vendors-contracts", label: "בחירת ספקים, חוזים וביטולים" },
      { path: "/info/guides/event-day-checklist", label: "בדיקה לפני יום האירוע" },
      { path: "/info/guides/wedding-alcohol-calculator", label: "מחשבון אלכוהול לחתונה" },
      { path: "/info/guides/wedding-website-guide", label: "מדריך אתר חתונה" },
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
