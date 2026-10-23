import { notFound } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ShortLink from "@/models/ShortLink";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

/**
 * One-segment short links for guests. A known ShortLink still redirects 302
 * to its saved target. An unknown code returns 404, so missing URLs are not
 * sent to the homepage. Real pages and robots.txt/sitemap.xml are matched
 * by their own files before this route. New marketing URLs stay on two or
 * more segments so they cannot replace a short code.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  await dbConnect();

  const { code } = await params;
  const link = await ShortLink.findOne({ code }).lean();

  if (!link || !link.targetUrl) {
    notFound();
  }

  return NextResponse.redirect(link.targetUrl, {
    status: 302,
  });
}
