import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ========================================================
   HELPERS
======================================================== */
function isTrialExpired(trialExpiresAt?: string) {
  if (!trialExpiresAt) return false;
  return Date.now() > Number(trialExpiresAt);
}

function clearAuthCookies(res: NextResponse) {
  const baseCookie = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  // 🔐 auth
  res.cookies.set("authToken", "", {
    ...baseCookie,
    httpOnly: true,
    maxAge: 0,
  });

  // 👤 role + flags
  res.cookies.set("role", "", {
    ...baseCookie,
    httpOnly: false,
    maxAge: 0,
  });

  res.cookies.set("impersonating", "", {
    ...baseCookie,
    httpOnly: false,
    maxAge: 0,
  });

  res.cookies.set("isTrial", "", {
    ...baseCookie,
    httpOnly: false,
    maxAge: 0,
  });

  res.cookies.set("trialExpiresAt", "", {
    ...baseCookie,
    httpOnly: false,
    maxAge: 0,
  });

  // ✉️ sms
  res.cookies.set("smsUsed", "", {
    ...baseCookie,
    httpOnly: false,
    maxAge: 0,
  });

  res.cookies.set("smsLimit", "", {
    ...baseCookie,
    httpOnly: false,
    maxAge: 0,
  });
}

/* ========================================================
   MIDDLEWARE
======================================================== */
export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;
  const hostname = nextUrl.hostname;

  /* ========================================================
     0️⃣ חריגה מוחלטת ל־API / Login / Register
  ======================================================== */
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return NextResponse.next();
  }

  /* ========================================================
     1️⃣ Stripe Webhook
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
     3️⃣ Auth – מקור אמת
  ======================================================== */
  const token = cookies.get("authToken")?.value;
  const role = cookies.get("role")?.value; // "admin" | "producer" | "user" ...
  const impersonating = cookies.get("impersonating")?.value === "true";
  const hasStripeSession = nextUrl.searchParams.has("session_id");

  /* ========================================================
     🔐 חסימת Dashboard ללא token
     ❗ ניקוי cookies כפוי
  ======================================================== */
  if (pathname.startsWith("/dashboard") && !token && !hasStripeSession) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    clearAuthCookies(res);
    return res;
  }

  /* ========================================================
     🔐 חסימת Producers ללא token
     ❗ ניקוי cookies כפוי
  ======================================================== */
  if (pathname.startsWith("/producers") && !token) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    clearAuthCookies(res);
    return res;
  }

  /* ========================================================
     🔐 חסימת Admin ללא token
  ======================================================== */
  if (pathname.startsWith("/admin") && !token) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    clearAuthCookies(res);
    return res;
  }

  /* ========================================================
     4️⃣ ניתוב Admin אוטומטי
     ❗ רק אם לא בתחזות
  ======================================================== */
  if (
    token &&
    role === "admin" &&
    !impersonating &&
    (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))
  ) {
    const url = nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  /* ========================================================
     4.1️⃣ ✅ ניתוב Producer אוטומטי ל־/producers
     ❗ רק אם לא בתחזות
  ======================================================== */
  if (
    token &&
    role === "producer" &&
    !impersonating &&
    (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))
  ) {
    const url = nextUrl.clone();
    url.pathname = "/producers";
    return NextResponse.redirect(url);
  }

  /* ========================================================
     4.2️⃣ (אופציונלי אבל מומלץ) חסימת כניסה ל־/producers אם לא Producer/Admin
     אם את רוצה שגם אדמין יוכל להיכנס לשם - השארתי גם admin.
  ======================================================== */
  if (
    token &&
    pathname.startsWith("/producers") &&
    role !== "producer" &&
    role !== "admin"
  ) {
    const url = nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
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
     6️⃣ חסימת Messages UI אם נגמרה מכסת SMS
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
   MATCHER
======================================================== */
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/producers/:path*"],
};
