import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { connectDB } from "@/lib/db";
import { loadDraftArticles } from "@/lib/blog/drafts";
import { cleanPostInput } from "@/lib/blog/validate";
import BlogPost from "@/models/BlogPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates missing magazine drafts for a signed-in admin.
 * Status is forced to draft. This route never publishes.
 */
export async function POST(req: Request) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId || auth.role !== "admin" || auth.impersonated) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    await connectDB();
    const created: string[] = [];
    const skipped: string[] = [];
    for (const article of loadDraftArticles()) {
      const existing = await BlogPost.findOne({ slug: article.slug }).lean();
      if (existing) {
        skipped.push(article.slug);
        continue;
      }
      const payload = cleanPostInput({ ...article, status: "draft" });
      if (payload.status !== "draft") {
        return NextResponse.json({ ok: false, error: "ייבוא מפרסם אסור" }, { status: 400 });
      }
      await BlogPost.create({ ...payload, status: "draft", publishedAt: undefined });
      created.push(article.slug);
    }
    return NextResponse.json({ ok: true, created, skipped });
  } catch (error) {
    const message = error instanceof Error ? error.message : "הייבוא נכשל";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
