import { BUILDER_THEME_LIST } from "@/config/sitePageLibrary/builderThemes";
import { getPostLoginRoute, getPublicPageRoute } from "@/config/sitePageLibrary/routes";
import type {
  PageScope,
  PageTemplateDefinition,
  PostLoginPageTypeId,
  PublicPageCategoryId,
  SectionTemplateDefinition,
} from "@/types/sitePageLibrary";

export const PUBLIC_PAGE_CATEGORIES: {
  id: PublicPageCategoryId;
  label: string;
  icon: string;
}[] = [
  { id: "services", label: "שירותים", icon: "⚙️" },
  { id: "gallery", label: "גלריה", icon: "🖼️" },
  { id: "contact", label: "יצירת קשר", icon: "📞" },
  { id: "products", label: "מוצרים", icon: "📦" },
  { id: "pricing", label: "מחירון", icon: "💰" },
  { id: "blog", label: "בלוג", icon: "📝" },
  { id: "events", label: "אירועים", icon: "📅" },
  { id: "reviews", label: "ביקורות", icon: "⭐" },
  { id: "team", label: "צוות", icon: "👥" },
  { id: "faq", label: "שאלות נפוצות", icon: "❓" },
  { id: "landing", label: "דף נחיתה", icon: "🚀" },
  { id: "resume", label: "קורות חיים", icon: "📄" },
];

export const POST_LOGIN_PAGE_TYPES: {
  id: PostLoginPageTypeId;
  label: string;
  description: string;
  formType?: "login" | "register" | null;
}[] = [
  {
    id: "login",
    label: "התחברות",
    description: "טופס התחברות — מחובר אוטומטית לנתיב ההתחברות",
    formType: "login",
  },
  {
    id: "register",
    label: "הרשמה",
    description: "טופס הרשמה — מחובר אוטומטית לנתיב ההרשמה",
    formType: "register",
  },
  {
    id: "account",
    label: "החשבון שלי",
    description: "עמוד אזור אישי — פרטי חשבון וסיכום",
  },
  {
    id: "orders",
    label: "הזמנות קודמות",
    description: "היסטוריית הזמנות ואישורי הגעה",
  },
  {
    id: "dashboard",
    label: "לוח בקרה",
    description: "סקירה כללית לאורח/לקוח",
  },
  {
    id: "profile",
    label: "פרופיל",
    description: "עריכת פרטים אישיים",
  },
  {
    id: "settings",
    label: "הגדרות",
    description: "העדפות והתראות",
  },
  {
    id: "messages",
    label: "הודעות",
    description: "הודעות מהמארחים",
  },
  {
    id: "rsvp-status",
    label: "סטטוס אישור הגעה",
    description: "מצב אישור ההגעה והעדכונים",
  },
];

const LAYOUTS_BY_TYPE: Record<
  PostLoginPageTypeId | PublicPageCategoryId,
  PageTemplateDefinition["layout"][]
