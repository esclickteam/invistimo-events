import { connectDB } from "@/lib/db";
import BlogPost from "@/models/BlogPost";
import { minutesFromText } from "@/lib/blog/reading";
import {
  categoryById,
  categoryIsIndexable,
  categoryPath,
  isBlogCategoryId,
  subcategoryById,
  type BlogCategoryId,
} from "@/lib/blog/taxonomy";
import { categoryCounts, codeArticles, type BlogArticle } from "@/lib/blog/articles";

function mongoConfigured() {
  return Boolean(String(process.env.MONGO_URI || process.env.MONGODB_URI || "").trim());
}

function postToArticle(post: {
  _id: { toString(): string };
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  categoryId: BlogCategoryId;
  subcategoryId: string;
  coverImage?: string;
  featured?: boolean;
  popular?: boolean;
  updatedAt?: Date;
  publishedAt?: Date;
}): BlogArticle {
  const category = categoryById(post.categoryId);
  const subcategory = subcategoryById(post.categoryId, post.subcategoryId);
  const modified = (post.updatedAt || post.publishedAt || new Date()).toISOString().slice(0, 10);
  return {
    id: `post:${post._id.toString()}`,
    slug: post.slug,
    href: `/blog/p/${post.slug}`,
    title: post.title,
    description: post.excerpt,
    categoryId: post.categoryId,
    subcategoryId: post.subcategoryId,
    categoryTitle: category.title,
    subcategoryTitle: subcategory?.title || "",
    image: post.coverImage || category.image,
    imageAlt: post.title,
    readingMinutes: minutesFromText(`${post.title}\n${post.excerpt}\n${post.body}`),
    modified,
    popularRank: post.popular ? 3 : 60,
    featured: Boolean(post.featured),
    hero: false,
    searchText: `${post.title}\n${post.excerpt}\n${post.body}`.slice(0, 1800),
    source: "post",
  };
}

export async function listPublishedPosts() {
  if (!mongoConfigured()) return [];
  try {
    await connectDB();
    const posts = await BlogPost.find({ status: "published" }).sort({ publishedAt: -1 }).lean();
    return posts;
  } catch (error) {
    console.error("[blog] published posts unavailable", error);
    return [];
  }
}

export async function getBlogFeed(): Promise<BlogArticle[]> {
  const guides = codeArticles();
  const posts = await listPublishedPosts();
  const extras = posts
    .filter((post) => isBlogCategoryId(post.categoryId))
    .map((post) => postToArticle(post as Parameters<typeof postToArticle>[0]));
  return [...guides, ...extras];
}

export async function indexableBlogCategoryPaths() {
  const feed = await getBlogFeed();
  const counts = categoryCounts(feed);
  return Object.entries(counts)
    .filter(([, count]) => categoryIsIndexable(count))
    .map(([id]) => categoryPath(id as BlogCategoryId));
}
