import { getWeddingTemplate } from "@/config/weddingWebsite/templates";

export const WW_PATH = "/wedding-website";

export const WW_META = {
  title: "אתר חתונה אישי ומעוצב | תבניות ואתרי חתונה | Invistimo",
  description:
    "אתר חתונה אישי בעיצוב יוקרתי עם תמונות, סיפור זוגי ופרטי האירוע. צפו בדוגמאות לאתרי חתונה ובחרו עיצוב שמתאים לחתונה שלכם.",
} as const;

/** Featured styles mapped only to real product templates. */
export const FEATURED_STYLES = [
  {
    templateId: "eternal-gold",
    styleName: "Timeless Elegance",
    hebrewLabel: "אלגנטיות נצחית",
    blurb:
      "מראה קלאסי ונקי — שמנת, זהב מעודן וטיפוגרפיה אלגנטית שמתאימה לחתונה formal.",
  },
  {
    templateId: "garden-bloom",
    styleName: "Romantic Garden",
    hebrewLabel: "גן רומנטי",
    blurb:
      "אווירת גן פורח — צילום זוגי, ירוק רך ורומנטיקה שמרגישה קלה וטבעית.",
  },
  {
    templateId: "minimal-noir",
    styleName: "Modern Editorial",
    hebrewLabel: "מגזין מודרני",
    blurb:
      "פריסה דרמטית עם טיפוגרפיה חזקה וצילום גדול — תחושת מגזין חתונות בינלאומי.",
  },
  {
    templateId: "midnight-velvet",
    styleName: "Luxury Evening",
    hebrewLabel: "ערב יוקרתי",
    blurb:
      "צבעים עמוקים, זהב מעודן ומראה ערב קולנועי — לזוגות שרוצים נוכחות חזקה.",
  },
] as const;

export const HERO_TEMPLATE_ID = "eternal-gold";
export const SCROLL_VIDEO_TEMPLATE_ID = "eternal-gold";

export const WW_MEDIA = {
  og: "/images/rsvp/guides/wedding-planning/couple.jpg",
  video: {
    src: "/marketing/videos/wedding-website-scroll.webm",
    poster: "/marketing/videos/wedding-website-scroll-poster.jpg",
    title: "גלילה באתר חתונה לדוגמה — Invistimo",
    description:
      "הקלטת מסך אמיתית של תבנית אתר חתונה פעילה במערכת Invistimo, עם נתוני דמו.",
    uploadDate: "2026-10-26",
  },
  mobileDemo: "/images/rsvp/guides/wedding-planning/couple.jpg",
  anatomy: "/images/rsvp/guides/wedding-planning/hero-reception.jpg",
} as const;

export const WW_LINKS = {
  contact: "/contact",
  pricing: "/pricing",
  invitations: "/invitations/chatuna",
  rsvp: "/rsvp",
  rsvpWedding: "/rsvp/chatuna",
  saveTheDate: "/rsvp/save-the-date",
  seating: "/seating-explained",
  guestList: "/info/guides/guest-list",
  weddingPlanning: "/info/guides/wedding-planning",
  guides: "/info/guides",
} as const;

/** Capabilities verified against demo content + template sections. */
export const VERIFIED_CAPABILITIES = [
  {
    id: "story",
    title: "הסיפור שלנו",
    text: "טקסט אישי על ההיכרות והסיפור הזוגי — כפי שנתמך בתבניות עם מקטע Our Story.",
  },
  {
    id: "gallery",
    title: "תמונות זוגיות",
    text: "גלריה שמוסיפה אופי אישי לאתר ומשלימה את האווירה של העיצוב.",
  },
  {
    id: "details",
    title: "מתי ואיפה?",
    text: "תאריך, שעה, שם האולם והכתובת — במקום אחד שקל למצוא.",
  },
  {
    id: "nav",
    title: "ניווט לאירוע",
    text: "קישורי ניווט ל־Waze ול־Google Maps, בהתאם להגדרות האתר.",
  },
  {
    id: "schedule",
    title: "לוח זמנים",
    text: "קבלת פנים, חופה ושלבים נוספים — כשהתבנית כוללת מקטע לוח זמנים.",
  },
  {
    id: "guests",
    title: "מידע לאורחים",
    text: "חניה, הסעות והנחיות הגעה דרך מקטעי תחבורה ומידע נתמכים בתבנית.",
  },
] as const;

export const COMPARE_ROWS = [
  {
    feature: "מטרה",
    website: "חוויה ומידע",
    invite: "הזמנה לאירוע",
    personal: "איסוף תשובה",
  },
  {
    feature: "תוכן אישי",
    website: "מורחב",
    invite: "ממוקד",
    personal: "ממוקד באורח",
  },
  {
    feature: "שיתוף",
    website: "קישור לאתר",
    invite: "שליחת הזמנה",
    personal: "קישור אישי",
  },
  {
    feature: "אישור הגעה",
    website: "לפי שילוב נתמך",
    invite: "לפי שילוב נתמך",
    personal: "בהתאם למערכת",
  },
  {
    feature: "פרטי אירוע",
    website: "כן",
    invite: "כן",
    personal: "לפי הממשק",
  },
] as const;

export const WHY_ITEMS = [
  "מקום אחד שמרכז מידע חשוב לאורחים",
  "דרך יפה לשתף את הסיפור הזוגי",
  "גישה נוחה לתאריך, שעה ומיקום",
  "חוויית מובייל נוחה לקריאה ולניווט",
  "אפשרות לשתף תמונות זוגיות",
  "עיצוב שמתאים לאופי החתונה",
  "קישור נוח לשליחה בוואטסאפ או בכל ערוץ",
] as const;

export const STEPS = [
  {
    title: "בוחרים סגנון",
    text: "מתחילים מתבנית שמתאימה לאופי החתונה — קלאסי, רומנטי, מגזיני או ערב יוקרתי.",
  },
  {
    title: "מוסיפים את הפרטים",
    text: "שמות, תאריך, מקום האירוע, תמונות ותוכן אישי לפי האפשרויות הזמינות בעורך.",
  },
  {
    title: "בודקים את התצוגה",
    text: "מוודאים שהפרטים נכונים ושהאתר נראה טוב במחשב ובטלפון לפני השיתוף.",
  },
  {
    title: "משתפים עם האורחים",
    text: "שולחים את קישור האתר דרך הערוץ המועדף — לצד הזמנה דיגיטלית או בנפרד.",
  },
] as const;

export const CUSTOM_DESIGN_POINTS = [
  "עיצוב מותאם לסגנון החתונה",
  "שילוב תמונות ותוכן אישי",
  "התאמה לשפה הגרפית של האירוע",
  "אפשרות למבנה ייחודי לפי הצורך והתיאום",
  "חוויית גלישה מותאמת למובייל",
] as const;

export const SITE_ANATOMY = [
  "שמות בני הזוג",
  "תאריך האירוע",
  "תמונה זוגית",
  "הסיפור שלנו",
  "פרטי האירוע",
  "מיקום וניווט",
  "לוח זמנים",
  "גלריה",
  "מידע לאורחים",
] as const;

export function resolveFeaturedStyles() {
  return FEATURED_STYLES.map((style) => {
    const template = getWeddingTemplate(style.templateId);
    if (!template) {
      throw new Error(`Missing wedding template: ${style.templateId}`);
    }
    return { ...style, template };
  });
}

export function resolveHeroTemplate() {
  const template = getWeddingTemplate(HERO_TEMPLATE_ID);
  if (!template) throw new Error(`Missing hero template: ${HERO_TEMPLATE_ID}`);
  return template;
}
