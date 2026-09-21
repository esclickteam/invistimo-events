export function readLoginTokenFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const token = (body as { token?: unknown }).token;
  if (typeof token !== "string") return null;
  const trimmed = token.trim();
  return trimmed ? trimmed : null;
}

export function nativeAuthHeaders(token: string | null | undefined) {
  if (!token) return {} as Record<string, string>;
  return { Authorization: `Bearer ${token}` };
}
