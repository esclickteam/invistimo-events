import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import PostArticle from "@/components/blog/PostArticle";
import { getBlogFeed } from "@/lib/blog/feed";
import { minutesFromText } from "@/lib/blog/reading";
import { BLOG_HUB_PATH, categoryById, categoryPath, isBlogCategoryId } from "@/lib/blog/taxonomy";
import { connectDB } from "@/lib/db";
import { articleNode, breadcrumbNode, faqNode, graph, organizationNode } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/site";
import BlogPost from "@/models/BlogPost";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) return null;
  try {
    await connectDB();
    return BlogPost.findOne({ slug, status: "published" }).lean();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await load(slug);
  if (!post || !isBlogCategoryId(post.categoryId)) return {};
  return pageMetadata({
    title: post.seoTitle || `${post.title} | Invistimo`,
    description: post.seoDescription || post.excerpt,
    path: `/blog/p/${post.slug}`,
    image: post.coverImage || undefined,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await load(slug);
  if (!post || !isBlogCategoryId(post.categoryId)) notFound();

  const category = categoryById(post.categoryId);
  const path = `/blog/p/${post.slug}`;
  const faqs = ((post.faqs || []) as { q?: string; a?: string }[])
    .map((faq) => ({ q: String(faq?.q || ""), a: String(faq?.a || "") }))
    .filter((faq) => faq.q && faq.a);
  const feed = await getBlogFeed();
  const related = feed
    .filter((article) => article.categoryId === post.categoryId && article.slug !== post.slug)
    .slice(0, 3)
    .map((article) => ({ href: article.href, title: article.title }));

  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          articleNode({
            title: post.title,
            description: post.excerpt,
            path,
          }),
          breadcrumbNode([
            { name: "ראשי", path: "/" },
            { name: "בלוג", path: BLOG_HUB_PATH },
            { name: category.title, path: categoryPath(post.categoryId) },
            { name: post.title, path },
          ]),
          ...(faqs.length ? [faqNode(faqs)] : []),
        ])}
      />
      <PostArticle
        title={post.title}
        excerpt={post.excerpt}
        body={post.body}
        image={post.coverImage || category.image}
        imageAlt={post.title}
        readingMinutes={minutesFromText(`${post.title}\n${post.excerpt}\n${post.body}`)}
        categoryTitle={category.title}
        categoryId={post.categoryId}
        faqs={faqs}
        related={related}
      />
    </>
  );
}