> = {
  login: ["hero-form", "split-form", "card-form", "minimal-form", "hero-form", "split-form", "card-form", "minimal-form", "hero-form", "split-form"],
  register: ["split-form", "card-form", "hero-form", "minimal-form", "split-form", "card-form", "hero-form", "minimal-form", "split-form", "card-form"],
  account: ["dashboard", "split-form", "card-form", "dashboard", "split-form", "card-form", "dashboard", "split-form", "card-form", "dashboard"],
  orders: ["dashboard", "card-form", "split-form", "dashboard", "card-form", "split-form", "dashboard", "card-form", "split-form", "dashboard"],
  dashboard: ["dashboard", "dashboard", "split-form", "dashboard", "card-form", "dashboard", "split-form", "dashboard", "card-form", "dashboard"],
  profile: ["split-form", "card-form", "minimal-form", "split-form", "card-form", "minimal-form", "split-form", "card-form", "minimal-form", "split-form"],
  settings: ["card-form", "split-form", "minimal-form", "card-form", "split-form", "minimal-form", "card-form", "split-form", "minimal-form", "card-form"],
  messages: ["dashboard", "card-form", "split-form", "dashboard", "card-form", "split-form", "dashboard", "card-form", "split-form", "dashboard"],
  "rsvp-status": ["card-form", "hero-form", "split-form", "card-form", "hero-form", "split-form", "card-form", "hero-form", "split-form", "card-form"],
  services: ["hero-form", "split-form", "card-form", "minimal-form", "hero-form", "split-form", "card-form", "minimal-form", "hero-form", "split-form"],
  gallery: ["hero-form", "card-form", "split-form", "hero-form", "card-form", "split-form", "hero-form", "card-form", "split-form", "hero-form"],
  contact: ["split-form", "card-form", "minimal-form", "split-form", "card-form", "minimal-form", "split-form", "card-form", "minimal-form", "split-form"],
  products: ["card-form", "split-form", "hero-form", "card-form", "split-form", "hero-form", "card-form", "split-form", "hero-form", "card-form"],
  pricing: ["hero-form", "card-form", "split-form", "hero-form", "card-form", "split-form", "hero-form", "card-form", "split-form", "hero-form"],
  blog: ["split-form", "card-form", "minimal-form", "split-form", "card-form", "minimal-form", "split-form", "card-form", "minimal-form", "split-form"],
  events: ["hero-form", "split-form", "card-form", "hero-form", "split-form", "card-form", "hero-form", "split-form", "card-form", "hero-form"],
  reviews: ["card-form", "split-form", "hero-form", "card-form", "split-form", "hero-form", "card-form", "split-form", "hero-form", "card-form"],
  team: ["split-form", "hero-form", "card-form", "split-form", "hero-form", "card-form", "split-form", "hero-form", "card-form", "split-form"],
  faq: ["minimal-form", "card-form", "split-form", "minimal-form", "card-form", "split-form", "minimal-form", "card-form", "split-form", "minimal-form"],
  landing: ["hero-form", "hero-form", "split-form", "hero-form", "card-form", "hero-form", "split-form", "hero-form", "card-form", "hero-form"],
  resume: ["split-form", "minimal-form", "card-form", "split-form", "minimal-form", "card-form", "split-form", "minimal-form", "card-form", "split-form"],
};

const SECTION_COUNTS: Record<string, number[]> = {
  login: [2, 2, 3, 2, 2, 3, 2, 2, 3, 2],
  register: [2, 3, 2, 2, 3, 2, 2, 3, 2, 2],
  account: [3, 4, 3, 3, 4, 3, 3, 4, 3, 3],
  orders: [2, 3, 2, 2, 3, 2, 2, 3, 2, 2],
  default: [2, 3, 2, 3, 2, 3, 2, 3, 2, 3],
};

function getSectionCounts(typeId: string): number[] {
  return SECTION_COUNTS[typeId] || SECTION_COUNTS.default;
}

function buildPageTemplates(
  scope: PageScope,
  typeId: PublicPageCategoryId | PostLoginPageTypeId,
  label: string,
  shareId: string,
  requiresAuth: boolean,
  formType?: "login" | "register" | null
): PageTemplateDefinition[] {
  const layouts = LAYOUTS_BY_TYPE[typeId] || LAYOUTS_BY_TYPE.services;
  const sectionCounts = getSectionCounts(typeId);

  return BUILDER_THEME_LIST.map((theme, index) => {
    const variantIndex = index + 1;
    const route =
      scope === "postLogin"
        ? getPostLoginRoute(typeId as PostLoginPageTypeId, shareId)
        : getPublicPageRoute(typeId, shareId, `${typeId}-${variantIndex}`);

    return {
      id: `${scope}-${typeId}-v${variantIndex}`,
      scope,
      categoryId: typeId,
      variantIndex,
      themeId: theme.id,
      title: `${label} — עיצוב ${variantIndex}`,
      subtitle: theme.name,
      sectionCount: sectionCounts[index] || 2,
      route,
      requiresAuth,
      formType: formType || null,
      layout: layouts[index] || "card-form",
    };
  });
}

export function buildPublicPageTemplates(
  shareId: string
): PageTemplateDefinition[] {
  return PUBLIC_PAGE_CATEGORIES.flatMap((cat) =>
    buildPageTemplates("public", cat.id, cat.label, shareId, false)
  );
}

