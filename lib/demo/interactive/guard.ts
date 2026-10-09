const DEMO_SURFACE = "demo";

export function shouldBlockProductionApi(input: {
  pathname: string;
  method?: string;
  surface?: string | null;
  referer?: string | null;
}) {
  const pathname = input.pathname || "";
  if (!pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/api/demo/")) return false;
  if (pathname === "/api/me" || pathname.startsWith("/api/auth/")) return false;

  const surface = String(input.surface || "").toLowerCase();
  if (surface === DEMO_SURFACE) return true;

  const referer = String(input.referer || "");
  if (!referer) return false;
  try {
    const url = new URL(referer);
    return url.pathname === "/try" || url.pathname.startsWith("/try/");
  } catch {
    return referer.includes("/try/") || referer.endsWith("/try");
  }
}

export const DEMO_BLOCK_BODY = {
  success: false,
  ok: false,
  code: "DEMO_ISOLATED",
  message: "הדמו מבודד מנתוני לקוחות. הפעולה לא יצאה אל המערכת האמיתית.",
};
