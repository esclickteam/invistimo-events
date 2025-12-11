import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;

  // --------------------------------------------------------
  // 1️⃣ כפיית WWW – אם מישהו נכנס ל-invistimo.com → העברה ל-www
  // --------------------------------------------------------
  if (nextUrl.hostname === "invistimo.com") {
    const url = nextUrl.clone();
    url.hostname = "www.invistimo.com";
    return NextResponse.redirect(url);
  }

  // --------------------------------------------------------
  // 2️⃣ הגנה על /dashboard – משתמש חייב להיות מחובר
  // --------------------------------------------------------
  const token = cookies.get("authToken")?.value;

  if (nextUrl.pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/:path*",          // חובה כדי לתפוס גם את הבדיקת WWW
  ],
};
