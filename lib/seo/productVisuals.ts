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
  /** Process captures from Maya & Itai /try demo */
  whatsappRsvp: `${P}/webp/mobile-whatsapp-rsvp.webp`,
  whatsappStd: `${P}/webp/mobile-whatsapp-std.webp`,
  callsComparison: `${P}/webp/desktop-calls-comparison.webp`,
  guestInviteLoaded: `${P}/webp/mobile-guest-invite-loaded.webp`,
  dashboardLive: `${P}/webp/desktop-try-dashboard-live.webp`,
  seatingLive: `${P}/webp/desktop-try-seating-live.webp`,
} as const;

/** Demo recordings from /try and /invite — fictional data only. */
export const PRODUCT_VIDEOS = {
  dashboard: "/marketing/videos/demo-try-dashboard.webm",
  seating: "/marketing/videos/demo-try-seating.webm",
  /** Prefer real seating process from the Maya & Itai demo event */
  seatingUnifiedCaptions: "/marketing/videos/process-seating.webm",
  seatingCinematic: "/marketing/videos/process-seating.webm",
  seatingProcess: "/marketing/videos/process-seating.webm",
  guestRsvp: "/marketing/videos/process-rsvp-guest-journey.webm",
  guestRsvpCaptions: "/marketing/videos/process-rsvp-guest-journey.webm",
  guestJourney: "/marketing/videos/process-rsvp-guest-journey.webm",
  dashboardLive: "/marketing/videos/process-dashboard-live.webm",
  invitationOpen: "/marketing/videos/process-invitation-open.webm",
  saveTheDateProcess: "/marketing/videos/process-save-the-date.webm",
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
    case "/rsvp/guest-list":
    case "/info/demo":
      return {
        heading: "מהודעה, להזמנה, לדשבורד",
        lede: "מסע אורח עקבי באירוע הדוגמה של מאיה ואיתי — עם שמירה אמיתית במערכת הדמו, לא אנימציה מנותקת.",
        layout: "trio",
        items: [
          { src: PRODUCT_SHOTS.whatsappRsvp, alt: "הדמיית הודעת WhatsApp לפי תבנית Invistimo", caption: "קבלת ההודעה עם הקישור האישי", device: "phone" },
          { src: PRODUCT_SHOTS.guestInviteLoaded, alt: "הזמנה דיגיטלית שנפתחת בקישור האישי", caption: "פתיחת ההזמנה", device: "phone" },
          { src: PRODUCT_SHOTS.dashboardLive, alt: "דשבורד אחרי אישורי הגעה אמיתיים בדמו", caption: "הדשבורד מתעדכן אחרי השמירה", device: "laptop" },
        ],
      };
    case "/for/bar-mitzvah":
      return {
        heading: "בר מצווה — רשימה משפחתית ואישורים",
        lede: "מאחדים משפחה וחברים בקישור אישי לכל אורח, עם מעקב בדשבורד לפני סגירה מול האולם.",
        layout: "hero-side",
        items: [
          { src: INVITE_DESIGNS.barMitzvah, alt: "הזמנה לבר מצווה", caption: "הזמנה מעוצבת", device: "phone" },
          { src: PRODUCT_SHOTS.dashboard, alt: "דשבורד אישורי הגעה לבר מצווה", caption: "מעקב אחרי התשובות", device: "laptop" },
        ],
      };
    case "/for/bat-mitzvah":
      return {
        heading: "בת מצווה — אישורים במקום אחד",
        lede: "משפחה, חברות והורים — תשובות במסך אחד עם הזמנה דיגיטלית.",
        layout: "hero-side",
        items: [
          { src: INVITE_DESIGNS.batMitzvah, alt: "הזמנה לבת מצווה", caption: "הזמנה מעוצבת", device: "phone" },
          { src: PRODUCT_SHOTS.guestRsvpMobile, alt: "אישור הגעה בקישור אישי", caption: "האורחת מאשרת", device: "phone" },
        ],
      };
    case "/for/brit":
      return {
        heading: "ברית ובריתה — רשימה קצרה ושני סבבים",
        lede: "לרוב מספיקים הזמנה ושני סבבי וואטסאפ. בלי חובה באתר אישי.",
        layout: "phone-pair",
        items: [
          { src: INVITE_DESIGNS.brit, alt: "הזמנה לברית", caption: "הזמנה דיגיטלית", device: "phone" },
          { src: PRODUCT_SHOTS.guestRsvp, alt: "אישור הגעה קצר", caption: "אישור בקישור", device: "phone" },
        ],
      };
    case "/for/birthday":
    case "/for/private-party":
      return {
        heading: "אירוע פרטי — הזמנה ואישורים בלי מסע חתונה מלא",
        lede: "מתמקדים בהזמנה דיגיטלית ובאישורי הגעה. הושבה וניהול אירוע רק אם באמת צריך.",
        layout: "phone-pair",
        items: [
          { src: INVITE_DESIGNS.birthday, alt: "הזמנה ליום הולדת", caption: "הזמנה מעוצבת", device: "phone" },
          { src: PRODUCT_SHOTS.guestRsvpMobile, alt: "אישור הגעה", caption: "קישור אישי", device: "phone" },
        ],
      };
    case "/for/corporate":
      return {
        heading: "אירוע חברה — רשימה, סטטוסים ותזכורות",
        lede: "ניהול מוזמנים עסקיים עם מעקב סטטוסים. לא מחליף מערכת כנסים עם סשנים מקבילים.",
        layout: "duo",
        items: [
          { src: INVITE_DESIGNS.corporate, alt: "הזמנה לאירוע חברה", caption: "הזמנה דיגיטלית", device: "phone" },
          { src: PRODUCT_SHOTS.eventMgmt, alt: "ניהול אירוע חברה", caption: "משימות ותקציב כתוספת", device: "laptop" },
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
        heading: "חינה — מוזמנים משני צדדים והושבה לפי צורך",
        lede: "רשימה נפרדת מהחתונה, הזמנה מעוצבת, ואישורי הגעה. הושבה רק כשיש שולחנות ונרכשה התוספת.",
        layout: "duo",
        items: [
          { src: INVITE_DESIGNS.henna, alt: "הזמנה לחינה", caption: "הזמנה דיגיטלית", device: "phone" },
          { src: PRODUCT_SHOTS.seating, alt: "מפת הושבה לחינה", caption: "שיבוץ כשיש שולחנות", device: "laptop" },
        ],
      };
    case "/rsvp/save-the-date":
      return {
        heading: "Save the Date מעוצב — ושליחה מהמערכת",
        lede: "עיצוב, הכנה במערכת והדמיית ההודעה שהאורח מקבל — בלי לאסוף אישור הגעה מוקדם מדי.",
        layout: "trio",
        items: [
          { src: INVITE_DESIGNS.saveTheDate, alt: "עיצוב Save the Date לחתונה של מאיה ואיתי", caption: "עיצוב Save the Date", device: "phone" },
          { src: PRODUCT_SHOTS.whatsappStd, alt: "הדמיית קבלת הודעת Save the Date", caption: "מה האורח מקבל", device: "phone" },
          { src: PRODUCT_SHOTS.messagesSaveTheDate, alt: "ממשק שליחת Save the Date במערכת", caption: "הכנה לשליחה בדמו", device: "laptop" },
        ],
      };
    case "/invitations/chatuna":
      return {
        heading: "גלריית הזמנות מעוצבות",
        lede: "קודם רואים את ההזמנה עצמה — ורק בהמשך את המעבר לאישור הגעה בקישור האישי. לא דשבורד ולא אתר חתונה.",
        layout: "phone-pair",
        items: [
          { src: INVITE_DESIGNS.wedding, alt: "הזמנה מעוצבת לחתונה של מאיה ואיתי", caption: "הזמנה דיגיטלית", device: "phone" },
          { src: INVITE_DESIGNS.barMitzvah, alt: "הזמנה דיגיטלית לבר מצווה", caption: "אותו מנגנון — עיצוב אחר", device: "phone" },
        ],
      };
    case "/rsvp/calls":
      return {
        heading: "מוקד אנושי, IVR ושילוב",
        lede: "אחרי סבבי הוואטסאפ — בוחרים מסלול שיחה לפי מי שנשאר פתוח. התשובה נשמרת ברשימה כמו אחרי קישור אישי.",
        layout: "duo",
        items: [
          {
            src: PRODUCT_SHOTS.dashboardLive,
            alt: "דשבורד — מי עדיין פתוח לפני סבב שיחות",
            caption: "מתחילים ממי שלא ענה",
            device: "laptop",
          },
          {
            src: PRODUCT_SHOTS.callsComparison,
            alt: "השוואת מוקד אנושי, שיחות מוקלטות ושילוב",
            caption: "שלוש אפשרויות בחבילות השיחה",
            device: "laptop",
          },
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
          { src: PRODUCT_SHOTS.seatingLive, alt: "מפת הושבה מאירוע הדוגמה מאיה ואיתי", device: "laptop" },
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
