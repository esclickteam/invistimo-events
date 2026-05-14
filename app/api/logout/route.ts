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

  const cookieDomain =
    process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;

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
    expires: new Date(0),
  };

  const delClient = {
    ...baseCookie,
    httpOnly: false,
    maxAge: 0,
    expires: new Date(0),
  };

  const cookiesToDelete = [
    "authToken",
    "adminAuthToken",
    "producerAuthToken",
    "adminToken",
    "token",
    "impersonationToken",
    "role",
    "hasPaid",
    "isTrial",
    "trialExpiresAt",
    "smsLimit",
    "smsUsed",
  ];

  cookiesToDelete.forEach((name) => {
    res.cookies.set(name, "", delHttpOnly);
    res.cookies.set(name, "", delClient);
  });

  return res;
}