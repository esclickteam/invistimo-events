import JsonLd from "@/components/seo/JsonLd";
import BlogMagazine from "@/components/blog/BlogMagazine";
import { getBlogFeed } from "@/lib/blog/feed";
import { BLOG_CATEGORIES, BLOG_HUB_PATH } from "@/lib/blog/taxonomy";
import { breadcrumbNode, graph, organizationNode } from "@/lib/seo/jsonld";
import { pageMetadata, SITE_URL } from "@/lib/seo/site";

const TITLE = "המגזין של Invistimo | אירועים, חתונות ואישורי הגעה";
const DESCRIPTION =
  "המגזין של Invistimo: מדריכים לתכנון אירוע, אישורי הגעה, הזמנות דיגיטליות, סידורי הושבה וניהול אורחים בישראל.";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: BLOG_HUB_PATH,
});

export default async function BlogPage() {
  const articles = await getBlogFeed();

  return (
    <main>
      <JsonLd
        data={graph([
          organizationNode(),
          {
            "@type": "Blog",
            "@id": `${SITE_URL}${BLOG_HUB_PATH}#blog`,
            url: `${SITE_URL}${BLOG_HUB_PATH}`,
            name: "המגזין של Invistimo",
            description: DESCRIPTION,
            inLanguage: "he-IL",
            publisher: { "@id": `${SITE_URL}/#organization` },
          },
          breadcrumbNode([
            { name: "ראשי", path: "/" },
            { name: "בלוג", path: BLOG_HUB_PATH },
          ]),
        ])}
      />
      <BlogMagazine articles={articles} categories={BLOG_CATEGORIES} />
    </main>
  );
}
