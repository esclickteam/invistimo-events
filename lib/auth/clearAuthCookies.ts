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
    return [undefined, ".invistimo.com"];
  }

  return [undefined];
}

export function appendAuthCookieDeletes(res: NextResponse) {
  const secure = process.env.NODE_ENV === "production";
  const expiredAt = new Date(0);

  for (const name of AUTH_COOKIES_TO_DELETE) {
    const httpOnly = isHttpOnlyCookie(name);

    for (const domain of getDeleteDomains()) {
      res.cookies.set(name, "", {
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
