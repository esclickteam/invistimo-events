import fs from "fs";
import path from "path";
import { resolveAppEnv } from "@/lib/env/appEnv";
import { minutesFromText } from "@/lib/blog/reading";

export type DraftArticle = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  categoryId: string;
  subcategoryId: string;
  coverImage: string;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
  faqs: { q: string; a: string }[];
  readingMinutes: number;
  wave: 1 | 2;
};

const WAVE_ONE = new Set(["rsvp-bar-bat-mitzvah", "brit-guest-list"]);

const ORDER = [
  "rsvp-bar-bat-mitzvah",
  "brit-guest-list",
  "rsvp-henna-two-sides",
  "when-to-send-bar-mitzvah-rsvp",
  "bar-mitzvah-seating",
  "bar-mitzvah-meal-count",
  "save-the-date-family-events",
  "when-to-add-call-package",
  "henna-seating-two-sides",
];

/** Draft review is for local work and preview deployments. Production and public staging stay closed. */
export function draftsPreviewEnabled(env = resolveAppEnv()) {
  if (env === "production") return false;
  if (env === "development" || env === "test" || env === "preview") return true;
  const vercel = String(process.env.VERCEL_ENV || "").trim().toLowerCase();
  return env === "staging" && vercel !== "staging" && vercel !== "production";
}

/** Drop the duplicate title and the FAQ copy. FAQs render from their own field. */
export function articleBody(raw: string) {
  let body = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  body = body.replace(/^#\s+[^\n]+\n*/, "");
  const match = /^## שאלות נפוצות\s*$/m.exec(body);
  if (match && match.index !== undefined) {
    const after = body.slice(match.index + match[0].length);
    const next = after.search(/\n## /);
    if (next === -1) {
      body = body.slice(0, match.index);
    } else {
      const rest = after.slice(next).replace(/^\n+/, "");
      body = `${body.slice(0, match.index).trimEnd()}\n\n${rest}`;
    }
  }
  return body.trim();
}

function parseFrontmatter(source: string) {
  const data: Record<string, string> = {};
  const faqs: { q: string; a: string }[] = [];
  let current: { q: string; a: string } | null = null;
  for (const line of source.split("\n")) {
    const question = line.match(/^\s+-\s+q:\s*(.*)$/);
    if (question) {
      current = { q: question[1].trim(), a: "" };
      faqs.push(current);
      continue;
    }
    const answer = line.match(/^\s+a:\s*(.*)$/);
    if (answer && current) {
      current.a = answer[1].trim();
      continue;
    }
    const field = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (field && field[1] !== "faqs") data[field[1]] = field[2].trim();
  }
  return { data, faqs: faqs.filter((faq) => faq.q && faq.a) };
}

export function parseDraftFile(raw: string): DraftArticle | null {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const { data, faqs } = parseFrontmatter(match[1]);
  if (data.status !== "draft" || !data.slug || !data.title || !data.excerpt) return null;
  const body = articleBody(match[2]);
  if (!body) return null;
  return {
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt,
    body,
    categoryId: data.categoryId || "",
    subcategoryId: data.subcategoryId || "",
    coverImage: data.coverImage || "",
    coverAlt: data.coverAlt || "",
    seoTitle: data.seoTitle || "",
    seoDescription: data.seoDescription || "",
    faqs,
    readingMinutes: minutesFromText(`${data.title}\n${data.excerpt}\n${body}`),
    wave: WAVE_ONE.has(data.slug) ? 1 : 2,
  };
}

export function draftsDirectory() {
  return path.join(process.cwd(), "content", "drafts");
}

export function loadDraftArticles(dir = draftsDirectory()): DraftArticle[] {
  if (!fs.existsSync(dir)) return [];
  const articles = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => parseDraftFile(fs.readFileSync(path.join(dir, name), "utf8")))
    .filter((article): article is DraftArticle => Boolean(article));
  return articles.sort((a, b) => {
    const ai = ORDER.indexOf(a.slug);
    const bi = ORDER.indexOf(b.slug);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function draftBySlug(slug: string, articles = loadDraftArticles()) {
  return articles.find((article) => article.slug === slug) || null;
}

/** While a draft is unpublished, links to its future public URL stay inside the preview. */
export function draftHref(href: string, slugs: Iterable<string>) {
  const known = slugs instanceof Set ? slugs : new Set(slugs);
  const match = href.match(/^\/blog\/p\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (match && known.has(match[1])) return `/blog/drafts/${match[1]}`;
  return href;
}
