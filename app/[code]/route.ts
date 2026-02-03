import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ShortLink from "@/models/ShortLink";

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  await dbConnect();

  const { code } = params;

  const link = await ShortLink.findOne({ code }).lean();

  if (!link || !link.originalUrl) {
    return NextResponse.redirect(
      "https://www.invistimo.com",
      { status: 302 }
    );
  }

  return NextResponse.redirect(link.originalUrl, { status: 302 });
}
