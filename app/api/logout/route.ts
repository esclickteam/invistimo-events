import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getCookieDomain() {
  return process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;
}

function expireCookie(
  res: NextResponse,
  name: string,
  httpOnly = true
) {
  const domain = getCookieDomain();

  const base = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  // מחיקה עם domain
  res.cookies.set(name, "", {
    ...base,
    ...(domain ? { domain } : {}),
    httpOnly,
  });

  // מחיקה גם בלי domain
  res.cookies.set(name, "", {
    ...base,
    httpOnly,
  });
}

export async function POST() {
  const res = NextResponse.json(
    { success: true },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );

  /* =====================================================
     🧹 ניקוי מלא של כל הקוקיז הרלוונטיים
  ===================================================== */
  expireCookie(res, "authToken", true);
  expireCookie(res, "producerAuthToken", true);
  expireCookie(res, "adminToken", true);
  expireCookie(res, "impersonationToken", true);
  expireCookie(res, "token", true);

  expireCookie(res, "role", false);
  expireCookie(res, "hasPaid", false);

  expireCookie(res, "isTrial", false);
  expireCookie(res, "trialExpiresAt", false);

  expireCookie(res, "smsLimit", false);
  expireCookie(res, "smsUsed", false);

  return res;
}