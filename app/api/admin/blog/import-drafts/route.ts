import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { connectDB } from "@/lib/db";
import { loadDraftArticles } from "@/lib/blog/drafts";
import { chooseDraftsToImport } from "@/lib/blog/importSelection";
import { categoryById, isBlogCategoryId } from "@/lib/blog/taxonomy";
import { cleanPostInput } from "@/lib/blog/validate";
import BlogPost from "@/models/BlogPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(req: Request) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId || auth.role !== "admin" || auth.impersonated) return null;
  return auth;
}

function catalogItem(article: ReturnType<typeof loadDraftArticles>[number], existing: boolean) {
  const category = isBlogCategoryId(article.categoryId) ? categoryById(article.categoryId).title : article.categoryId;
  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    categoryId: article.categoryId,
    category,
    coverImage: article.coverImage,
    readingMinutes: article.readingMinutes,
    faqCount: article.faqs.length,
    seoTitle: article.seoTitle,
    existing,
  };
}

/** Lists the prepared drafts for an admin. Nothing is written. */
export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await connectDB();
  const articles = loadDraftArticles();
  const found = await BlogPost.find({ slug: { $in: articles.map((article) => article.slug) } })
    .select("slug")
    .lean();
  const existing = new Set(found.map((post) => String(post.slug)));
  return NextResponse.json({
    ok: true,
    drafts: articles.map((article) => catalogItem(article, existing.has(article.slug))),
  });
}

/**
 * Creates the selected prepared drafts.
 * Status is forced to draft. Existing slugs are skipped and never replaced.
 */
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let slugs: string[] = [];
  try {
    const body = await req.json();
    slugs = Array.isArray(body?.slugs) ? body.slugs.map((slug: unknown) => String(slug)) : [];
  } catch {
    return NextResponse.json({ ok: false, error: "בחירה לא תקינה" }, { status: 400 });
  }
  if (!slugs.length) {
    return NextResponse.json({ ok: false, error: "לא נבחרו מאמרים" }, { status: 400 });
  }

  try {
    await connectDB();
    const articles = loadDraftArticles();
    const found = await BlogPost.find({ slug: { $in: articles.map((article) => article.slug) } })
      .select("slug")
      .lean();
    const choice = chooseDraftsToImport(
      articles,
      slugs,
      found.map((post) => String(post.slug))
    );
    if (choice.unknown.length) {
      return NextResponse.json({ ok: false, error: "נבחר מאמר שאינו ברשימת הטיוטות" }, { status: 400 });
    }

    const created: string[] = [];
    for (const article of choice.selected) {
      const again = await BlogPost.findOne({ slug: article.slug }).select("_id").lean();
      if (again) {
        choice.skipped.push(article.slug);
        continue;
      }
      const payload = cleanPostInput({ ...article, status: "draft" });
      if (payload.status !== "draft") {
        return NextResponse.json({ ok: false, error: "ייבוא מפרסם אסור" }, { status: 400 });
      }
      await BlogPost.create({ ...payload, status: "draft", publishedAt: undefined });
      created.push(article.slug);
    }
    return NextResponse.json({ ok: true, created, skipped: choice.skipped });
  } catch (error) {
    const message = error instanceof Error ? error.message : "הייבוא נכשל";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
