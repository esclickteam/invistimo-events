/**
 * Public FAQ knowledge center — re-exports the maintainable FAQ module.
 * Keep FAQPage schema consumers on `allFaqItems()` / `FAQ_SECTIONS`.
 */

export {
  ALL_FAQ_ITEMS,
  FAQ_CATEGORIES,
  FAQ_CONTENT_UPDATED,
  allFaqItems,
  buildFaqSections,
  countFaqsByCategory,
  faqItemsByCategory,
  faqSearchHaystack,
  getFaqCategory,
  getFaqItemById,
  publishedFaqItems,
} from "@/lib/seo/faq";

export type { FaqCategory, FaqItem, FaqLink, FaqMedia, FaqSection } from "@/lib/seo/faq";

import { buildFaqSections } from "@/lib/seo/faq";

/** @deprecated Prefer buildFaqSections() — kept for existing imports */
export const FAQ_SECTIONS = buildFaqSections();
