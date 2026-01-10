// /app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json(
    { success: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );

  /* =====================================================
     🔑 בסיס cookie – חייב להיות זהה ל-login
  ===================================================== */
  const baseCookie = {
    path: "/",
    domain: "www.invistimo.com",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0, // 🔥 קריטי למחיקה
  };

  /* =====================================================
     🔐 Cookies httpOnly
  ===================================================== */
  res.cookies.set("authToken", "", {
    ...baseCookie,
    httpOnly: true,
  });

  // אם יצרת בעבר cookie של role (לא חובה, אבל לניקוי מלא)
  res.cookies.set("role", "", {
    ...baseCookie,
    httpOnly: true,
  });

  /* =====================================================
     🌐 Cookies לא httpOnly
  ===================================================== */
  res.cookies.set("isTrial", "", {
    ...baseCookie,
    httpOnly: false,
  });

  res.cookies.set("smsLimit", "", {
    ...baseCookie,
    httpOnly: false,
  });

  res.cookies.set("smsUsed", "", {
    ...baseCookie,
    httpOnly: false,
  });

  res.cookies.set("trialExpiresAt", "", {
    ...baseCookie,
    httpOnly: false,
  });

  return res;
}
