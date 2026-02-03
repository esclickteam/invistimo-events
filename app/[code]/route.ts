import { NextRequest, NextResponse } from "next/server";
import ShortLink from "@/models/ShortLink";
import dbConnect from "@/lib/db";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  await dbConnect();

  const { code } = await context.params;

  const link = await ShortLink.findOne({ code });

  if (!link) {
    return NextResponse.redirect("https://invistimo.com/404");
  }

  return NextResponse.redirect(link.targetUrl);
}
