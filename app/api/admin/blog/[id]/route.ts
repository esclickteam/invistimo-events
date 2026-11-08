import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { connectDB } from "@/lib/db";
import { cleanPostInput } from "@/lib/blog/validate";
import BlogPost from "@/models/BlogPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function requireAdmin(req: Request) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId || auth.role !== "admin" || auth.impersonated) return null;
  return auth;
}

export async function GET(req: Request, { params }: Params) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { id } = await params;
  await connectDB();
  const post = await BlogPost.findById(id).lean();
  if (!post) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({
    ok: true,
    post: {
      id: String(post._id),
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      body: post.body,
      categoryId: post.categoryId,
      subcategoryId: post.subcategoryId,
      coverImage: post.coverImage || "",
      coverAlt: post.coverAlt || "",
      seoTitle: post.seoTitle || "",
      seoDescription: post.seoDescription || "",
      featured: Boolean(post.featured),
      popular: Boolean(post.popular),
      status: post.status,
      faqs: post.faqs || [],
    },
  });
}

export async function PATCH(req: Request, { params }: Params) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { id } = await params;
  try {
    const payload = cleanPostInput(await req.json());
    await connectDB();
    const clash = await BlogPost.findOne({ slug: payload.slug, _id: { $ne: id } }).lean();
    if (clash) {
      return NextResponse.json({ ok: false, error: "כבר יש מאמר בכתובת הזו" }, { status: 409 });
    }
    const current = await BlogPost.findById(id);
    if (!current) return NextResponse.json({ ok: false }, { status: 404 });
    const publishedAt =
      payload.status === "published" ? current.publishedAt || payload.publishedAt : current.publishedAt;
    current.set({ ...payload, publishedAt });
    await current.save();
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שמירה נכשלה";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { id } = await params;
  await connectDB();
  await BlogPost.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
