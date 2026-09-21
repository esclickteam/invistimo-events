export function accessTokenExpiresAt(token: string | null | undefined) {
  if (!token) return 0;
  const parts = token.split(".");
  if (parts.length < 2) return 0;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as { exp?: number };
    return Number(payload.exp || 0) * 1000;
  } catch {
    return 0;
  }
}

export function accessTokenNeedsRefresh(token: string | null | undefined) {
  const exp = accessTokenExpiresAt(token);
  if (!exp) return true;
  return exp - Date.now() < 60 * 60 * 1000;
}
