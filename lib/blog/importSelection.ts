import type { DraftArticle } from "@/lib/blog/drafts";

export type DraftImportChoice = {
  selected: DraftArticle[];
  skipped: string[];
  unknown: string[];
};

/** Keep only known prepared drafts. Existing slugs are skipped and never replaced. */
export function chooseDraftsToImport(
  articles: DraftArticle[],
  requested: string[],
  existing: Iterable<string>
): DraftImportChoice {
  const known = new Map(articles.map((article) => [article.slug, article]));
  const present = existing instanceof Set ? existing : new Set(existing);
  const selected: DraftArticle[] = [];
  const skipped: string[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();

  for (const raw of requested) {
    const slug = String(raw || "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const article = known.get(slug);
    if (!article) {
      unknown.push(slug);
      continue;
    }
    if (present.has(slug)) {
      skipped.push(slug);
      continue;
    }
    selected.push(article);
  }

  return { selected, skipped, unknown };
}