export function buildPostLoginPageTemplates(
  shareId: string
): PageTemplateDefinition[] {
  return POST_LOGIN_PAGE_TYPES.flatMap((type) =>
    buildPageTemplates(
      "postLogin",
      type.id,
      type.label,
      shareId,
      type.id !== "login" && type.id !== "register",
      type.formType
    )
  );
}

export function buildAllPageTemplates(shareId: string): PageTemplateDefinition[] {
  return [
    ...buildPublicPageTemplates(shareId),
    ...buildPostLoginPageTemplates(shareId),
  ];
}

export const SECTION_TEMPLATES: SectionTemplateDefinition[] = [
  { id: "sec-hero", label: "Hero", category: "כותרת", description: "כותרת ראשית עם תמונה", sectionCount: 1, themeId: "eternal-gold" },
  { id: "sec-countdown", label: "ספירה לאחור", category: "אירוע", description: "ספירה ליום האירוע", sectionCount: 1, themeId: "champagne-classic" },
  { id: "sec-gallery", label: "גלריה", category: "תוכן", description: "גלריית תמונות", sectionCount: 1, themeId: "coastal-breeze" },
  { id: "sec-rsvp", label: "אישור הגעה", category: "טופס", description: "טופס RSVP מחובר", sectionCount: 1, themeId: "eternal-gold" },
  { id: "sec-story", label: "הסיפור שלנו", category: "תוכן", description: "סיפור הזוג", sectionCount: 1, themeId: "royal-ivory" },
  { id: "sec-schedule", label: "לוח זמנים", category: "אירוע", description: "תוכנית היום", sectionCount: 1, themeId: "garden-bloom" },
  { id: "sec-location", label: "מיקום", category: "אירוע", description: "מפה וכתובת", sectionCount: 1, themeId: "modern-glass" },
  { id: "sec-faq", label: "שאלות נפוצות", category: "תוכן", description: "FAQ מתקפל", sectionCount: 1, themeId: "minimal-noir" },
  { id: "sec-gifts", label: "מתנות", category: "תוכן", description: "קישור למתנות", sectionCount: 1, themeId: "champagne-classic" },
  { id: "sec-guestbook", label: "ספר ברכות", category: "טופס", description: "ברכות מהאורחים", sectionCount: 1, themeId: "forest-enchanted" },
  { id: "sec-team", label: "צוות", category: "תוכן", description: "כרטיסי צוות", sectionCount: 1, themeId: "desert-rose" },
  { id: "sec-contact", label: "יצירת קשר", category: "טופס", description: "טופס פנייה", sectionCount: 1, themeId: "coastal-breeze" },
  { id: "sec-pricing", label: "מחירון", category: "תוכן", description: "כרטיסי מחיר", sectionCount: 1, themeId: "midnight-velvet" },
  { id: "sec-reviews", label: "ביקורות", category: "תוכן", description: "המלצות לקוחות", sectionCount: 1, themeId: "eternal-gold" },
  { id: "sec-footer", label: "Footer", category: "כותרת", description: "סיום העמוד", sectionCount: 1, themeId: "minimal-noir" },
  { id: "sec-login-form", label: "טופס התחברות", category: "אחרי התחברות", description: "מחובר ל-/login", sectionCount: 2, themeId: "champagne-classic" },
  { id: "sec-register-form", label: "טופס הרשמה", category: "אחרי התחברות", description: "מחובר ל-/register", sectionCount: 2, themeId: "eternal-gold" },
  { id: "sec-account-summary", label: "סיכום חשבון", category: "אחרי התחברות", description: "אזור אישי — החשבון שלי", sectionCount: 3, themeId: "royal-ivory" },
  { id: "sec-orders-list", label: "הזמנות קודמות", category: "אחרי התחברות", description: "רשימת הזמנות", sectionCount: 2, themeId: "coastal-breeze" },
  { id: "sec-dashboard-stats", label: "סטטיסטיקות", category: "אחרי התחברות", description: "לוח בקרה", sectionCount: 3, themeId: "modern-glass" },
];

export function countAllTemplates(shareId: string): number {
  return buildAllPageTemplates(shareId).length + SECTION_TEMPLATES.length;
}
