import { NextResponse } from "next/server";

const AUTH_COOKIES_TO_DELETE = [
  "authToken",
  "adminAuthToken",
  "producerAuthToken",
  "producerStaffAuthToken",
  "adminToken",
  "token",
  "impersonationToken",
  "role",
  "hasPaid",
  "isTrial",
  "trialExpiresAt",
  "smsLimit",
  "smsUsed",
  "impersonationRole",
  "originalTargetRole",
  "impersonationSourceRole",
  "impersonatedByAdmin",
  "staffType",
  "staffImpersonationActive",
  "staffOriginalUserId",
  "staffOriginalType",
  "staffOriginalScope",
] as const;

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

  const deleteWithDomain = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    ...(cookieDomain ? { domain: cookieDomain } : {}),
    maxAge: 0,
    expires: new Date(0),
  };

  const deleteWithoutDomain = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    expires: new Date(0),
  };

  for (const name of AUTH_COOKIES_TO_DELETE) {
    const isHttpOnly =
      name === "authToken" ||
      name === "adminAuthToken" ||
      name === "producerAuthToken" ||
      name === "producerStaffAuthToken" ||
      name === "token" ||
      name === "adminToken" ||
      name === "impersonationToken";

    res.cookies.set(name, "", {
      ...deleteWithDomain,
      httpOnly: isHttpOnly,
    });

    res.cookies.set(name, "", {
      ...deleteWithoutDomain,
      httpOnly: isHttpOnly,
    });
  }

  return res;
}
