import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;
  const hostname = nextUrl.hostname;

  /* ========================================================
     0️⃣ חריגה מוחלטת ל־API ול־Auth
  ======================================================== */
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return NextResponse.next();
  }

  /* ========================================================
     1️⃣ חריגה ל־Stripe Webhook
  ======================================================== */
  if (
    pathname.startsWith("/api/stripe/webhook") ||
    hostname.includes("stripe")
  ) {
    return NextResponse.next();
  }

  /* ========================================================
     2️⃣ כפיית WWW
  ======================================================== */
  if (hostname === "invistimo.com") {
    const url = nextUrl.clone();
    url.hostname = "www.invistimo.com";
    return NextResponse.redirect(url);
  }

  /* ========================================================
     3️⃣ הגנה על dashboard
  ======================================================== */
  const token = cookies.get("authToken")?.value;
  const hasStripeSession = nextUrl.searchParams.has("session_id");

  if (pathname.startsWith("/dashboard") && !token && !hasStripeSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

/* ========================================================
   matcher – רק מה שצריך
======================================================== */
export const config = {
  matcher: ["/dashboard/:path*"],
};
