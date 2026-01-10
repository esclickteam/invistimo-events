import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  const baseCookie = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  // 🔐 auth token (HttpOnly)
  res.cookies.set("authToken", "", {
    ...baseCookie,
    httpOnly: true,
    maxAge: 0,
  });

  // 👤 role
  res.cookies.set("role", "", {
    ...baseCookie,
    httpOnly: false,
    maxAge: 0,
  });

  // 🧪 trial
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
  res.cookies.set("smsLimit", "", {
    ...baseCookie,
    httpOnly: false,
    maxAge: 0,
  });

  res.cookies.set("smsUsed", "", {
    ...baseCookie,
    httpOnly: false,
    maxAge: 0,
  });

  return res;
}
