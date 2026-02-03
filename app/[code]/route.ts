import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ShortLink from "@/models/ShortLink";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  await dbConnect();

  const { code } = await params;

  const link = await ShortLink.findOne({ code }).lean();

  // ❌ אם לא נמצא או אין יעד
  if (!link || !link.targetUrl) {
    return NextResponse.redirect("https://www.invistimo.com", {
      status: 302,
    });
  }

  // ✅ הפניה ליעד האמיתי
  return NextResponse.redirect(link.targetUrl, {
    status: 302,
  });
}
