import { guidePath } from "@/lib/seo/guides";

export const BLOG_HUB_PATH = "/blog";
export const BLOG_INDEX_MIN_ARTICLES = 2;

export const BLOG_CATEGORY_IDS = [
  "planning",
  "rsvp",
  "seating",
  "weddings",
  "family",
  "tools",
] as const;

/** Retired magazine paths. The category page redirects; the id stays reserved. */
export const RETIRED_BLOG_CATEGORY_IDS = ["business"] as const;

/**
 * Published guides that stay on their own URL and stay out of the magazine:
 * search, category rails, recommended cards, and related articles.
 */
export const MAGAZINE_EXCLUDED_SLUGS = ["rsvp-corporate-events"] as const;

export type BlogCategoryId = (typeof BLOG_CATEGORY_IDS)[number];

export type BlogSubcategory = {
  id: string;
  title: string;
  /** Existing service page, used when this topic has no article yet. */
  serviceHref?: string;
};

export type BlogCategory = {
  id: BlogCategoryId;
  title: string;
  description: string;
  intro: string;
  image: string;
  subcategories: BlogSubcategory[];
};

export type BlogPlacement = {
  categoryId: BlogCategoryId;
  subcategoryId: string;
  popularRank?: number;
};

export type BlogMenuLink = {
  href: string;
  label: string;
};

export type BlogMenuCategory = {
  id: BlogCategoryId;
  title: string;
  description: string;
  href: string;
  links: BlogMenuLink[];
};

export const HERO_SLUG = "wedding-planning";

export const RECOMMENDED_SLUGS = [
  "guest-list",
  "wedding-seating-arrangements",
  "how-to-choose-rsvp-company",
] as const;

export const BLOG_CATEGORIES: BlogCategory[] = [
  {
    id: "planning",
    title: "תכנון וארגון אירועים",
    description: "לוחות זמנים, ספקים ויום האירוע",
    intro:
      "איך מסדרים את הדרך לאירוע: מתי שולחים, אילו ספקים סוגרים קודם, ומה בודקים לפני שהאולם נפתח. המאמרים כאן עוזרים לבנות סדר עבודה בלי להשאיר החלטות לערב האירוע.",
    image: "/marketing/luxury/editorial-details.webp",
    subcategories: [
      { id: "budget", title: "תקציב ועלויות" },
      { id: "timelines", title: "לוחות זמנים" },
      { id: "vendors", title: "בחירת ספקים" },
      { id: "checklists", title: "רשימות משימות" },
      { id: "event-day", title: "ניהול יום האירוע" },
      { id: "tips", title: "טיפים לתכנון אירוע" },
    ],
  },
  {
    id: "rsvp",
    title: "אישורי הגעה והזמנות",
    description: "וואטסאפ, הזמנות ומעקב אחרי תשובות",
    intro:
      "שליחת הזמנה, Save the Date, סבבי אישור ומעקב אחרי מי שטרם ענה. כל מאמר מטפל בשלב אחד, מהניסוח ועד הרשימה המעודכנת.",
    image: "/marketing/luxury/editorial-bouquet.webp",
    subcategories: [
      { id: "whatsapp", title: "אישורי הגעה בוואטסאפ" },
      { id: "phone", title: "אישורי הגעה בטלפון" },
      { id: "sms", title: "אישורי הגעה ב־SMS" },
      { id: "voice", title: "אישורי הגעה באמצעות מענה קולי" },
      { id: "digital", title: "הזמנות דיגיטליות" },
      { id: "save-the-date", title: "Save the Date" },
      { id: "tracking", title: "מעקב אחרי מוזמנים" },
      { id: "rounds", title: "סבבי אישורי הגעה" },
    ],
  },
  {
    id: "seating",
    title: "סידורי הושבה וניהול אורחים",
    description: "שולחנות, מפות והגעה ביום האירוע",
    intro:
      "משלב רשימת המוזמנים ועד מפת השולחנות ביום האירוע: חלוקה לקבוצות, ספירת מנות, שינויי שיבוץ וקבלת אורחים.",
    image: "/marketing/luxury/editorial-tablescape.webp",
    subcategories: [
      { id: "tables", title: "תכנון שולחנות" },
      { id: "maps", title: "מפות הושבה" },
      { id: "groups", title: "חלוקת אורחים לקבוצות" },
      { id: "meals", title: "ספירת מנות" },
      { id: "lists", title: "ניהול רשימות מוזמנים" },
      { id: "changes", title: "שינויים בסידורי הושבה" },
      { id: "arrival", title: "ניהול הגעת אורחים בפועל" },
    ],
  },
  {
    id: "weddings",
    title: "חתונות",
    description: "תכנון חתונה, אתר אישי והזמנות",
    intro:
      "החלטות של זוגות לקראת החתונה: תכנון כללי, אתר חתונה אישי, וההבדל בין אתר להזמנה דיגיטלית.",
    image: "/marketing/luxury/editorial-couple-garden.webp",
    subcategories: [
      { id: "plan", title: "תכנון חתונה" },
      { id: "budget", title: "תקציב חתונה" },
      { id: "guests", title: "רשימת מוזמנים לחתונה" },
      { id: "sites", title: "אתרי חתונה אישיים" },
      { id: "design", title: "עיצוב והזמנות" },
      { id: "venue", title: "בחירת אולם וספקים" },
      { id: "timelines", title: "לוחות זמנים לחתונה" },
      { id: "tips", title: "טיפים לזוגות" },
    ],
  },
  {
    id: "family",
    title: "אירועים משפחתיים",
    description: "בר ובת מצווה, ברית ואירועים קטנים",
    intro:
      "אירועי משפחה עובדים עם אותם עקרונות של רשימה, אישורי הגעה והושבה — בקנה מידה אחר. כאן נאספים מדריכים לבר ובת מצווה, ברית, ימי הולדת ואירועים קטנים.",
    image: "/marketing/luxury/editorial-ceremony.webp",
    subcategories: [
      { id: "bar-mitzvah", title: "בר מצווה", serviceHref: "/rsvp/bar-bat-mitzvah" },
      { id: "bat-mitzvah", title: "בת מצווה", serviceHref: "/rsvp/bar-bat-mitzvah" },
      { id: "brit", title: "ברית ובריתה", serviceHref: "/rsvp/brit-brita" },
      { id: "birthdays", title: "ימי הולדת" },
      { id: "family", title: "אירועי משפחה" },
      { id: "small", title: "אירועים קטנים" },
    ],
  },
  {
    id: "tools",
    title: "טיפים, כלים ומחשבונים",
    description: "אלכוהול, מוזמנים והשוואת מחיר",
    intro:
      "כלים לחישוב לפני שסוגרים מספר מול האולם או מול ספק: אלכוהול, התחייבות אורחים, ומחיר אישורי הגעה לפי רשומות.",
    image: "/marketing/luxury/editorial-rings-flowers.webp",
    subcategories: [
      { id: "alcohol", title: "מחשבון אלכוהול לאירוע" },
      { id: "guests-calc", title: "מחשבון מוזמנים" },
      { id: "budget-calc", title: "מחשבון תקציב" },
      { id: "checklists", title: "רשימות בדיקה" },
      { id: "prices", title: "השוואות מחירים" },
      { id: "practical", title: "מדריכים מעשיים" },
    ],
  },
];

