import { notFound } from "next/navigation";
import PostArticle from "@/components/blog/PostArticle";
import { minutesFromText } from "@/lib/blog/reading";
import { categoryById, isBlogCategoryId } from "@/lib/blog/taxonomy";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { connectDB } from "@/lib/db";
import { NOINDEX } from "@/lib/seo/site";
import BlogPost from "@/models/BlogPost";

export const dynamic = "force-dynamic";
export const metadata = NOINDEX;

type Props = { params: Promise<{ id: string }> };

export default async function BlogPreviewPage({ params }: Props) {
  const auth = await getUserIdFromRequest();
  if (!auth?.userId || auth.role !== "admin") notFound();
  const { id } = await params;
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) notFound();

  try {
    await connectDB();
  } catch {
    notFound();
  }

  const post = await BlogPost.findById(id).lean();
  if (!post || !isBlogCategoryId(post.categoryId)) notFound();
  const category = categoryById(post.categoryId);

  return (
    <PostArticle
      title={post.title}
      excerpt={post.excerpt}
      body={post.body}
      image={post.coverImage || category.image}
      imageAlt={post.title}
      readingMinutes={minutesFromText(`${post.title}\n${post.excerpt}\n${post.body}`)}
      categoryTitle={category.title}
      categoryId={post.categoryId}
      faqs={(post.faqs || [])
        .map((faq: { q?: string; a?: string }) => ({ q: String(faq?.q || ""), a: String(faq?.a || "") }))
        .filter((faq) => faq.q && faq.a)}
      related={[]}
    />
  );
}
