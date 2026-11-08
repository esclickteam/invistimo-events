import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import CategoryArticles from "@/components/blog/CategoryArticles";
import { articlesForCategory, categoryCounts } from "@/lib/blog/articles";
import { getBlogFeed } from "@/lib/blog/feed";
import {
  BLOG_HUB_PATH,
  categoryById,
  categoryIsIndexable,
  categoryPath,
  isBlogCategoryId,
} from "@/lib/blog/taxonomy";
import { breadcrumbNode, graph, organizationNode } from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props) {
  const { category: id } = await params;
  if (!isBlogCategoryId(id)) return {};
  const category = categoryById(id);
  const feed = await getBlogFeed();
  const count = categoryCounts(feed)[id];
  return pageMetadata({
    title: `${category.title} | המגזין של Invistimo`,
    description: category.intro,
    path: categoryPath(id),
    index: categoryIsIndexable(count),
  });
}

export default async function BlogCategoryPage({ params }: Props) {
  const { category: id } = await params;
  if (!isBlogCategoryId(id)) notFound();
  const category = categoryById(id);
  const feed = await getBlogFeed();
  const articles = articlesForCategory(feed, id);
  const path = categoryPath(id);
  const serviceLinks = category.subcategories.filter((sub) => sub.serviceHref && !articles.some((article) => article.subcategoryId === sub.id));

  return (
    <main dir="rtl" className="bg-[#FBF6EE] text-[#3F3025]">
      <JsonLd
        data={graph([
          organizationNode(),
          {
            "@type": "CollectionPage",
            "@id": `${SITE_URL}${path}#collection`,
            url: absoluteUrl(path),
            name: category.title,
            description: category.intro,
            inLanguage: "he-IL",
            isPartOf: { "@id": `${SITE_URL}${BLOG_HUB_PATH}#blog` },
          },
          breadcrumbNode([
            { name: "ראשי", path: "/" },
            { name: "בלוג", path: BLOG_HUB_PATH },
            { name: category.title, path },
          ]),
        ])}
      />
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:px-8 md:pt-20">
        <p className="text-sm font-semibold text-[#7A6042]">
          <Link href="/" className="hover:text-[#8A642E]">ראשי</Link>
          <span className="px-1.5 text-[#C7A56B]">/</span>
          <Link href={BLOG_HUB_PATH} className="hover:text-[#8A642E]">בלוג</Link>
          <span className="px-1.5 text-[#C7A56B]">/</span>
          {category.title}
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-[#35281F] md:text-5xl">
          {category.title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5C4A3A]">{category.intro}</p>
        {articles.length ? (
          <CategoryArticles category={category} articles={articles} />
        ) : (
          <div className="mt-10 border border-[#E6D2AA] bg-[#FFFDF8] px-6 py-12">
            <h2 className="text-2xl font-black text-[#35281F]">עוד אין כאן מאמר מלא</h2>
            <p className="mt-3 max-w-xl leading-8 text-[#5C4A3A]">
              עד שיעלו מדריכים ייעודיים, אפשר להתחיל בעמודי השירות הקיימים.
            </p>
            <ul className="mt-6 space-y-3">
              {serviceLinks.map((sub) => (
                <li key={sub.id}>
                  <Link href={sub.serviceHref || BLOG_HUB_PATH} className="font-bold text-[#8A642E] hover:text-[#42182F]">
                    {sub.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={BLOG_HUB_PATH}
              className="mt-8 inline-flex min-h-12 items-center bg-[#42182F] px-6 font-black text-[#FFF8F0]"
            >
              לכל המאמרים
            </Link>
          </div>
        )}

        <section className="mt-14 border border-[#42182F] bg-[#42182F] px-6 py-8 text-[#FFF8F0]">
          <h2 className="text-2xl font-black">להמשיך אל השירות עצמו</h2>
          <p className="mt-3 max-w-2xl leading-8 text-[#F6E7D4]">
            המאמרים מסבירים את השיטה. החבילה, אישורי ההגעה וההושבה נסגרים במערכת.
          </p>
          <Link
            href="/pricing"
            className="mt-5 inline-flex min-h-12 items-center bg-[#C9A45C] px-6 font-black text-[#1C1612]"
          >
            לחבילות ומחירים
          </Link>
        </section>
      </section>
    </main>
  );
}
