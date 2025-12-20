import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;
  const hostname = nextUrl.hostname;

  /* ========================================================
     0️⃣ חריגה מוחלטת ל־Stripe Webhook
  ======================================================== */
  if (
    pathname.startsWith("/api/stripe/webhook") ||
    hostname.includes("stripe")
  ) {
    return NextResponse.next();
  }

  /* ========================================================
     1️⃣ כפיית WWW – רק לשאר האתר
  ======================================================== */
  if (hostname === "invistimo.com") {
    const url = nextUrl.clone();
    url.hostname = "www.invistimo.com";
    return NextResponse.redirect(url);
  }

  /* ========================================================
     2️⃣ הגנה על /dashboard
     ❗ מאפשרים כניסה אחרי Stripe (session_id)
  ======================================================== */
  const token = cookies.get("authToken")?.value;
  const hasStripeSession = nextUrl.searchParams.has("session_id");

  if (pathname.startsWith("/dashboard") && !token && !hasStripeSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

/* ========================================================
   matcher – תופס הכל
======================================================== */
export const config = {
  matcher: ["/:path*"],
};
