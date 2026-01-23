import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json(
    { success: true },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );

  /* =====================================================
     🌐 Domain אחיד – מונע www / non-www באגים
  ===================================================== */
  const cookieDomain =
    process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;

  /* =====================================================
     🍪 Base cookie config
  ===================================================== */
  const baseCookie = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    domain: cookieDomain,
  };

  const delHttpOnly = {
    ...baseCookie,
    httpOnly: true,
    maxAge: 0,
  };

  const delClient = {
    ...baseCookie,
    httpOnly: false,
    maxAge: 0,
  };

  /* =====================================================
     🔐 AUTH TOKENS (הקריטי!)
  ===================================================== */
  res.cookies.set("authToken", "", delHttpOnly);
  res.cookies.set("producerAuthToken", "", delHttpOnly);

  /* =====================================================
     👤 ROLE / STATE
  ===================================================== */
  res.cookies.set("role", "", delClient);

  /* =====================================================
     🧪 TRIAL
  ===================================================== */
  res.cookies.set("isTrial", "", delClient);
  res.cookies.set("trialExpiresAt", "", delClient);

  /* =====================================================
     ✉️ SMS LIMITS
  ===================================================== */
  res.cookies.set("smsLimit", "", delClient);
  res.cookies.set("smsUsed", "", delClient);

  /* =====================================================
     🧹 Future-proof (אם תוסיפי עוד cookies)
  ===================================================== */
  // res.cookies.set("impersonation", "", delClient);
  // res.cookies.set("businessId", "", delClient);

  return res;
}
