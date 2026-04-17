import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getCookieStore() {
  const store = cookies();
  return store instanceof Promise ? await store : store;
}

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
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
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
  const cookieStore = await getCookieStore();

  const adminToken = cookieStore.get("adminToken")?.value;

  if (!adminToken) {
    return NextResponse.json(
      { success: false, error: "No admin token" },
      { status: 400 }
    );
  }

  const res = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  const domain = getCookieDomain();

  const baseCookie = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    ...(domain ? { domain } : {}),
  };

  // קודם מנקים את כל קוקיות ההתחזות/מצב קודם
  expireCookie(res, "authToken", true);
  expireCookie(res, "token", true);
  expireCookie(res, "impersonationToken", true);
  expireCookie(res, "hasPaid", false);

  // משחזרים מצב אדמין
  res.cookies.set("authToken", adminToken, {
    ...baseCookie,
  });

  res.cookies.set("token", adminToken, {
    ...baseCookie,
  });

  res.cookies.set("hasPaid", "true", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(domain ? { domain } : {}),
  });

  // ורק בסוף מוחקים את adminToken
  expireCookie(res, "adminToken", true);

  return res;
}