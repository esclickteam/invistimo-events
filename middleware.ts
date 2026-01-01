import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

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
export async function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;
  const hostname = nextUrl.hostname;

  /* ========================================================
     ❗ מניעת הפניות לא רצויות (HEAD / prefetch)
  ======================================================== */
  if (req.method === "HEAD") {
    return NextResponse.next();
  }

  /* ========================================================
     0️⃣ חריגות מוחלטות (API / Auth / Assets)
  ======================================================== */
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/_next")
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
     3️⃣ Auth Token (משותף ל־dashboard + admin)
  ======================================================== */
  const token = cookies.get("authToken")?.value;
  const hasStripeSession = nextUrl.searchParams.has("session_id");

  /* ========================================================
     4️⃣ הגנה על /admin (Admin only)
     ⚠️ חייב לבוא לפני /dashboard
  ======================================================== */
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET as string
      );

      const { payload } = await jwtVerify(token, secret);

      // תומך בשני מבנים אפשריים של JWT
      const userRole =
        (payload as any)?.role || (payload as any)?.user?.role;

      if (userRole !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } catch (error) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  /* ========================================================
     5️⃣ הגנה על /dashboard (Auth)
  ======================================================== */
  if (pathname.startsWith("/dashboard") && !token && !hasStripeSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  /* ========================================================
     6️⃣ Trial checks (Dashboard בלבד)
  ======================================================== */
  const isTrial = cookies.get("isTrial")?.value === "true";
  const trialExpiresAt = cookies.get("trialExpiresAt")?.value;

  if (pathname.startsWith("/dashboard") && isTrial) {
    if (isTrialExpired(trialExpiresAt)) {
      const url = nextUrl.clone();
      url.pathname = "/dashboard/upgrade";
      url.searchParams.set("reason", "trial_expired");
      return NextResponse.redirect(url);
    }
  }

  /* ========================================================
     7️⃣ חסימת UI של הודעות אם נגמרה מכסת SMS
     (האכיפה האמיתית מתבצעת ב־API)
  ======================================================== */
  if (pathname.startsWith("/dashboard/messages")) {
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
