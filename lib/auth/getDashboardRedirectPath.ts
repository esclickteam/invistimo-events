import { decodeJwt } from "jose";

type JwtPayloadShape = {
  role?: string;
  impersonationRole?: string;
  exp?: number;
};

export type AuthCookieSnapshot = {
  authToken?: string | null;
  producerAuthToken?: string | null;
  adminAuthToken?: string | null;
  role?: string | null;
  impersonationRole?: string | null;
  originalTargetRole?: string | null;
};

export function getDashboardPathFromRole(role: string): string {
  const normalized = String(role || "").toLowerCase().trim();

  if (normalized === "admin") return "/admin";
  if (normalized === "venue_owner") return "/venues/dashboard";
  if (normalized === "producer") return "/producer/dashboard";
  if (normalized === "producer_staff" || normalized === "staff_producer") {
    return "/producer-staff/dashboard";
  }
  if (normalized === "system_staff" || normalized === "staff") {
    return "/staff/dashboard";
  }

  return "/dashboard";
}

function readJwtPayload(token: string): JwtPayloadShape | null {
  try {
    return decodeJwt(token) as JwtPayloadShape;
  } catch {
    return null;
  }
}

function isTokenExpired(payload: JwtPayloadShape): boolean {
  if (!payload.exp) return false;
  return payload.exp * 1000 <= Date.now();
}

function resolveRoleFromCookies(cookies: AuthCookieSnapshot): string | null {
  const fromCookies =
    cookies.originalTargetRole ||
    cookies.impersonationRole ||
    cookies.role;

  return fromCookies ? String(fromCookies) : null;
}

export function getDashboardPathFromAuthCookies(
  cookies: AuthCookieSnapshot
): string | null {
  const token =
    cookies.authToken ||
    cookies.producerAuthToken ||
    cookies.adminAuthToken ||
    null;

  if (token) {
    const payload = readJwtPayload(token);

    if (payload && !isTokenExpired(payload)) {
      const role = payload.impersonationRole || payload.role;
      if (role) {
        return getDashboardPathFromRole(String(role));
      }
    }
  }

  const role = resolveRoleFromCookies(cookies);
  if (role) {
    return getDashboardPathFromRole(role);
  }

  return null;
}
