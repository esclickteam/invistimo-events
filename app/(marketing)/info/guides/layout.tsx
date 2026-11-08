import GuideRelated, { type GuideRelatedCard } from "@/components/blog/GuideRelated";
import { codeArticles } from "@/lib/blog/articles";
import { categoryPath } from "@/lib/blog/taxonomy";

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  const articles: GuideRelatedCard[] = codeArticles().map((article) => ({
    href: article.href,
    title: article.title,
    image: article.image,
    imageAlt: article.imageAlt,
    readingMinutes: article.readingMinutes,
    categoryId: article.categoryId,
    categoryTitle: article.categoryTitle,
    categoryHref: categoryPath(article.categoryId),
    subcategoryId: article.subcategoryId,
    popularRank: article.popularRank,
  }));

  return (
    <>
      {children}
      <GuideRelated articles={articles} />
    </>
  );
}
