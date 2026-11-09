import { GUIDES } from "@/lib/seo/guides";
import {
  BLOG_CATEGORY_IDS,
  RETIRED_BLOG_CATEGORY_IDS,
  isBlogCategoryId,
  subcategoryById,
} from "@/lib/blog/taxonomy";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED = new Set<string>(["p", "preview", ...BLOG_CATEGORY_IDS, ...RETIRED_BLOG_CATEGORY_IDS]);

export type BlogPostInput = {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  categoryId?: string;
  subcategoryId?: string;
  coverImage?: string;
  coverAlt?: string;
  seoTitle?: string;
  seoDescription?: string;
  featured?: boolean;
  popular?: boolean;
  status?: "draft" | "published";
  faqs?: { q: string; a: string }[];
};

export function cleanPostInput(body: BlogPostInput) {
  const title = String(body.title || "").trim();
  const slug = String(body.slug || "").trim().toLowerCase();
  const excerpt = String(body.excerpt || "").trim();
  const text = String(body.body || "").trim();
  const categoryId = String(body.categoryId || "").trim();
  const subcategoryId = String(body.subcategoryId || "").trim();
  const status = body.status === "published" ? "published" : "draft";

  if (!title || !excerpt || !text) {
    throw new Error("חסרים כותרת, תקציר או תוכן");
  }
  if (!SLUG.test(slug) || slug.length > 80) {
    throw new Error("הכתובת צריכה להיות באנגלית, באותיות קטנות ומקפים");
  }
  if (RESERVED.has(slug) || GUIDES.some((guide) => guide.slug === slug)) {
    throw new Error("הכתובת הזו תפוסה");
  }
  if (!isBlogCategoryId(categoryId) || !subcategoryById(categoryId, subcategoryId)) {
    throw new Error("קטגוריה או תת־קטגוריה לא מוכרת");
  }

  const faqs = Array.isArray(body.faqs)
    ? body.faqs
        .map((faq) => ({ q: String(faq?.q || "").trim(), a: String(faq?.a || "").trim() }))
        .filter((faq) => faq.q && faq.a)
        .slice(0, 12)
    : [];

  return {
    title,
    slug,
    excerpt,
    body: text,
    categoryId,
    subcategoryId,
    coverImage: String(body.coverImage || "").trim(),
    coverAlt: String(body.coverAlt || "").trim().slice(0, 300),
    seoTitle: String(body.seoTitle || "").trim(),
    seoDescription: String(body.seoDescription || "").trim(),
    featured: Boolean(body.featured),
    popular: Boolean(body.popular),
    status,
    faqs,
    publishedAt: status === "published" ? new Date() : undefined,
  };
}
