import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { connectDB } from "@/lib/db";
import { cleanPostInput } from "@/lib/blog/validate";
import BlogPost from "@/models/BlogPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(req: Request) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId || auth.role !== "admin" || auth.impersonated) return null;
  return auth;
}

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await connectDB();
  const posts = await BlogPost.find().sort({ updatedAt: -1 }).lean();
  return NextResponse.json({
    ok: true,
    posts: posts.map((post) => ({
      id: String(post._id),
      title: post.title,
      slug: post.slug,
      status: post.status,
      categoryId: post.categoryId,
      subcategoryId: post.subcategoryId,
      updatedAt: post.updatedAt,
    })),
  });
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const payload = cleanPostInput(await req.json());
    await connectDB();
    const existing = await BlogPost.findOne({ slug: payload.slug }).lean();
    if (existing) {
      return NextResponse.json({ ok: false, error: "כבר יש מאמר בכתובת הזו" }, { status: 409 });
    }
    const created = await BlogPost.create(payload);
    return NextResponse.json({ ok: true, id: String(created._id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שמירה נכשלה";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
