export function wantsMobileSession(
  req: Request,
  body?: { client?: unknown; mobile?: unknown } | null
) {
  const header = String(req.headers.get("x-invistimo-client") || "").trim().toLowerCase();
  if (header === "native" || header === "mobile") return true;
  if (body?.client === "native" || body?.client === "mobile") return true;
  return body?.mobile === true;
}