export const BLOG_PLACEMENTS: Record<string, BlogPlacement> = {
  "when-to-send-rsvp": { categoryId: "planning", subcategoryId: "timelines", popularRank: 8 },
  "wedding-vendors-contracts": { categoryId: "planning", subcategoryId: "vendors", popularRank: 12 },
  "event-day-checklist": { categoryId: "planning", subcategoryId: "checklists", popularRank: 6 },
  "event-management-vs-production": { categoryId: "planning", subcategoryId: "event-day", popularRank: 14 },

  "whatsapp-invitation-wording": { categoryId: "rsvp", subcategoryId: "whatsapp", popularRank: 11 },
  "whatsapp-vs-sms-rsvp": { categoryId: "rsvp", subcategoryId: "whatsapp", popularRank: 2 },
  "how-phone-rsvp-works": { categoryId: "rsvp", subcategoryId: "phone", popularRank: 16 },
  "send-digital-invitation": { categoryId: "rsvp", subcategoryId: "digital", popularRank: 9 },
  "bit-paybox-wedding-invitation": { categoryId: "rsvp", subcategoryId: "digital", popularRank: 18 },
  "save-the-date-vs-invitation": { categoryId: "rsvp", subcategoryId: "save-the-date", popularRank: 10 },
  "when-to-send-save-the-date": { categoryId: "rsvp", subcategoryId: "save-the-date", popularRank: 15 },
  "tracking-rsvp-responses": { categoryId: "rsvp", subcategoryId: "tracking", popularRank: 13 },
  "guests-who-dont-reply": { categoryId: "rsvp", subcategoryId: "tracking", popularRank: 5 },
  "manage-guests-after-rsvp": { categoryId: "rsvp", subcategoryId: "tracking", popularRank: 20 },
  "personal-rsvp-link": { categoryId: "rsvp", subcategoryId: "tracking", popularRank: 19 },
  "plus-ones-and-kids-rsvp": { categoryId: "rsvp", subcategoryId: "tracking", popularRank: 21 },
  "overseas-guests-rsvp": { categoryId: "rsvp", subcategoryId: "tracking", popularRank: 22 },
  "last-minute-guest-changes": { categoryId: "rsvp", subcategoryId: "tracking", popularRank: 17 },
  "rsvp-reminder-rounds": { categoryId: "rsvp", subcategoryId: "rounds", popularRank: 23 },
  "how-to-choose-rsvp-company": { categoryId: "rsvp", subcategoryId: "rounds", popularRank: 4 },

  "wedding-seating-arrangements": { categoryId: "seating", subcategoryId: "tables", popularRank: 7 },
  "seating-plan": { categoryId: "seating", subcategoryId: "maps", popularRank: 3 },
  "seating-families-groups": { categoryId: "seating", subcategoryId: "groups", popularRank: 24 },
  "reduce-meal-waste": { categoryId: "seating", subcategoryId: "meals", popularRank: 25 },
  "guest-list": { categoryId: "seating", subcategoryId: "lists", popularRank: 4 },
  "import-guest-list": { categoryId: "seating", subcategoryId: "lists", popularRank: 26 },
  "wedding-guest-list-excel": { categoryId: "seating", subcategoryId: "lists", popularRank: 33 },
  "table-number-message": { categoryId: "seating", subcategoryId: "changes", popularRank: 27 },
  "seating-live-day-of": { categoryId: "seating", subcategoryId: "arrival", popularRank: 28 },
  "venue-guest-check-in": { categoryId: "seating", subcategoryId: "arrival", popularRank: 29 },
  "seating-cards-vs-qr": { categoryId: "seating", subcategoryId: "arrival", popularRank: 30 },

  "wedding-planning": { categoryId: "weddings", subcategoryId: "plan", popularRank: 1 },
  "wedding-website-guide": { categoryId: "weddings", subcategoryId: "sites", popularRank: 31 },
  "wedding-website-vs-digital-invitation": { categoryId: "weddings", subcategoryId: "sites", popularRank: 32 },

  "wedding-alcohol-calculator": { categoryId: "tools", subcategoryId: "alcohol", popularRank: 4 },
  "wedding-venue-guest-guarantee": { categoryId: "tools", subcategoryId: "guests-calc", popularRank: 6 },
  "cost-rsvp-wedding": { categoryId: "tools", subcategoryId: "prices", popularRank: 2 },
};

