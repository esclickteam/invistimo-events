import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  // ✅ אחידות דומיין: מונע מצב שבלוגין נשמר על www וביציאה לא נמחק (או להפך)
  const cookieDomain =
    process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;

  const baseCookie = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    domain: cookieDomain,
  };

  const delHttpOnly = { ...baseCookie, httpOnly: true, maxAge: 0 };
  const delClient = { ...baseCookie, httpOnly: false, maxAge: 0 };

  // 🔐 auth token (HttpOnly)
  res.cookies.set("authToken", "", delHttpOnly);

  // 👤 role
  res.cookies.set("role", "", delClient);

  // 🧪 trial
  res.cookies.set("isTrial", "", delClient);
  res.cookies.set("trialExpiresAt", "", delClient);

  // ✉️ sms
  res.cookies.set("smsLimit", "", delClient);
  res.cookies.set("smsUsed", "", delClient);

  return res;
}
