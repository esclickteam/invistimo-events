import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  /* =====================================================
     אפשרויות בסיס משותפות
  ===================================================== */
  const baseOptions = {
    path: "/",
    maxAge: 0,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  /* =====================================================
     1️⃣ מחיקה עם domain = www.invistimo.com
  ===================================================== */
  const wwwOptions = {
    ...baseOptions,
    httpOnly: true,
    domain: "www.invistimo.com",
  };

  res.cookies.set("authToken", "", wwwOptions);
  res.cookies.set("isTrial", "", wwwOptions);
  res.cookies.set("smsLimit", "", wwwOptions);
  res.cookies.set("smsUsed", "", wwwOptions);
  res.cookies.set("trialExpiresAt", "", wwwOptions);

  /* =====================================================
     2️⃣ מחיקה עם domain = .invistimo.com
  ===================================================== */
  const dotOptions = {
    ...baseOptions,
    httpOnly: true,
    domain: ".invistimo.com",
  };

  res.cookies.set("authToken", "", dotOptions);
  res.cookies.set("isTrial", "", dotOptions);
  res.cookies.set("smsLimit", "", dotOptions);
  res.cookies.set("smsUsed", "", dotOptions);
  res.cookies.set("trialExpiresAt", "", dotOptions);

  /* =====================================================
     3️⃣ cookie role (לא httpOnly)
  ===================================================== */
  res.cookies.set("role", "", {
    path: "/",
    domain: "www.invistimo.com",
    maxAge: 0,
  });

  res.cookies.set("role", "", {
    path: "/",
    domain: ".invistimo.com",
    maxAge: 0,
  });

  return res;
}
