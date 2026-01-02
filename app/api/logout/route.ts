// /app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  const base = {
    path: "/",
    maxAge: 0,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    domain: "www.invistimo.com",
  };

  // 🔐 cookies שנוצרו כ-httpOnly
  ["authToken", "role"].forEach((n) =>
    res.cookies.set(n, "", { ...base, httpOnly: true })
  );

  // 🌐 cookies שנוצרו כ-NOT httpOnly
  ["isTrial", "smsLimit", "smsUsed", "trialExpiresAt"].forEach((n) =>
    res.cookies.set(n, "", { ...base, httpOnly: false })
  );

  return res;
}
