/** Maintainable FAQ knowledge-center types. Internal fields are never rendered. */

export type FaqLink = {
  href: string;
  label: string;
};

export type FaqImageMedia = {
  type: "image";
  src: string;
  alt: string;
  caption?: string;
};

export type FaqVideoMedia = {
  type: "video";
  src: string;
  title: string;
  poster?: string;
  caption?: string;
};

export type FaqMedia = FaqImageMedia | FaqVideoMedia;

export type FaqItem = {
  /** Stable fragment id: /faq#what-is-invistimo */
  id: string;
  categoryId: string;
  q: string;
  /** Plain-text answer — also used for FAQPage JSON-LD */
  a: string;
  links?: FaqLink[];
  media?: FaqMedia;
  /** Extra search tokens (synonyms, common misspellings, English terms) */
  keywords?: string[];
  updatedAt: string;
  published: boolean;
  /** Related service path for internal grouping */
  service?: string;
  /**
   * Internal verification note only — never shown on the public page.
   * Examples: "packageQuote.ts", "terms §8", "NOT VERIFIED price X"
   */
  verifiedSource?: string;
};

export type FaqCategory = {
  id: string;
  title: string;
  /** Short label for chips / mobile nav */
  shortTitle: string;
  description?: string;
  relatedHref?: string;
  relatedLabel?: string;
};

/** Legacy accordion / schema shape */
export type FaqSection = {
  title: string;
  items: Array<{ q: string; a: string; id?: string }>;
};