export function isBlogCategoryId(value: string): value is BlogCategoryId {
  return (BLOG_CATEGORY_IDS as readonly string[]).includes(value);
}

export function categoryById(id: BlogCategoryId) {
  const category = BLOG_CATEGORIES.find((item) => item.id === id);
  if (!category) throw new Error(`Unknown blog category ${id}`);
  return category;
}

export function subcategoryById(categoryId: BlogCategoryId, subcategoryId: string) {
  return categoryById(categoryId).subcategories.find((item) => item.id === subcategoryId);
}

export function categoryPath(id: BlogCategoryId) {
  return `${BLOG_HUB_PATH}/${id}`;
}

export function placementForSlug(slug: string) {
  return BLOG_PLACEMENTS[slug];
}

export function slugsFor(categoryId: BlogCategoryId, subcategoryId?: string) {
  return Object.entries(BLOG_PLACEMENTS)
    .filter(([, placement]) => {
      if (placement.categoryId !== categoryId) return false;
      if (subcategoryId && placement.subcategoryId !== subcategoryId) return false;
      return true;
    })
    .map(([slug]) => slug);
}

export function placedArticleCount(categoryId: BlogCategoryId) {
  return slugsFor(categoryId).length;
}

export function categoryIsIndexable(articleCount: number) {
  return articleCount >= BLOG_INDEX_MIN_ARTICLES;
}

/** Public menu: every category, and only subcategories that already lead somewhere. */
export function blogMenu(): BlogMenuCategory[] {
  return BLOG_CATEGORIES.map((category) => {
    const seen = new Set<string>();
    const links: BlogMenuLink[] = [];

    for (const sub of category.subcategories) {
      const slugs = slugsFor(category.id, sub.id);
      let href = "";
      if (slugs.length > 0) {
        href =
          placedArticleCount(category.id) >= BLOG_INDEX_MIN_ARTICLES
            ? `${categoryPath(category.id)}#sub-${sub.id}`
            : guidePath(slugs[0]);
      } else if (sub.serviceHref) {
        href = sub.serviceHref;
      }
      if (!href || seen.has(href)) continue;
      seen.add(href);
      links.push({ href, label: sub.title });
    }

    return {
      id: category.id,
      title: category.title,
      description: category.description,
      href: categoryPath(category.id),
      links,
    };
  });
}

export function indexableCategoryPaths() {
  return BLOG_CATEGORIES.filter(
    (category) => placedArticleCount(category.id) >= BLOG_INDEX_MIN_ARTICLES
  ).map((category) => categoryPath(category.id));
}
