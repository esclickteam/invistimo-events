import type { ShowcaseItem } from "@/components/marketing/ProductShowcase";

const P = "/marketing/product";

/** Real demo/try/template screenshots — fictional data only. */
export const PRODUCT_SHOTS = {
  dashboard: `${P}/webp/desktop-try-dashboard.webp`,
  dashboardMobile: `${P}/webp/mobile-try-dashboard.webp`,
  seating: `${P}/webp/desktop-try-seating.webp`,
  seatingMobile: `${P}/webp/mobile-try-seating.webp`,
  eventMgmt: `${P}/webp/desktop-try-event-mgmt.webp`,
  eventMgmtMobile: `${P}/webp/mobile-try-event-mgmt.webp`,
  weddingEternal: `${P}/webp/desktop-wedding-eternal-gold.webp`,
  weddingEternalMobile: `${P}/webp/mobile-wedding-eternal-gold.webp`,
  weddingMidnight: `${P}/webp/desktop-wedding-midnight-velvet.webp`,
  weddingMidnightMobile: `${P}/webp/mobile-wedding-midnight-velvet.webp`,
  weddingGarden: `${P}/webp/desktop-wedding-garden-bloom.webp`,
  weddingGardenMobile: `${P}/webp/mobile-wedding-garden-bloom.webp`,
  weddingCoastal: `${P}/webp/desktop-wedding-coastal-breeze.webp`,
  weddingCoastalMobile: `${P}/webp/mobile-wedding-coastal-breeze.webp`,
  weddingGallery: `${P}/webp/desktop-wedding-gallery.webp`,
} as const;

/** Prefer webp; fall back to png if a variant is missing on disk. */
export function shot(webpPath: string, pngFallback?: string) {
  return webpPath;
}

