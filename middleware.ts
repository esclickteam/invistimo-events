import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;

  /* ========================================================
     0️⃣ חריגה מלאה ל־Stripe Webhook
     אסור: redirect, auth, cookies
  ======================================================== */
  if (nextUrl.pathname === "/api/stripe/webhook") {
    return NextResponse.next();
  }

  /* ========================================================
     1️⃣ כפיית WWW – רק לשאר האתר
  ======================================================== */
  if (nextUrl.hostname === "invistimo.com") {
    const url = nextUrl.clone();
    url.hostname = "www.invistimo.com";
    return NextResponse.redirect(url);
  }

  /* ========================================================
     2️⃣ הגנה על /dashboard – משתמש חייב להיות מחובר
  ======================================================== */
  const token = cookies.get("authToken")?.value;

  if (nextUrl.pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

/* ========================================================
   matcher – תופס הכל, החריגה נעשית בקוד עצמו
======================================================== */
export const config = {
  matcher: ["/:path*"],
};
