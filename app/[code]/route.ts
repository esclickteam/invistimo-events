import { NextResponse } from "next/server";
import ShortLink from "@/models/ShortLink";
import dbConnect from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  await dbConnect();

  const link = await ShortLink.findOne({ code: params.code });
  if (!link) {
    return NextResponse.redirect("https://invistimo.com/404");
  }

  return NextResponse.redirect(link.targetUrl);
}
