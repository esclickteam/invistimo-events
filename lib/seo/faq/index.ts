import { FAQ_CATEGORIES, getFaqCategory } from "./categories";
import { GETTING_STARTED_ITEMS } from "./items-getting-started";
import { PRICING_ITEMS } from "./items-pricing";
import { GUEST_LIST_ITEMS } from "./items-guest-list";
import { RSVP_ITEMS } from "./items-rsvp";
import { MESSAGING_ITEMS } from "./items-messaging";
import { INVITATION_ITEMS, SAVE_THE_DATE_ITEMS } from "./items-invitations-std";
import { SEATING_ITEMS, STAFF_QR_ITEMS } from "./items-seating-staff";
import {
  EVENT_MANAGEMENT_ITEMS,
  WEDDING_WEBSITE_ITEMS,
  PRIVACY_ITEMS,
  SUPPORT_ITEMS,
} from "./items-management-web-privacy-support";
import { buildFaqSearchBlob } from "./search";
import type { FaqItem, FaqSection } from "./types";

export type { FaqCategory, FaqItem, FaqLink, FaqMedia, FaqSection } from "./types";
export { FAQ_CATEGORIES, getFaqCategory } from "./categories";
export {
  normalizeFaqText,
  faqTextMatches,
  highlightFaqMatch,
  buildFaqSearchBlob,
} from "./search";

/** All published FAQ items in category order */
export const ALL_FAQ_ITEMS: FaqItem[] = [
  ...GETTING_STARTED_ITEMS,
  ...PRICING_ITEMS,
  ...GUEST_LIST_ITEMS,
  ...RSVP_ITEMS,
  ...MESSAGING_ITEMS,
  ...INVITATION_ITEMS,
  ...SAVE_THE_DATE_ITEMS,
  ...SEATING_ITEMS,
  ...STAFF_QR_ITEMS,
  ...EVENT_MANAGEMENT_ITEMS,
  ...WEDDING_WEBSITE_ITEMS,
  ...PRIVACY_ITEMS,
  ...SUPPORT_ITEMS,
].filter((item) => item.published);

export function publishedFaqItems(): FaqItem[] {
  return ALL_FAQ_ITEMS;
}

export function faqItemsByCategory(categoryId: string): FaqItem[] {
  return ALL_FAQ_ITEMS.filter((item) => item.categoryId === categoryId);
}

/** Legacy section shape used by FAQPage schema + older consumers */
export function buildFaqSections(): FaqSection[] {
  return FAQ_CATEGORIES.map((category) => ({
    title: category.title,
    items: faqItemsByCategory(category.id).map((item) => ({
      id: item.id,
      q: item.q,
      a: item.a,
    })),
  })).filter((section) => section.items.length > 0);
}

export function allFaqItems(): Array<{ q: string; a: string; id?: string }> {
  return ALL_FAQ_ITEMS.map((item) => ({ id: item.id, q: item.q, a: item.a }));
}

export function getFaqItemById(id: string): FaqItem | undefined {
  return ALL_FAQ_ITEMS.find((item) => item.id === id);
}

export function faqSearchHaystack(item: FaqItem): string {
  const category = getFaqCategory(item.categoryId);
  return buildFaqSearchBlob([
    item.q,
    item.a,
    category?.title ?? "",
    category?.shortTitle ?? "",
    ...(item.keywords ?? []),
    ...(item.links?.map((l) => l.label) ?? []),
  ]);
}

export function countFaqsByCategory(): Array<{ id: string; title: string; count: number }> {
  return FAQ_CATEGORIES.map((category) => ({
    id: category.id,
    title: category.title,
    count: faqItemsByCategory(category.id).length,
  }));
}

/** Content last reviewed for the knowledge center */
export const FAQ_CONTENT_UPDATED = "2026-10-27";
