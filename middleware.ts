import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ========================================================
   HELPERS
======================================================== */
function isTrialExpired(trialExpiresAt?: string) {
  if (!trialExpiresAt) return false;
  return Date.now() > Number(trialExpiresAt);
}

/* ========================================================
   MIDDLEWARE
======================================================== */
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
     3️⃣ Auth בסיסי – מקור האמת
  ======================================================== */
  const token = cookies.get("authToken")?.value;
  const role = cookies.get("role")?.value;
  const hasStripeSession = nextUrl.searchParams.has("session_id");

  /* 🔐 חסימת dashboard ללא token */
  if (pathname.startsWith("/dashboard") && !token && !hasStripeSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  /* 🔐 חסימת admin ללא token */
  if (pathname.startsWith("/admin") && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  /* ========================================================
     4️⃣ ניתוב אדמין – רק אם יש token
     ❗ אין role בלי authToken
  ======================================================== */
  if (
    token &&
    (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))
  ) {
    if (role === "admin") {
      const url = nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  /* ========================================================
     5️⃣ Trial checks – Dashboard בלבד
  ======================================================== */
  const isTrial = cookies.get("isTrial")?.value === "true";
  const trialExpiresAt = cookies.get("trialExpiresAt")?.value;

  if (pathname.startsWith("/dashboard") && token && isTrial) {
    if (isTrialExpired(trialExpiresAt)) {
      const url = nextUrl.clone();
      url.pathname = "/dashboard/upgrade";
      url.searchParams.set("reason", "trial_expired");
      return NextResponse.redirect(url);
    }
  }

  /* ========================================================
     6️⃣ חסימת UI של הודעות אם נגמרה מכסת SMS
     (האכיפה האמיתית ב־API)
  ======================================================== */
  if (pathname.startsWith("/dashboard/messages") && token) {
    const smsUsed = Number(cookies.get("smsUsed")?.value ?? 0);
    const smsLimit = Number(cookies.get("smsLimit")?.value ?? 0);

    if (smsLimit > 0 && smsUsed >= smsLimit) {
      const url = nextUrl.clone();
      url.pathname = "/dashboard/upgrade";
      url.searchParams.set("reason", "sms_limit");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

/* ========================================================
   matcher – dashboard + admin
======================================================== */
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
