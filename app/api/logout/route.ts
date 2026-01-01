import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  const commonOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    domain: ".invistimo.com",
    maxAge: 0,
  };

  /* =====================================================
     מחיקת auth
  ===================================================== */
  res.cookies.set("authToken", "", commonOptions);

  /* =====================================================
     מחיקת cookies נלווים (חשוב!)
  ===================================================== */
  res.cookies.set("isTrial", "", commonOptions);
  res.cookies.set("smsLimit", "", commonOptions);
  res.cookies.set("smsUsed", "", commonOptions);
  res.cookies.set("trialExpiresAt", "", commonOptions);

  /* =====================================================
     אם הוספת cookie של role (לא httpOnly)
  ===================================================== */
  res.cookies.set("role", "", {
    path: "/",
    domain: ".invistimo.com",
    maxAge: 0,
  });

  return res;
}
