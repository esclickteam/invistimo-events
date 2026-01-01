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

  const names = ["authToken", "isTrial", "smsLimit", "smsUsed", "trialExpiresAt", "role"];

  names.forEach((n) => res.cookies.set(n, "", { ...base, httpOnly: true }));

  return res;
}
