/**
 * Native apps cannot rely on HttpOnly Set-Cookie.
 * The login JWT is the same token stored in the authToken cookie.
 * Cookie values always win over Authorization so the website is unchanged.
 */

export function readBearerToken(
  authorization: string | null | undefined
): string | null {
  const raw = String(authorization || "").trim();
  if (!raw) return null;

  const match = raw.match(/^Bearer\s+(\S+)$/i);
  const token = match?.[1]?.trim() || "";
  if (!token || token === "null" || token === "undefined") return null;
  return token;
}

export function collectAuthTokenCandidates(input: {
  cookieAuthTokens?: Array<string | null | undefined>;
  bearerToken?: string | null;
}): string[] {
  const cookies = (input.cookieAuthTokens || []).filter(
    (value): value is string => Boolean(value && String(value).trim())
  );
  const bearer = input.bearerToken ? [input.bearerToken] : [];
  return [...cookies, ...bearer];
}

export function loginJsonHasToken(body: unknown): body is {
  success: true;
  token: string;
} {
  if (!body || typeof body !== "object") return false;
  const data = body as Record<string, unknown>;
  return data.success === true && typeof data.token === "string" && Boolean(data.token);
}
