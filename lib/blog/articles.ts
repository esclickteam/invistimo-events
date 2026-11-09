import fs from "node:fs";
import path from "node:path";
import type { Guide } from "@/lib/seo/guides";
import { GUIDES, guidePath } from "@/lib/seo/guides";
import { routeContentDate } from "@/lib/seo/contentDates";
import { countWords, minutesFromWordCount } from "@/lib/blog/reading";
import { coverFor } from "@/lib/blog/covers";
import {
  BLOG_CATEGORIES,
  BLOG_PLACEMENTS,
  HERO_SLUG,
  MAGAZINE_EXCLUDED_SLUGS,
  RECOMMENDED_SLUGS,
  categoryById,
  type BlogCategoryId,
} from "@/lib/blog/taxonomy";

export type BlogArticle = {
  id: string;
  slug: string;
  href: string;
  title: string;
  description: string;
  categoryId: BlogCategoryId;
  subcategoryId: string;
  categoryTitle: string;
  subcategoryTitle: string;
  image: string;
  imageAlt: string;
  readingMinutes: number;
  modified: string;
  popularRank: number;
  featured: boolean;
  hero: boolean;
  searchText: string;
  source: "guide" | "post";
};

function hebrewWords(source: string) {
  return source
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .split(/\s+/)
    .filter((word) => /[\u0590-\u05FF]/.test(word))
    .join(" ");
}

function dedicatedBlob(slug: string) {
  const dir = path.join(process.cwd(), "app", "(marketing)", "info", "guides", slug);
  if (!fs.existsSync(dir)) return "";
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".tsx") || name.endsWith(".ts"))
    .map((name) => hebrewWords(fs.readFileSync(path.join(dir, name), "utf8")))
    .join(" ");
}

function guideBlob(guide: Guide) {
  const parts = [guide.h1, guide.title, guide.lede, guide.description, guide.titleAccent || ""];
  for (const section of guide.sections) {
    parts.push(section.heading, ...section.paragraphs, ...(section.bullets || []));
    for (const row of section.compare || []) parts.push(row.title, row.text);
    for (const row of section.timeline || []) parts.push(row.title, row.text);
    if (section.callout) parts.push(section.callout.title || "", ...section.callout.lines);
  }
  for (const faq of guide.faqs) parts.push(faq.q, faq.a);
  for (const benefit of guide.benefits || []) parts.push(benefit.title, benefit.text);
  for (const step of guide.steps || []) parts.push(step.title, step.text);
  return parts.filter(Boolean).join("\n");
}

function imageFor(guide: Guide) {
  const cover = coverFor(guide.slug, guide.h1);
  if (!cover) throw new Error(`Guide ${guide.slug} is missing a unique cover`);
  return cover;
}

export function codeArticles(): BlogArticle[] {
  return GUIDES.filter(
    (guide) => !(MAGAZINE_EXCLUDED_SLUGS as readonly string[]).includes(guide.slug)
  ).map((guide) => {
    const placement = BLOG_PLACEMENTS[guide.slug];
    if (!placement) {
      throw new Error(`Guide ${guide.slug} is missing a blog placement`);
    }
    const category = categoryById(placement.categoryId);
    const subcategory = category.subcategories.find((item) => item.id === placement.subcategoryId);
    if (!subcategory) {
      throw new Error(`Guide ${guide.slug} points at an unknown subcategory`);
    }
    const blob = `${guideBlob(guide)}\n${dedicatedBlob(guide.slug)}`;
    const dates = routeContentDate(guidePath(guide.slug));
    const image = imageFor(guide);
    return {
      id: `guide:${guide.slug}`,
      slug: guide.slug,
      href: guidePath(guide.slug),
      title: guide.h1,
      description: guide.description,
      categoryId: placement.categoryId,
      subcategoryId: placement.subcategoryId,
      categoryTitle: category.title,
      subcategoryTitle: subcategory.title,
      image: image.src,
      imageAlt: image.alt,
      readingMinutes: minutesFromWordCount(countWords(blob)),
      modified: dates?.modified || "2026-11-02",
      popularRank: placement.popularRank ?? 80,
      featured: (RECOMMENDED_SLUGS as readonly string[]).includes(guide.slug),
      hero: guide.slug === HERO_SLUG,
      searchText: blob.slice(0, 1800),
      source: "guide",
    };
  });
}

export function articlesForCategory(articles: BlogArticle[], categoryId: BlogCategoryId) {
  return articles.filter((article) => article.categoryId === categoryId);
}

export function categoryCounts(articles: BlogArticle[]) {
  const counts = Object.fromEntries(BLOG_CATEGORIES.map((category) => [category.id, 0])) as Record<
    BlogCategoryId,
    number
  >;
  for (const article of articles) counts[article.categoryId] += 1;
  return counts;
}
