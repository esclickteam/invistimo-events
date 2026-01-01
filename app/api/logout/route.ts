// /app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  /* =====================================================
     אפשרויות בסיס
  ===================================================== */
  const baseOptions = {
    path: "/",
    maxAge: 0,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  /* =====================================================
     1️⃣ מחיקה ללא domain
  ===================================================== */
  ["authToken", "isTrial", "smsLimit", "smsUsed", "trialExpiresAt"].forEach(
    (name) => {
      res.cookies.set(name, "", { ...baseOptions, httpOnly: true });
    }
  );
  res.cookies.set("role", "", baseOptions);

  /* =====================================================
     2️⃣ מחיקה עם domain = www.invistimo.com
  ===================================================== */
  const wwwOptions = { ...baseOptions, domain: "www.invistimo.com", httpOnly: true };
  ["authToken", "isTrial", "smsLimit", "smsUsed", "trialExpiresAt"].forEach(
    (name) => {
      res.cookies.set(name, "", wwwOptions);
    }
  );
  res.cookies.set("role", "", { ...baseOptions, domain: "www.invistimo.com" });

  /* =====================================================
     3️⃣ מחיקה עם domain = .invistimo.com
  ===================================================== */
  const dotOptions = { ...baseOptions, domain: ".invistimo.com", httpOnly: true };
  ["authToken", "isTrial", "smsLimit", "smsUsed", "trialExpiresAt"].forEach(
    (name) => {
      res.cookies.set(name, "", dotOptions);
    }
  );
  res.cookies.set("role", "", { ...baseOptions, domain: ".invistimo.com" });

  return res;
}
