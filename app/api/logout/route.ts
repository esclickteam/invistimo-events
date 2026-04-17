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
     🔥 רשימת כל הקוקיז למחיקה
  ===================================================== */
  const cookiesToDelete = [
    "authToken",
    "producerAuthToken",
    "adminToken",
    "token",
    "impersonationToken",
    "role",
    "isTrial",
    "trialExpiresAt",
    "smsLimit",
    "smsUsed",
  ];

  /* =====================================================
     🧹 מחיקה כפולה (קריטי!)
  ===================================================== */
  cookiesToDelete.forEach((name) => {
    // httpOnly
    res.cookies.set(name, "", delHttpOnly);

    // client-accessible
    res.cookies.set(name, "", delClient);
  });

  /* =====================================================
     💎 ניקוי אגרסיבי (future-proof)
     מוחק גם קוקיז שלא תכננת
  ===================================================== */
  try {
    const existingCookies = res.cookies.getAll();

    existingCookies.forEach((cookie) => {
      res.cookies.set(cookie.name, "", delHttpOnly);
      res.cookies.set(cookie.name, "", delClient);
    });
  } catch (e) {
    console.log("cookie cleanup fallback", e);
  }

  return res;
}