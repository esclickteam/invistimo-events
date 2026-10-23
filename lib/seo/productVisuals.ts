import type { ShowcaseItem } from "@/components/marketing/ProductShowcase";

const P = "/marketing/product";
const I = "/marketing/invites";

/** Designed invitation / Save the Date studio assets (marketing graphics). */
export const INVITE_DESIGNS = {
  wedding: `${I}/invite-wedding-maya-itai.webp`,
  saveTheDate: `${I}/invite-save-the-date-maya-itai.webp`,
  barMitzvah: `${I}/invite-bar-mitzvah.webp`,
  batMitzvah: `${I}/invite-bat-mitzvah.webp`,
  brit: `${I}/invite-brit.webp`,
  henna: `${I}/invite-henna.webp`,
  birthday: `${I}/invite-birthday.webp`,
  corporate: `${I}/invite-corporate.webp`,
} as const;

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
  /** Guest RSVP on /invite/demo-share — fictional guest */
  guestRsvp: `${P}/webp/desktop-guest-rsvp.webp`,
  guestRsvpConfirm: `${P}/webp/desktop-guest-rsvp-confirm.webp`,
  guestRsvpMobile: `${P}/webp/mobile-guest-rsvp.webp`,
  /** Real message composer UI from /try/dashboard/messages/new */
  messagesSms: `${P}/webp/desktop-messages-sms.webp`,
  messagesSmsReminder: `${P}/webp/desktop-messages-sms-reminder.webp`,
  messagesSaveTheDate: `${P}/webp/desktop-messages-save-the-date.webp`,
  messagesSmsMobile: `${P}/webp/mobile-messages-sms.webp`,
  messagesSaveTheDateMobile: `${P}/webp/mobile-messages-save-the-date.webp`,
} as const;

