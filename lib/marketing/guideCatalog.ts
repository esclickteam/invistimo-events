/**
 * Knowledge-center categories for the compact guides menu and /info/guides.
 * Magazine-excluded guides stay published on their own URL and are omitted here.
 * The header shows at most four
 * featured guides per category; the hub lists the full set.
 */
import { guidePath } from "@/lib/seo/guides";

export type GuideCategoryId = "planning" | "guests" | "seating" | "tools";

export type GuideFeaturedLink = {
  slug: string;
  href: string;
  label: string;
};

export type GuideCategory = {
  id: GuideCategoryId;
  title: string;
  description: string;
  href: string;
  allLabel: string;
  slugs: string[];
  featured: GuideFeaturedLink[];
};

export const GUIDE_HUB_PATH = "/info/guides";

export function guideCategoryHref(id: GuideCategoryId) {
  return `${GUIDE_HUB_PATH}#cat-${id}`;
}

function category(
  id: GuideCategoryId,
  title: string,
  description: string,
  slugs: string[],
  featured: { slug: string; label: string }[]
): GuideCategory {
  return {
    id,
    title,
    description,
    href: guideCategoryHref(id),
    allLabel: "כל המדריכים בקטגוריה",
    slugs,
    featured: featured.map((item) => ({
      slug: item.slug,
      label: item.label,
      href: guidePath(item.slug),
    })),
  };
}

export const GUIDE_CATEGORIES: GuideCategory[] = [
  category(
    "planning",
    "תכנון חתונה",
    "לוח זמנים, ספקים ויום האירוע",
    [
      "wedding-planning",
      "event-management-vs-production",
      "event-day-checklist",
      "wedding-vendors-contracts",
      "send-digital-invitation",
      "bit-paybox-wedding-invitation",
      "save-the-date-vs-invitation",
      "when-to-send-save-the-date",
      "wedding-website-guide",
      "wedding-website-vs-digital-invitation",
    ],
    [
      { slug: "wedding-planning", label: "המדריך המלא לתכנון חתונה" },
      { slug: "wedding-vendors-contracts", label: "ספקים, חוזים ומקדמות" },
      { slug: "save-the-date-vs-invitation", label: "Save the Date מול הזמנה" },
      { slug: "event-day-checklist", label: "צ׳קליסט לפני יום האירוע" },
    ]
  ),
  category(
    "guests",
    "מוזמנים ואישורי הגעה",
    "רשימה, שליחה ומעקב אחרי תשובות",
    [
      "guest-list",
      "how-to-choose-rsvp-company",
      "when-to-send-rsvp",
      "guests-who-dont-reply",
      "whatsapp-vs-sms-rsvp",
      "tracking-rsvp-responses",
      "how-phone-rsvp-works",
      "rsvp-reminder-rounds",
      "personal-rsvp-link",
      "manage-guests-after-rsvp",
      "import-guest-list",
      "plus-ones-and-kids-rsvp",
      "overseas-guests-rsvp",
      "last-minute-guest-changes",
      "whatsapp-invitation-wording",
      "reduce-meal-waste",
    ],
    [
      { slug: "guest-list", label: "ניהול רשימת מוזמנים" },
      { slug: "when-to-send-rsvp", label: "מתי שולחים אישורי הגעה" },
      { slug: "guests-who-dont-reply", label: "אורחים שלא עונים" },
      { slug: "how-to-choose-rsvp-company", label: "איך בוחרים חברת אישורי הגעה" },
    ]
  ),
  category(
    "seating",
    "סידורי הושבה",
    "מפה, שיבוץ וקבלת אורחים",
    [
      "wedding-seating-arrangements",
      "seating-plan",
      "seating-cards-vs-qr",
      "table-number-message",
      "seating-live-day-of",
      "seating-families-groups",
      "venue-guest-check-in",
    ],
    [
      { slug: "wedding-seating-arrangements", label: "המדריך לסידורי הושבה" },
      { slug: "seating-plan", label: "הכנת הושבה במערכת" },
      { slug: "seating-cards-vs-qr", label: "פתקיות הושבה או QR" },
      { slug: "table-number-message", label: "הודעת מספר שולחן" },
    ]
  ),
  category(
    "tools",
    "כלים ומחשבונים",
    "אלכוהול, התחייבות לאולם ומחיר",
    [
      "wedding-alcohol-calculator",
      "wedding-venue-guest-guarantee",
      "cost-rsvp-wedding",
    ],
    [
      { slug: "wedding-alcohol-calculator", label: "מחשבון אלכוהול לחתונה" },
      { slug: "wedding-venue-guest-guarantee", label: "כמה אורחים להתחייב לאולם" },
      { slug: "cost-rsvp-wedding", label: "מחיר אישורי הגעה לפי רשומות" },
    ]
  ),
];

export function categoryForSlug(slug: string) {
  return GUIDE_CATEGORIES.find((category) => category.slugs.includes(slug));
}