/** Default showcase per marketing path — varies layout so pages don’t clone each other. */
export function showcaseForPath(path: string): { heading: string; lede: string; layout: "duo" | "trio" | "hero-side" | "phone-pair"; items: ShowcaseItem[] } | null {
  switch (path) {
    case "/rsvp":
    case "/rsvp/chatuna":
    case "/rsvp/whatsapp":
    case "/rsvp/sms":
    case "/rsvp/calls":
    case "/rsvp/reminders":
    case "/rsvp/thank-you-messages":
    case "/rsvp/guest-list":
    case "/info/demo":
    case "/for/bar-mitzvah":
    case "/for/bat-mitzvah":
    case "/for/brit":
    case "/for/birthday":
    case "/for/private-party":
    case "/for/corporate":
      return {
        heading: "ככה נראית ניהול הרשימה במערכת",
        lede: "צילום ממסך הדמו — חתונה פיקטיבית של מאיה ואיתי. אין כאן נתוני לקוחות אמיתיים.",
        layout: "hero-side",
        items: [
          { src: PRODUCT_SHOTS.dashboard, alt: "דשבורד דמו של Invistimo עם סטטיסטיקות אישורי הגעה", caption: "דשבורד האירוע — סטטוסים, פעילות אחרונה ומעקב צפיות", device: "laptop" },
          { src: PRODUCT_SHOTS.dashboardMobile, alt: "תצוגת מובייל של דשבורד הדמו", caption: "אותו מסך בנייד", device: "phone" },
        ],
      };
    case "/for/henna":
      return {
        heading: "אישורים והושבה כשיש שולחנות",
        lede: "לחינה עם שולחנות — אותם מסכי דמו של רשימה והושבה.",
        layout: "duo",
        items: [
          { src: PRODUCT_SHOTS.dashboard, alt: "דשבורד דמו", device: "laptop" },
          { src: PRODUCT_SHOTS.seating, alt: "מפת הושבה בדמו", device: "laptop" },
        ],
      };
    case "/rsvp/save-the-date":
    case "/invitations/chatuna":
      return {
        heading: "מה האורח רואה בהזמנה ובאתר",
        lede: "תבניות אתר חתונה אמיתיות מהמערכת (נתוני דמו: נעמית ובן).",
        layout: "phone-pair",
        items: [
          { src: PRODUCT_SHOTS.weddingEternalMobile, alt: "אתר חתונה Eternal Gold בנייד", caption: "Eternal Gold", device: "phone" },
          { src: PRODUCT_SHOTS.weddingMidnightMobile, alt: "אתר חתונה Midnight Velvet בנייד", caption: "Midnight Velvet", device: "phone" },
        ],
      };
    case "/seating-explained":
    case "/info/guides/seating-plan":
    case "/info/guides/table-number-message":
      return {
        heading: "מפת שולחנות ושיבוץ אורחים",
        lede: "צילום ממסך ההושבה בדמו — סקיצה, שולחנות ושיבוץ.",
        layout: "hero-side",
        items: [
          { src: PRODUCT_SHOTS.seating, alt: "מסך סידורי הושבה בדמו של Invistimo", device: "laptop" },
          { src: PRODUCT_SHOTS.seatingMobile, alt: "הושבה בנייד", device: "phone" },
        ],
      };
    case "/event-management":
    case "/info/guides/event-day-checklist":
      return {
        heading: "ניהול האירוע במקום אחד",
        lede: "מסך ניהול אירוע בדמו — משימות ותפעול לצד הרשימה.",
        layout: "duo",
        items: [
          { src: PRODUCT_SHOTS.eventMgmt, alt: "מסך ניהול אירוע בדמו", device: "laptop" },
          { src: PRODUCT_SHOTS.dashboard, alt: "דשבורד האירוע בדמו", device: "laptop" },
        ],
      };
    case "/wedding-website":
      return {
        heading: "תבניות חיות מהמוצר",
        lede: "שלוש תבניות שונות שנוצרו במערכת — לא קולאז׳ מעוצב במקום האתר עצמו.",
        layout: "trio",
        items: [
          { src: PRODUCT_SHOTS.weddingEternal, alt: "תבנית Eternal Gold", caption: "Eternal Gold", device: "laptop" },
          { src: PRODUCT_SHOTS.weddingMidnight, alt: "תבנית Midnight Velvet", caption: "Midnight Velvet", device: "laptop" },
          { src: PRODUCT_SHOTS.weddingGarden, alt: "תבנית Garden Bloom", caption: "Garden Bloom", device: "laptop" },
        ],
      };
    case "/info/guides/guests-who-dont-reply":
    case "/info/guides/guest-list":
    case "/info/guides/when-to-send-rsvp":
    case "/info/guides/how-many-rsvp-rounds":
    case "/info/guides/bar-mitzvah-rsvp-plan":
    case "/info/guides/when-to-send-invitation":
    case "/info/guides/when-to-send-save-the-date":
    case "/info/guides/send-reminder-messages":
    case "/info/guides/cost-rsvp-wedding":
    case "/info/guides/reduce-meal-waste":
    case "/info/guides/save-the-date-vs-invitation":
      return {
        heading: "מעקב אחרי מי ענה ומי עדיין פתוח",
        lede: "בדשבורד רואים סטטוסים ופעילות — בסיס לסבב השני ולשיחות אם נרכשו.",
        layout: "duo",
        items: [
          { src: PRODUCT_SHOTS.dashboard, alt: "דשבורד עם סטטוסי אורחים", device: "laptop" },
          { src: PRODUCT_SHOTS.dashboardMobile, alt: "מעקב בנייד", device: "phone" },
        ],
      };
    case "/info/guides/build-wedding-website":
      return {
        heading: "תבניות אתר חתונה מהמוצר",
        lede: "צילומים מתבניות חיות — נתוני דמו בלבד.",
        layout: "phone-pair",
        items: [
          { src: PRODUCT_SHOTS.weddingEternalMobile, alt: "Eternal Gold בנייד", device: "phone" },
          { src: PRODUCT_SHOTS.weddingGardenMobile, alt: "Garden Bloom בנייד", device: "phone" },
        ],
      };
    case "/info/guides/manage-corporate-event":
      return {
        heading: "ניהול אירוע לצד הרשימה",
        lede: "מסכי דמו — משימות ודשבורד.",
        layout: "duo",
        items: [
          { src: PRODUCT_SHOTS.eventMgmt, alt: "ניהול אירוע בדמו", device: "laptop" },
          { src: PRODUCT_SHOTS.dashboard, alt: "דשבורד אירוע", device: "laptop" },
        ],
      };
    default:
      return null;
  }
}

export function journeyActiveIdForPath(path: string): string | undefined {
  if (path.startsWith("/rsvp/save-the-date")) return "save-the-date";
  if (path.startsWith("/invitations")) return "invitation";
  if (path.startsWith("/wedding-website") || path.includes("build-wedding-website")) return "wedding-website";
  if (path.startsWith("/seating") || path.includes("seating") || path.includes("table-number")) return "guests-seating";
  if (path.startsWith("/event-management") || path.includes("event-day") || path.includes("corporate") || path.includes("manage-corporate"))
    return "event-day";
  if (path.includes("thank-you")) return "thanks";
  if (path.startsWith("/rsvp") || path.startsWith("/for/") || path.startsWith("/info/demo")) return "rsvp";
  return undefined;
}
