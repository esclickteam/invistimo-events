import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import PostArticle from "@/components/blog/PostArticle";
import { draftBySlug, draftHref, draftsPreviewEnabled, loadDraftArticles } from "@/lib/blog/drafts";
import { categoryById, categoryPath, isBlogCategoryId, BLOG_HUB_PATH } from "@/lib/blog/taxonomy";
import { articleNode, breadcrumbNode, faqNode, graph, organizationNode } from "@/lib/seo/jsonld";
import { NOINDEX } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!draftsPreviewEnabled()) return NOINDEX;
  const { slug } = await params;
  const article = draftBySlug(slug);
  if (!article) return NOINDEX;
  return {
    ...NOINDEX,
    title: { absolute: article.seoTitle || article.title },
    description: article.seoDescription || article.excerpt,
  };
}

export default async function DraftArticlePage({ params }: Props) {
  if (!draftsPreviewEnabled()) notFound();
  const { slug } = await params;
  const articles = loadDraftArticles();
  const article = draftBySlug(slug, articles);
  if (!article || !isBlogCategoryId(article.categoryId)) notFound();
  const category = categoryById(article.categoryId);
  const path = `/blog/drafts/${article.slug}`;
  const slugs = articles.map((item) => item.slug);

  return (
    <>
      <p className="bg-[#42182F] px-4 py-3 text-center text-sm font-bold text-[#FFF8F0]">
        תצוגה מקדימה פנימית. המאמר לא מפורסם ולא נכלל במפת האתר.
      </p>
      <JsonLd
        data={graph([
          organizationNode(),
          articleNode({ title: article.title, description: article.excerpt, path }),
          breadcrumbNode([
            { name: "ראשי", path: "/" },
            { name: "בלוג", path: BLOG_HUB_PATH },
            { name: category.title, path: categoryPath(article.categoryId) },
            { name: article.title, path },
          ]),
          ...(article.faqs.length ? [faqNode(article.faqs)] : []),
        ])}
      />
      <PostArticle
        title={article.title}
        excerpt={article.excerpt}
        body={article.body}
        image={article.coverImage || category.image}
        imageAlt={article.coverAlt || article.title}
        readingMinutes={article.readingMinutes}
        categoryTitle={category.title}
        categoryId={article.categoryId}
        faqs={article.faqs}
        related={[]}
        rewriteHref={(href) => draftHref(href, slugs)}
      />
    </>
  );
}
