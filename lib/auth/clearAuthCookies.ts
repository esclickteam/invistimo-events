import type { NextResponse } from "next/server";

export const AUTH_COOKIES_TO_DELETE = [
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

const HTTP_ONLY_COOKIES = new Set<string>([
  "authToken",
  "adminAuthToken",
  "producerAuthToken",
  "producerStaffAuthToken",
  "token",
  "adminToken",
  "impersonationToken",
]);

export const CLIENT_READABLE_AUTH_COOKIES = AUTH_COOKIES_TO_DELETE.filter(
  (name) => !HTTP_ONLY_COOKIES.has(name)
);

function isHttpOnlyCookie(name: string) {
  return HTTP_ONLY_COOKIES.has(name);
}

function getDeleteDomains(): Array<string | undefined> {
  if (process.env.NODE_ENV === "production") {
    // Host-only + shared domain — both must be cleared on Safari/iPad
    return [undefined, ".invistimo.com"];
  }

  return [undefined];
}

/**
 * NextResponse.cookies.set() overwrites by name, so dual-domain deletes
 * never both arrive. Append raw Set-Cookie headers instead (critical for Safari).
 */
function appendSetCookieHeader(
  res: NextResponse,
  name: string,
  value: string,
  options: {
    path?: string;
    domain?: string;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
    expires?: Date;
  }
) {
  // Do not URI-encode — JWTs must stay intact for Safari/iOS cookie round-trips
  if (/[\r\n;]/.test(value)) {
    throw new Error(`Invalid cookie value for ${name}`);
  }

  const parts = [`${name}=${value}`];

  parts.push(`Path=${options.path || "/"}`);

  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");

  const sameSite = options.sameSite || "lax";
  parts.push(`SameSite=${sameSite[0].toUpperCase()}${sameSite.slice(1)}`);

  res.headers.append("Set-Cookie", parts.join("; "));
}

export function appendCookieDeletes(
  res: NextResponse,
  names: readonly string[]
) {
  const secure = process.env.NODE_ENV === "production";
  const expiredAt = new Date(0);

  for (const name of names) {
    const httpOnly = isHttpOnlyCookie(name);

    for (const domain of getDeleteDomains()) {
      appendSetCookieHeader(res, name, "", {
        path: "/",
        sameSite: "lax",
        secure,
        httpOnly,
        maxAge: 0,
        expires: expiredAt,
        ...(domain ? { domain } : {}),
      });
    }
  }
}

/** Lean clear for login — avoids flooding Safari with dozens of Set-Cookie headers */
export const LOGIN_COOKIES_TO_CLEAR = [
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
] as const;

export function appendAuthCookieDeletes(res: NextResponse) {
  appendCookieDeletes(res, AUTH_COOKIES_TO_DELETE);
}

export function setAuthCookie(
  res: NextResponse,
  name: string,
  value: string,
  options: {
    httpOnly: boolean;
    maxAge?: number;
  }
) {
  const isProd = process.env.NODE_ENV === "production";
  const cookieDomain = isProd ? ".invistimo.com" : undefined;

  appendSetCookieHeader(res, name, value, {
    path: "/",
    sameSite: "lax",
    secure: isProd,
    httpOnly: options.httpOnly,
    maxAge: options.maxAge ?? 60 * 60 * 24 * 7,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
}

export function clearClientReadableAuthCookies() {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const expired = "Thu, 01 Jan 1970 00:00:00 GMT";
  const domains = ["", "; domain=.invistimo.com", "; domain=www.invistimo.com"];

  for (const name of CLIENT_READABLE_AUTH_COOKIES) {
    for (const domain of domains) {
      document.cookie = `${name}=; path=/${domain}; expires=${expired}; max-age=0; SameSite=Lax${secure}`;
    }
  }
}