/** Demo recordings from /try and /invite — fictional data only. */
export const PRODUCT_VIDEOS = {
  dashboard: "/marketing/videos/demo-try-dashboard.webm",
  seating: "/marketing/videos/demo-try-seating.webm",
  /** Prefer cinematic seating reel with scene captions */
  seatingUnifiedCaptions: "/marketing/videos/reel-seating-cinematic.webm",
  seatingCinematic: "/marketing/videos/reel-seating-cinematic.webm",
  guestRsvp: "/marketing/videos/demo-guest-rsvp.webm",
  guestRsvpCaptions: "/marketing/videos/reel-rsvp-guest.webm",
  weddingEternal: "/marketing/videos/demo-wedding-eternal-gold.webm",
  weddingReel: "/marketing/videos/reel-wedding-website.webm",
  homeJourney: "/marketing/videos/reel-home-journey.webm",
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
    case "/rsvp/calls":
    case "/rsvp/guest-list":
    case "/info/demo":
    case "/for/bar-mitzvah":
    case "/for/bat-mitzvah":
    case "/for/brit":
    case "/for/birthday":
    case "/for/private-party":
    case "/for/corporate":
      return {
        heading: "ככה נראים האישור והדשבורד במערכת",
        lede: "כך האורח מאשר הגעה בקישור האישי — ואותה תשובה נכנסת מיד לדשבורד שלכם.",
        layout: "hero-side",
        items: [
          { src: PRODUCT_SHOTS.guestRsvp, alt: "מסך אישור הגעה של אורח — בחירת מגיע או לא מגיע", caption: "מה האורח רואה בקישור האישי", device: "phone" },
          { src: PRODUCT_SHOTS.dashboard, alt: "דשבורד Invistimo עם סטטיסטיקות אישורי הגעה", caption: "אותה תשובה נכנסת לדשבורד", device: "laptop" },
        ],
      };
    case "/rsvp/sms":
    case "/rsvp/reminders":
    case "/rsvp/thank-you-messages":
      return {
        heading: "ממשק שליחת SMS מהמערכת",
        lede: "תצוגה מקדימה של הודעת SMS לאורחים — סבב, נמענים ותצוגה בטלפון לפני השליחה.",
        layout: "hero-side",
        items: [
          { src: PRODUCT_SHOTS.messagesSms, alt: "ממשק שליחת SMS לסבב אישור הגעה עם תצוגה מקדימה", caption: "סבב 1 בערוץ SMS — תצוגה מקדימה בטלפון", device: "laptop" },
          { src: PRODUCT_SHOTS.messagesSmsReminder, alt: "ממשק תזכורת SMS לפני האירוע", caption: "תזכורת SMS למי שכבר אישר", device: "laptop" },
        ],
      };
    case "/for/henna":
      return {
        heading: "אישורים והושבה כשיש שולחנות",
        lede: "לחינה עם שולחנות — רשימת אורחים ומפת הושבה באותה מערכת.",
        layout: "duo",
        items: [
          { src: PRODUCT_SHOTS.dashboard, alt: "דשבורד אישורי הגעה", device: "laptop" },
          { src: PRODUCT_SHOTS.seating, alt: "מפת הושבה עם שולחנות", device: "laptop" },
        ],
      };
    case "/rsvp/save-the-date":
      return {
        heading: "Save the Date מעוצב — ושליחה מהמערכת",
        lede: "עיצוב לדוגמה לצד ממשק השליחה האמיתי עם תצוגה מקדימה בוואטסאפ.",
        layout: "hero-side",
        items: [
          { src: INVITE_DESIGNS.saveTheDate, alt: "עיצוב Save the Date לחתונה של מאיה ואיתי", caption: "עיצוב Save the Date", device: "phone" },
          { src: PRODUCT_SHOTS.messagesSaveTheDate, alt: "ממשק שליחת Save the Date עם תצוגה מקדימה בוואטסאפ", caption: "שליחה מהמערכת", device: "laptop" },
        ],
      };
    case "/invitations/chatuna":
      return {
        heading: "הזמנה מעוצבת — ואישור בקישור אישי",
        lede: "עיצוב הזמנה לדוגמה לצד מסך האישור שהאורח מקבל בקישור.",
        layout: "phone-pair",
        items: [
          { src: INVITE_DESIGNS.wedding, alt: "הזמנה מעוצבת לחתונה של מאיה ואיתי", caption: "הזמנה דיגיטלית", device: "phone" },
          { src: PRODUCT_SHOTS.guestRsvpMobile, alt: "מסך אישור הגעה של אורח", caption: "אישור בקישור האישי", device: "phone" },
        ],
      };
    case "/seating-explained":
    case "/info/guides/seating-plan":
    case "/info/guides/table-number-message":
      return {
        heading: "מפת שולחנות ושיבוץ אורחים",
        lede: "תכננו את מפת השולחנות, שבצו את המוזמנים וראו בזמן אמת איפה נשאר מקום.",
        layout: "hero-side",
        items: [
          { src: PRODUCT_SHOTS.seating, alt: "מסך סידורי הושבה של Invistimo", device: "laptop" },
          { src: PRODUCT_SHOTS.seatingMobile, alt: "הושבה בנייד", device: "phone" },
        ],
      };
    case "/event-management":
    case "/info/guides/event-day-checklist":
      return {
        heading: "ניהול האירוע במקום אחד",
        lede: "משימות ותפעול לצד הרשימה — הכל במסך אחד לפני יום האירוע ובמהלכו.",
        layout: "duo",
        items: [
          { src: PRODUCT_SHOTS.eventMgmt, alt: "מסך ניהול אירוע", device: "laptop" },
          { src: PRODUCT_SHOTS.dashboard, alt: "דשבורד האירוע", device: "laptop" },
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
        lede: "תבניות חיות מהמערכת — כך האורחים רואים את האתר בנייד.",
        layout: "phone-pair",
        items: [
          { src: PRODUCT_SHOTS.weddingEternalMobile, alt: "Eternal Gold בנייד", device: "phone" },
          { src: PRODUCT_SHOTS.weddingGardenMobile, alt: "Garden Bloom בנייד", device: "phone" },
        ],
      };
    case "/info/guides/manage-corporate-event":
      return {
        heading: "ניהול אירוע לצד הרשימה",
        lede: "משימות ודשבורד — ניהול האירוע במקום אחד.",
        layout: "duo",
        items: [
          { src: PRODUCT_SHOTS.eventMgmt, alt: "ניהול אירוע", device: "laptop" },
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
